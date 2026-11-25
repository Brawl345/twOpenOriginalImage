<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue';
import { browser } from 'wxt/browser';
import ModeCard from '../../components/options/ModeCard.vue';
import MockButton from '../../components/options/mockups/MockButton.vue';
import MockClick from '../../components/options/mockups/MockClick.vue';
import MockDownloadBar from '../../components/options/mockups/MockDownloadBar.vue';
import MockFilename from '../../components/options/mockups/MockFilename.vue';
import MockMediaPage from '../../components/options/mockups/MockMediaPage.vue';
import MockOverlay from '../../components/options/mockups/MockOverlay.vue';
import MockPostPage from '../../components/options/mockups/MockPostPage.vue';
import MockSwap from '../../components/options/mockups/MockSwap.vue';
import MockTabs from '../../components/options/mockups/MockTabs.vue';
import MockTimeline from '../../components/options/mockups/MockTimeline.vue';
import OptionRow from '../../components/options/OptionRow.vue';
import ToggleSwitch from '../../components/options/ToggleSwitch.vue';
import { t } from '../../lib/i18n';
import {
  DEFAULT_OPTIONS,
  loadOptions,
  type OptionKey,
  type Options,
  onOptionsChanged,
  resetOptions,
  saveOptions,
} from '../../lib/options';

const options = ref<Options>({ ...DEFAULT_OPTIONS });
const loaded = ref(false);
const confirmingReset = ref(false);
const modeGroup = useTemplateRef<HTMLElement>('modeGroup');
const altKey = /Mac/.test(navigator.platform) ? 'Option' : 'Alt';
const version = browser.runtime.getManifest().version;
let resetTimer: ReturnType<typeof setTimeout> | undefined;

const set = (key: OptionKey, value: boolean) => {
  options.value[key] = value;
  saveOptions({ [key]: value }).catch(console.error);
};

const model = (key: OptionKey) => ({
  modelValue: options.value[key],
  'onUpdate:modelValue': (value: boolean) => set(key, value),
});

const selectMode = async (overlay: boolean) => {
  set('DISPLAY_ALL_IN_ONE_PAGE', overlay);
  await nextTick();
  modeGroup.value?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus();
};

const onModeKey = (event: KeyboardEvent) => {
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
    event.preventDefault();
    selectMode(!options.value.DISPLAY_ALL_IN_ONE_PAGE);
  }
};

const reset = async () => {
  clearTimeout(resetTimer);
  if (!confirmingReset.value) {
    confirmingReset.value = true;
    resetTimer = setTimeout(() => {
      confirmingReset.value = false;
    }, 4000);
    return;
  }
  confirmingReset.value = false;
  await resetOptions();
  options.value = await loadOptions();
};

const SHORTCUTS: [string[], string][] = [
  [['v'], 'SHORTCUT_OPEN'],
  [['j'], 'OVERLAY_NEXT'],
  [['k'], 'OVERLAY_PREVIOUS'],
  [['Space'], 'SHORTCUT_PAGE'],
  [['d'], 'DOWNLOAD'],
  [['z'], 'SHORTCUT_ZIP'],
  [['s'], 'SHORTCUT_SIZE'],
  [['b'], 'SHORTCUT_BACKGROUND'],
  [['p'], 'OVERLAY_POST'],
  [['Esc'], 'OVERLAY_CLOSE'],
];

let stopListening: (() => void) | undefined;
onMounted(async () => {
  options.value = await loadOptions();
  loaded.value = true;
  stopListening = onOptionsChanged((changed) => {
    options.value = changed;
  });
});
onBeforeUnmount(() => {
  stopListening?.();
  clearTimeout(resetTimer);
});
</script>

<template>
  <main :class="{ loading: !loaded }">
    <header class="masthead">
      <img src="/img/icon_48.png" alt="" width="40" height="40" />
      <h1>{{ t('ext_title') }}</h1>
    </header>

    <label
      for="operation"
      class="card power"
      :class="{ on: options.OPERATION }"
    >
      <span class="power-title">{{ t('OPERATION_TITLE') }}</span>
      <ToggleSwitch id="operation" large v-bind="model('OPERATION')" />
    </label>

    <div class="sections" :class="{ paused: !options.OPERATION }">
      <section>
        <h2>{{ t('SECTION_OPENING') }}</h2>
        <div class="card">
          <div
            ref="modeGroup"
            class="modes"
            role="radiogroup"
            :aria-label="t('MODE_LABEL')"
            @keydown="onModeKey"
          >
            <ModeCard
              v-slot="{ play }"
              :title="t('MODE_OVERLAY')"
              :selected="options.DISPLAY_ALL_IN_ONE_PAGE"
              @select="selectMode(true)"
            >
              <MockOverlay :play="play" />
            </ModeCard>
            <ModeCard
              :title="t('MODE_TABS')"
              :selected="!options.DISPLAY_ALL_IN_ONE_PAGE"
              @select="selectMode(false)"
            >
              <MockTabs />
            </ModeCard>
          </div>
          <p class="alt-hint">{{ t('MODE_ALT_HINT', altKey) }}</p>
          <OptionRow
            class="first-row"
            :title="t('OPTION_SWAP_IMAGE_URL')"            v-bind="model('SWAP_IMAGE_URL')"
          >
            <MockSwap />
          </OptionRow>
        </div>
      </section>

      <section>
        <h2>{{ t('SECTION_BUTTONS') }}</h2>
        <div class="card">
          <OptionRow
            :title="t('OPTION_DISPLAY_ORIGINAL_BUTTONS')"            v-bind="model('DISPLAY_ORIGINAL_BUTTONS')"
          >
            <MockButton />
          </OptionRow>
          <OptionRow
            v-slot="{ play }"
            :title="t('OPTION_OVERRIDE_CLICK_EVENT')"            v-bind="model('OVERRIDE_CLICK_EVENT')"
          >
            <MockClick :play="play" />
          </OptionRow>
          <OptionRow
            :title="t('OPTION_SHOW_IN_TIMELINE')"            v-bind="model('SHOW_IN_TIMELINE')"
          >
            <MockTimeline />
          </OptionRow>
          <OptionRow
            :title="t('OPTION_SHOW_IN_DETAIL_PAGE')"            v-bind="model('SHOW_IN_DETAIL_PAGE')"
          >
            <MockPostPage />
          </OptionRow>
          <OptionRow
            :title="t('OPTION_SHOW_IN_MEDIA_PAGE')"
            v-bind="model('SHOW_IN_MEDIA_PAGE')"
          >
            <MockMediaPage />
          </OptionRow>
          <OptionRow
            :title="t('OPTION_SHOW_IN_SEARCH_MEDIA')"
            v-bind="model('SHOW_IN_SEARCH_MEDIA')"
          >
            <MockMediaPage search />
          </OptionRow>
        </div>
      </section>

      <section>
        <h2>{{ t('SECTION_DOWNLOADS') }}</h2>
        <div class="card">
          <OptionRow
            :title="t('OPTION_HIDE_DOWNLOAD_BUTTON_AUTOMATICALLY')"            v-bind="model('HIDE_DOWNLOAD_BUTTON_AUTOMATICALLY')"
          >
            <MockDownloadBar />
          </OptionRow>
          <OptionRow
            :title="t('OPTION_SAME_FILENAME_AS_IN_ZIP')"            v-bind="model('SAME_FILENAME_AS_IN_ZIP')"
          >
            <MockFilename from="F4kzh…-orig.jpg" to="user-123-img1.jpg" />
          </OptionRow>
          <OptionRow
            :title="t('OPTION_SUPPRESS_FILENAME_SUFFIX')"            v-bind="model('SUPPRESS_FILENAME_SUFFIX')"
          >
            <MockFilename from="F4kzh…-orig.jpg" to="F4kzh….jpg" />
          </OptionRow>
        </div>
      </section>

      <section>
        <h2>{{ t('SECTION_SHORTCUTS') }}</h2>
        <div class="card shortcuts">
          <dl>
            <div v-for="[keys, label] in SHORTCUTS" :key="label" class="shortcut">
              <dt>
                <kbd v-for="key in keys" :key="key">{{ key }}</kbd>
              </dt>
              <dd>{{ t(label) }}</dd>
            </div>
          </dl>
        </div>
      </section>
    </div>

    <footer>
      <button
        type="button"
        class="reset"
        :class="{ confirming: confirmingReset }"
        @click="reset"
      >
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M2.5 8a5.5 5.5 0 1 0 1.7-4M2.5 2v3h3" />
        </svg>
        {{ t(confirmingReset ? 'RESET_CONFIRM' : 'RESET') }}
      </button>
      <a
        class="source"
        href="https://github.com/Brawl345/twOpenOriginalImage"
        target="_blank"
        rel="noopener"
      >
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M5.5 4.5 2 8l3.5 3.5m5-7L14 8l-3.5 3.5" />
        </svg>
        {{ t('SOURCE_CODE') }} · v{{ version }}
      </a>
    </footer>
  </main>
</template>

<style scoped>
main {
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 680px;
  margin: 0 auto;
  transition: opacity 0.2s;
}

.loading {
  opacity: 0;
}

.masthead {
  display: flex;
  gap: 12px;
  align-items: center;
}

h1 {
  margin: 0;
  font-size: 23px;
  font-weight: 800;
}

h2 {
  margin: 0 0 10px 4px;
  font-size: 19px;
  font-weight: 800;
}

.card {
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: var(--card);
  box-shadow: var(--shadow);
}

.power {
  display: flex;
  gap: 16px;
  align-items: center;
  padding: 18px 20px;
  cursor: pointer;
  transition:
    border-color 0.3s,
    background-color 0.3s;
}

.power.on {
  border-color: rgba(29, 155, 240, 0.4);
  background: linear-gradient(
    135deg,
    var(--blue-soft),
    transparent 70%
  ), var(--card);
}

.power-title {
  flex: 1;
  font-size: 17px;
  font-weight: 800;
}

.sections {
  display: flex;
  flex-direction: column;
  gap: 24px;
  transition: opacity 0.3s;
}

.paused {
  opacity: 0.5;
}

.modes {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  padding: 16px 16px 0;
}

@media (max-width: 520px) {
  .modes {
    grid-template-columns: 1fr;
  }
}

.alt-hint {
  display: flex;
  gap: 8px;
  align-items: center;
  margin: 0;
  padding: 12px 20px 14px;
  color: var(--muted);
  font-size: 14px;
}

.first-row {
  border-top: 1px solid var(--line);
}

kbd {
  display: inline-block;
  min-width: 24px;
  padding: 2px 7px;
  border: 1px solid var(--line-strong);
  border-bottom-width: 2px;
  border-radius: 6px;
  background: var(--sunken);
  color: var(--text);
  font: 600 12px / 18px ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
  text-align: center;
}

.shortcuts {
  padding: 16px 20px;
}

dl {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 10px 24px;
  margin: 0;
}

.shortcut {
  display: flex;
  gap: 12px;
  align-items: center;
}

dt {
  flex: none;
  min-width: 52px;
}

dd {
  margin: 0;
}

footer {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
}

footer svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.reset {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  min-height: 36px;
  padding: 0 18px;
  border: 1px solid var(--line-strong);
  border-radius: 999px;
  background: transparent;
  color: var(--text);
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  transition:
    background-color 0.2s,
    color 0.2s,
    border-color 0.2s;
}

.reset:hover {
  background: var(--line);
}

.reset.confirming {
  border-color: var(--red);
  background: var(--red);
  color: #fff;
}

.source {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  color: var(--muted);
  font-size: 14px;
  text-decoration: none;
}

.source:hover {
  color: var(--blue);
  text-decoration: underline;
}
</style>
