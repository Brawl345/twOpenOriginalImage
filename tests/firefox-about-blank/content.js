'use strict';

const PREFIX = '[about-blank-test]';
const WAIT_MS = 500;

const report = (label, ok, detail = '') => {
  const line = `${PREFIX} ${ok ? 'PASS' : 'FAIL'} ${label}${detail ? `: ${detail}` : ''}`;
  console.log(line);
  const item = document.createElement('li');
  item.textContent = line;
  item.style.color = ok ? 'green' : 'red';
  results.append(item);
};

const tryWrite = (child, label) => {
  let doc;
  try {
    doc = child.document;
  } catch (error) {
    report(`${label} access document`, false, String(error));
    return false;
  }
  report(`${label} access document`, true);

  try {
    doc.open();
    doc.write('<head></head><body></body>');
    doc.close();
    report(`${label} document.open/write`, true);
  } catch (error) {
    report(`${label} document.open/write`, false, String(error));
  }

  try {
    const title = doc.createElement('title');
    title.textContent = 'about-blank-test';
    doc.querySelector('head').append(title);
    const text = doc.createElement('p');
    text.textContent = `written by the content script (${label})`;
    doc.querySelector('body').append(text);
    report(`${label} DOM insert`, doc.title === 'about-blank-test');
  } catch (error) {
    report(`${label} DOM insert`, false, String(error));
  }
  return true;
};

const run = (trigger) => {
  results.replaceChildren();
  console.log(`${PREFIX} start (${trigger})`);

  const immediate = window.open('about:blank', `about_blank_test_now_${Date.now()}`);
  if (!immediate) {
    report('window.open (immediate)', false, 'popup blocked');
  } else {
    tryWrite(immediate, 'immediate');
  }

  const pageOpen = window.wrappedJSObject?.open;
  if (typeof pageOpen === 'function') {
    const viaPage = pageOpen.call(
      window.wrappedJSObject,
      'about:blank',
      `about_blank_test_page_${Date.now()}`,
    );
    if (!viaPage) {
      report('page window.open', false, 'popup blocked');
    } else {
      tryWrite(viaPage, 'page window.open');
    }
  }

  const delayed = window.open('about:blank', `about_blank_test_wait_${Date.now()}`);
  if (!delayed) {
    report(`window.open (+${WAIT_MS} ms)`, false, 'popup blocked');
    console.log(`${PREFIX} done`);
    return;
  }
  setTimeout(() => {
    tryWrite(delayed, `+${WAIT_MS} ms`);
    console.log(`${PREFIX} done`);
  }, WAIT_MS);
};

const button = document.createElement('button');
button.textContent = 'Run about:blank test';
button.addEventListener('click', () => run('click'));
const results = document.createElement('ul');
document.body.prepend(button, results);

if (new URLSearchParams(location.search).has('autorun')) {
  run('autorun');
}
