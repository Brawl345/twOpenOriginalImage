#!/usr/bin/env tsx

import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

type Browser = 'chrome' | 'firefox';
type Channel = 'github' | 'store' | 'local';

interface PackageJson {
  name: string;
  version: string;
  repository?: { url?: string };
  release?: { channel?: Channel; browsers?: Browser[] };
}

interface Config {
  name: string;
  version: string;
  channel: Channel;
  browsers: Browser[];
  repo?: string;
  dryRun: boolean;
}

const CHANNELS: Channel[] = ['github', 'store', 'local'];
const CHROME_BIN =
  process.env.CHROME_BIN ??
  '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary';
const OUTPUT_DIR = resolve('output');
const BUILD_DIR = resolve('.output');
const PEM = resolve('public.pem');
const TRACKED = [
  'package.json',
  'package-lock.json',
  'CHANGES.md',
  'updates.json',
  'updates.xml',
];

function fail(message: string): never {
  console.error(`❌ ${message}`);
  process.exit(1);
}

function step(message: string): void {
  console.log(`\n▶ ${message}`);
}

function run(cmd: string, args: string[], input?: string): void {
  const result = spawnSync(cmd, args, {
    input,
    stdio: [input === undefined ? 'inherit' : 'pipe', 'inherit', 'inherit'],
  });
  if (result.error) fail(`${cmd}: ${result.error.message}`);
  if (result.status !== 0) fail(`${cmd} ${args.join(' ')} failed`);
}

function succeeds(cmd: string, args: string[]): boolean {
  return spawnSync(cmd, args, { stdio: 'ignore' }).status === 0;
}

function capture(cmd: string, args: string[]): string {
  return execFileSync(cmd, args, { encoding: 'utf-8' }).trim();
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf-8')) as T;
}

function githubUrl(url: string | undefined): string {
  if (!url) fail('repository.url is missing in package.json');
  const match = url.match(/github\.com[/:]([^/]+\/[^/]+?)(?:\.git)?\/?$/);
  if (!match) fail(`repository.url is not a GitHub URL: ${url}`);
  return `https://github.com/${match[1]}`;
}

function isNewer(next: string, current: string): boolean {
  const a = next.split('.').map(Number);
  const b = current.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) > (b[i] ?? 0);
  }
  return false;
}

function readConfig(): Config {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const version = args.find((arg) => !arg.startsWith('--'));
  if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
    fail('Usage: npm run release -- [--dry-run] <version>  (e.g. 1.2.0)');
  }

  const pkg = readJson<PackageJson>('package.json');
  const channel = pkg.release?.channel ?? 'local';
  const browsers = pkg.release?.browsers ?? ['chrome', 'firefox'];
  if (!CHANNELS.includes(channel)) {
    fail(`release.channel must be one of ${CHANNELS.join(', ')}`);
  }
  if (browsers.length === 0) fail('release.browsers is empty');
  if (!isNewer(version, pkg.version)) {
    fail(`${version} is not newer than ${pkg.version}`);
  }

  return {
    name: pkg.name,
    version,
    channel,
    browsers,
    repo: channel === 'local' ? undefined : githubUrl(pkg.repository?.url),
    dryRun,
  };
}

function preflight(config: Config): void {
  step('Preflight');
  const dirty = capture('git', [
    'status',
    '--porcelain',
    '--untracked-files=no',
  ])
    .split('\n')
    .filter((line) => line && line.slice(3) !== 'CHANGES.md');
  if (dirty.length > 0 && !config.dryRun) {
    fail(`Uncommitted changes besides CHANGES.md:\n${dirty.join('\n')}`);
  }
  if (
    succeeds('git', [
      'rev-parse',
      '-q',
      '--verify',
      `refs/tags/${config.version}`,
    ])
  ) {
    fail(`Tag ${config.version} already exists`);
  }
  if (config.channel !== 'local' && !config.dryRun) {
    if (!succeeds('git', ['rev-parse', '--abbrev-ref', '@{upstream}'])) {
      fail('The current branch has no upstream to push to');
    }
    if (!succeeds('gh', ['auth', 'status'])) fail('gh is not logged in');
  }
  if (config.channel === 'github' && config.browsers.includes('chrome')) {
    if (!existsSync(PEM)) {
      fail(
        'public.pem not found. Never regenerate it: the extension ID would change.',
      );
    }
    if (!existsSync(CHROME_BIN)) {
      fail(`Chrome not found at ${CHROME_BIN} (set CHROME_BIN)`);
    }
  }
  console.log(
    [
      `${config.name} ${config.version}`,
      config.channel,
      config.browsers.join(', '),
      ...(config.dryRun ? ['dry run'] : []),
    ].join(' · '),
  );
}

function takeReleaseNotes(version: string, dryRun: boolean): string {
  const missing = (message: string): string => {
    if (!dryRun) fail(message);
    console.warn(`⚠️ ${message}`);
    return '';
  };
  if (!existsSync('CHANGES.md')) return missing('CHANGES.md not found');
  const text = readFileSync('CHANGES.md', 'utf-8');
  const escaped = version.replaceAll('.', '\\.');
  const heading = new RegExp(`^## (?:v${escaped}|Unreleased)[ \\t]*$`, 'm');
  const match = heading.exec(text);
  if (!match) {
    return missing(
      `CHANGES.md has no "## v${version}" or "## Unreleased" section`,
    );
  }

  const start = match.index + match[0].length;
  const next = text.slice(start).search(/^## /m);
  const notes = text
    .slice(start, next === -1 ? undefined : start + next)
    .trim();
  if (!notes)
    return missing(`The section for ${version} in CHANGES.md is empty`);

  writeFileSync(
    'CHANGES.md',
    `${text.slice(0, match.index)}## v${version}${text.slice(start)}`,
  );
  return notes;
}

function bumpVersion(version: string): void {
  const pkg = readFileSync('package.json', 'utf-8');
  writeFileSync(
    'package.json',
    pkg.replace(/("version"\s*:\s*)"[^"]*"/, `$1"${version}"`),
  );
  if (existsSync('package-lock.json')) {
    const lock = readJson<{
      version?: string;
      packages?: Record<string, { version?: string }>;
    }>('package-lock.json');
    lock.version = version;
    const root = lock.packages?.[''];
    if (root) root.version = version;
    writeFileSync('package-lock.json', `${JSON.stringify(lock, null, 2)}\n`);
  }
}

function npmScript(browser: Browser, kind: 'build' | 'zip'): string {
  return browser === 'chrome' ? kind : `${kind}:${browser}`;
}

function chromeExtensionId(): string {
  const der = execFileSync('openssl', [
    'pkey',
    '-in',
    PEM,
    '-pubout',
    '-outform',
    'DER',
  ]);
  const digest = createHash('sha256').update(der).digest('hex').slice(0, 32);
  return [...digest]
    .map((char) => String.fromCharCode(Number.parseInt(char, 16) + 97))
    .join('');
}

function geckoId(): string {
  const manifest = readJson<{
    browser_specific_settings?: { gecko?: { id?: string } };
  }>(join(BUILD_DIR, 'firefox', 'manifest.json'));
  const id = manifest.browser_specific_settings?.gecko?.id;
  if (!id) {
    fail('The Firefox manifest has no browser_specific_settings.gecko.id');
  }
  return id;
}

function zipDir(browser: Browser, target: string): string {
  rmSync(target, { force: true });
  execFileSync('zip', ['-q', '-r', '-X', target, '.'], {
    cwd: join(BUILD_DIR, browser),
    stdio: 'inherit',
  });
  return target;
}

function buildAll(config: Config): void {
  for (const browser of config.browsers) {
    step(`Building ${browser}`);
    run('npm', ['run', npmScript(browser, 'build')]);
  }
}

function packCrx(target: string): string {
  const dir = join(BUILD_DIR, 'chrome');
  rmSync(`${dir}.crx`, { force: true });
  // Chrome only accepts PKCS#8 keys; older public.pem files are PKCS#1.
  const keyDir = mkdtempSync(join(tmpdir(), 'release-'));
  const key = join(keyDir, 'key.pem');
  try {
    execFileSync('openssl', [
      'pkcs8',
      '-topk8',
      '-nocrypt',
      '-in',
      PEM,
      '-out',
      key,
    ]);
    run(CHROME_BIN, [`--pack-extension=${dir}`, `--pack-extension-key=${key}`]);
  } finally {
    rmSync(keyDir, { recursive: true, force: true });
  }
  if (!existsSync(`${dir}.crx`)) fail('Chrome did not create a CRX');
  renameSync(`${dir}.crx`, target);
  return target;
}

function packGithub(config: Config, repo: string): string[] {
  const { name, version } = config;
  const download = `${repo}/releases/download/${version}`;
  const files: string[] = [];
  buildAll(config);

  if (config.browsers.includes('chrome')) {
    step('Packing CRX');
    files.push(packCrx(join(OUTPUT_DIR, `${name}-${version}.crx`)));
    writeFileSync(
      'updates.xml',
      `<?xml version='1.0' encoding='UTF-8'?>
<gupdate xmlns='http://www.google.com/update2/response' protocol='2.0'>
  <app appid='${chromeExtensionId()}'>
    <updatecheck codebase='${download}/${name}-${version}.crx' version='${version}' />
  </app>
</gupdate>
`,
    );
  }

  if (config.browsers.includes('firefox')) {
    step('Packing XPI');
    files.push(zipDir('firefox', join(OUTPUT_DIR, `${name}-${version}.xpi`)));
    const repoPath = repo.replace('https://github.com/', '');
    const updates = {
      addons: {
        [geckoId()]: {
          updates: [
            {
              version,
              update_link: `${download}/${name}-${version}.xpi`,
              update_info_url: `https://raw.githubusercontent.com/${repoPath}/refs/tags/${version}/CHANGES.md`,
            },
          ],
        },
      },
    };
    writeFileSync('updates.json', `${JSON.stringify(updates, null, 2)}\n`);
  }

  return files;
}

function packStore(config: Config): string[] {
  for (const browser of config.browsers) {
    step(`Zipping ${browser}`);
    run('npm', ['run', npmScript(browser, 'zip')]);
  }
  return readdirSync(BUILD_DIR)
    .filter((file) => file.endsWith('.zip') && file.includes(config.version))
    .map((file) => {
      const target = join(OUTPUT_DIR, file);
      renameSync(join(BUILD_DIR, file), target);
      return target;
    });
}

function packLocal(config: Config): string[] {
  const { name, version } = config;
  buildAll(config);
  step('Packing');
  return config.browsers.map((browser) =>
    browser === 'firefox'
      ? zipDir('firefox', join(OUTPUT_DIR, `${name}-${version}.xpi`))
      : zipDir('chrome', join(OUTPUT_DIR, `${name}-${version}-chrome.zip`)),
  );
}

function commitAndTag(
  version: string,
  notes: string,
  onCommitted: () => void,
): void {
  step('Committing and tagging');
  run('git', ['add', ...TRACKED.filter((file) => existsSync(file))]);
  run('git', ['commit', '-m', `${version}: release`]);
  onCommitted();
  run('git', ['tag', '-a', version, '-F', '-'], `${version}\n\n${notes}\n`);
}

function publish(version: string, notes: string, files: string[]): void {
  step('Pushing');
  run('git', ['push', '--atomic', 'origin', 'HEAD', `refs/tags/${version}`]);
  step('Creating GitHub release');
  run(
    'gh',
    [
      'release',
      'create',
      version,
      ...files,
      '--title',
      version,
      '--notes-file',
      '-',
    ],
    notes,
  );
}

function main(): void {
  const config = readConfig();
  preflight(config);

  step('Checking');
  run('npm', ['run', 'check']);

  const originals = new Map(
    TRACKED.filter((file) => existsSync(file)).map((file) => [
      file,
      readFileSync(file),
    ]),
  );
  const restore = (): void => {
    for (const [file, content] of originals) writeFileSync(file, content);
    for (const file of TRACKED) {
      if (!originals.has(file)) rmSync(file, { force: true });
    }
  };
  process.on('exit', restore);
  const notes = takeReleaseNotes(config.version, config.dryRun);
  bumpVersion(config.version);

  rmSync(BUILD_DIR, { recursive: true, force: true });
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const files =
    config.channel === 'github' && config.repo
      ? packGithub(config, config.repo)
      : config.channel === 'store'
        ? packStore(config)
        : packLocal(config);

  if (config.dryRun) {
    console.log(`\n✅ Dry run, nothing committed:\n${files.join('\n')}`);
    console.log(`\n${notes}`);
    return;
  }

  commitAndTag(config.version, notes, () => process.off('exit', restore));
  if (config.channel !== 'local') publish(config.version, notes, files);

  console.log(`\n🎉 ${config.version} released:\n${files.join('\n')}`);
  if (config.channel === 'store') {
    console.log(
      'Upload the Firefox and sources zips to AMO, the Chrome zip to the Chrome Web Store.',
    );
  }
}

main();
