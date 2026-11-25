<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref } from 'vue';
import { t } from '../../lib/i18n';
import { findValidImageUrl } from '../../lib/media-url';
import {
  type OverlayBackground,
  type OverlayPrefs,
  type OverlaySize,
  SIZE_ORDER,
} from '../../lib/overlay-prefs';
import type { Photo } from '../../lib/tweets';

const props = defineProps<{
  photos: Photo[];
  start: number;
  dark: boolean;
  hideDownloadButton: boolean;
  initialSize: OverlaySize;
  initialBackground: OverlayBackground;
  filename: (index: number, url: string) => string | null;
  postUrl: (index: number) => string | null;
  onClose: () => void;
  onDownload: (index: number, url: string) => void;
  onZip: ((urls: string[]) => Promise<void>) | null;
  onPrefs: (prefs: OverlayPrefs) => void;
}>();

const SIZE_LABELS: Record<OverlaySize, string> = {
  'fit-window': 'OVERLAY_SIZE_FIT_WINDOW',
  'fit-width': 'OVERLAY_SIZE_FIT_WIDTH',
  'fit-height': 'OVERLAY_SIZE_FIT_HEIGHT',
  full: 'OVERLAY_SIZE_FULL',
};
const SCROLL_STEP = 100;
const HOVER_LOCK_MS = 700;

const root = ref<HTMLElement>();
const scroller = ref<HTMLElement>();
const list = ref<HTMLElement>();
const current = ref(
  Math.min(Math.max(props.start, 0), props.photos.length - 1),
);
const size = ref(props.initialSize);
const background = ref(props.initialBackground);
const zipping = ref(false);
const currentPostUrl = computed(() => props.postUrl(current.value));
const urls = reactive<(string | null)[]>(props.photos.map(() => null));
const settled = reactive<boolean[]>(props.photos.map(() => false));
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let hoverLockedUntil = 0;
let drag: { x: number; y: number; moved: boolean } | null = null;
let suppressClick = false;

const dims = reactive(
  props.photos.map(({ width, height }) => ({ width, height })),
);

const AVAILABLE_HEIGHT = 'calc(100dvh - var(--bar) - 2px)';

const imageStyle = (index: number) => {
  const dim = dims[index];
  if (!dim?.width || !dim.height) {
    return null;
  }
  const full = `${dim.width}px`;
  const fitHeight = `calc(${AVAILABLE_HEIGHT} * ${dim.width / dim.height})`;
  const width = {
    'fit-window': `min(100%, ${full}, ${fitHeight})`,
    'fit-width': `min(100%, ${full})`,
    'fit-height': `min(${full}, ${fitHeight})`,
    full,
  }[size.value];
  return { width, aspectRatio: `${dim.width} / ${dim.height}` };
};

const ready = computed(() =>
  dims
    .slice(0, current.value + 1)
    .every((dim, i) => settled[i] || (dim.width && dim.height)),
);

const close = () => props.onClose();

const lockHover = () => {
  hoverLockedUntil = performance.now() + HOVER_LOCK_MS;
};

const behavior = (smooth: boolean): ScrollBehavior =>
  smooth && !reducedMotion ? 'smooth' : 'instant';

const scrollToCurrent = (smooth: boolean) => {
  const figure =
    scroller.value?.querySelectorAll<HTMLElement>('figure')[current.value];
  if (!figure || !scroller.value) {
    return;
  }
  lockHover();
  scroller.value.scrollTo({
    top: figure.offsetTop,
    behavior: behavior(smooth),
  });
};

const select = (index: number, smooth = true) => {
  const count = props.photos.length;
  current.value = ((index % count) + count) % count;
  scrollToCurrent(smooth);
};

const hover = (index: number) => {
  if (!drag && performance.now() >= hoverLockedUntil) {
    current.value = index;
  }
};

const scrollBy = (top: number, left: number, smooth = false) => {
  scroller.value?.scrollBy({ top, left, behavior: behavior(smooth) });
};

const page = (direction: 1 | -1) => {
  const height = scroller.value?.clientHeight ?? 0;
  scrollBy(direction * Math.max(height - 40, SCROLL_STEP), 0, true);
};

const scrollToEdge = (bottom: boolean) => {
  const el = scroller.value;
  el?.scrollTo({ top: bottom ? el.scrollHeight : 0, behavior: behavior(true) });
};

const savePrefs = () =>
  props.onPrefs({ size: size.value, background: background.value });

const toggleSize = async () => {
  const next = SIZE_ORDER.indexOf(size.value) + 1;
  size.value = SIZE_ORDER[next % SIZE_ORDER.length] ?? 'fit-window';
  savePrefs();
  await nextTick();
  const el = scroller.value;
  if (el) {
    el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
  }
  scrollToCurrent(false);
};

const toggleBackground = () => {
  background.value = background.value === 'black' ? 'white' : 'black';
  savePrefs();
};

const download = (index = current.value) => {
  const url = urls[index];
  if (url) {
    props.onDownload(index, url);
  }
};

const zip = async () => {
  if (!props.onZip || zipping.value) {
    return;
  }
  zipping.value = true;
  try {
    await props.onZip(
      await Promise.all(
        props.photos.map((photo) => findValidImageUrl(photo.url)),
      ),
    );
  } catch (error) {
    console.error(error);
  } finally {
    zipping.value = false;
  }
};

const onKeydown = (event: KeyboardEvent) => {
  if (event.ctrlKey || event.metaKey || event.altKey) {
    return;
  }
  unpin();
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  switch (key) {
    case 'Escape':
    case 'v':
      close();
      break;
    case 'j':
      select(current.value + 1);
      break;
    case 'k':
      select(current.value - 1);
      break;
    case 'd':
      download();
      break;
    case 'z':
      zip();
      break;
    case 's':
      toggleSize();
      break;
    case 'b':
      toggleBackground();
      break;
    case 'p':
      if (currentPostUrl.value) {
        window.open(currentPostUrl.value, '_blank', 'noopener');
      }
      break;
    case ' ':
    case 'Enter':
      page(event.shiftKey ? -1 : 1);
      break;
    case 'ArrowUp':
      scrollBy(-SCROLL_STEP, 0);
      break;
    case 'ArrowDown':
      scrollBy(SCROLL_STEP, 0);
      break;
    case 'ArrowLeft':
      scrollBy(0, -SCROLL_STEP);
      break;
    case 'ArrowRight':
      scrollBy(0, SCROLL_STEP);
      break;
    case 'Home':
      scrollToEdge(false);
      break;
    case 'End':
      scrollToEdge(true);
      break;
    default:
      if (key.length !== 1) {
        return;
      }
  }
  event.preventDefault();
  event.stopImmediatePropagation();
};

const onPointerDown = (event: PointerEvent) => {
  if (event.button === 0 && event.pointerType === 'mouse') {
    drag = { x: event.clientX, y: event.clientY, moved: false };
  }
};

const onPointerMove = (event: PointerEvent) => {
  if (!drag || !scroller.value) {
    return;
  }
  if (!(event.buttons & 1)) {
    drag = null;
    return;
  }
  const dx = event.clientX - drag.x;
  const dy = event.clientY - drag.y;
  if (!drag.moved && Math.hypot(dx, dy) < 5) {
    return;
  }
  drag = { x: event.clientX, y: event.clientY, moved: true };
  scroller.value.scrollLeft -= dx;
  scroller.value.scrollTop -= dy;
  event.preventDefault();
};

const onPointerUp = () => {
  suppressClick = !!drag?.moved;
  drag = null;
};

const onClickCapture = (event: MouseEvent) => {
  if (suppressClick) {
    suppressClick = false;
    event.preventDefault();
    event.stopPropagation();
  }
};

const onBackdropClick = (event: MouseEvent) => {
  if (event.target === event.currentTarget) {
    close();
  }
};

const onFigureClick = (event: MouseEvent, index: number) => {
  if (event.target === event.currentTarget) {
    close();
  } else {
    select(index);
  }
};

const onLoad = (index: number, event: Event) => {
  const img = event.target as HTMLImageElement;
  if (img.src === urls[index]) {
    dims[index] = { width: img.naturalWidth, height: img.naturalHeight };
    settled[index] = true;
  }
};

const onError = (index: number) => {
  if (urls[index]) {
    settled[index] = true;
  }
};

let pinned = true;
const unpin = () => {
  pinned = false;
};
const keepCurrentInView = new ResizeObserver(() => {
  if (pinned) {
    scrollToCurrent(false);
  }
});

// WXT mounts the app before it attaches the shadow host to the page.
const focusWhenAttached = () => {
  if (root.value?.isConnected) {
    root.value.focus({ preventScroll: true });
  } else {
    requestAnimationFrame(focusWhenAttached);
  }
};

onMounted(() => {
  window.addEventListener('keydown', onKeydown, true);
  props.photos.forEach((photo, i) => {
    findValidImageUrl(photo.url).then((url) => {
      urls[i] = url;
    });
  });
  if (list.value) {
    keepCurrentInView.observe(list.value);
  }
  focusWhenAttached();
});

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown, true);
  keepCurrentInView.disconnect();
});
</script>

<template>
  <div
    ref="root"
    class="overlay"
    :class="[`size-${size}`, `bg-${background}`, { dark, 'auto-hide': hideDownloadButton }]"
    tabindex="-1"
    @pointerdown.capture="unpin"
    @wheel.passive="unpin"
    role="dialog"
    aria-modal="true"
  >
    <header class="bar">
      <nav class="help">
        <template v-if="photos.length > 1">
          <button type="button" @click="select(current + 1)">
            <kbd>j</kbd>{{ t('OVERLAY_NEXT') }}
          </button>
          <button type="button" @click="select(current - 1)">
            <kbd>k</kbd>{{ t('OVERLAY_PREVIOUS') }}
          </button>
        </template>
        <button type="button" @click="download()">
          <kbd>d</kbd>{{ t('DOWNLOAD') }}
        </button>
        <button
          v-if="onZip"
          type="button"
          :aria-busy="zipping"
          :disabled="zipping"
          @click="zip"
        >
          <kbd>z</kbd>{{ t('OVERLAY_ZIP') }}
        </button>
        <button type="button" @click="toggleSize">
          <kbd>s</kbd>{{ t('OVERLAY_SIZE') }}: {{ t(SIZE_LABELS[size]) }}
        </button>
        <button type="button" @click="toggleBackground">
          <kbd>b</kbd>{{ t('OVERLAY_BACKGROUND') }}:
          {{ t(background === 'black' ? 'OVERLAY_BACKGROUND_BLACK' : 'OVERLAY_BACKGROUND_WHITE') }}
        </button>
        <a
          v-if="currentPostUrl"
          class="post-link"
          :href="currentPostUrl"
          target="_blank"
          rel="noopener"
        >
          <kbd>p</kbd>{{ t('OVERLAY_POST') }}
        </a>
      </nav>
      <div class="status">{{ current + 1 }} / {{ photos.length }}</div>
      <button type="button" class="close" @click="close">
        {{ t('OVERLAY_CLOSE') }}<kbd>Esc</kbd>
      </button>
    </header>
    <div
      ref="scroller"
      class="scroller"
      @click.capture="onClickCapture"
      @click="onBackdropClick"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
    >
      <div ref="list" class="list" @click="onBackdropClick">
        <figure
          v-for="(photo, i) in photos"
          :key="photo.url"
          :class="{ current: i === current, loading: !settled[i] }"
          @mouseover="hover(i)"
          @mousemove="hover(i)"
          @click="onFigureClick($event, i)"
        >
          <div class="download">
            <a
              :href="urls[i] ?? photo.url"
              :download="urls[i] ? (filename(i, urls[i]) ?? '') : ''"
              @click.prevent.stop="download(i)"
            >{{ t('DOWNLOAD') }}</a>
          </div>
          <div
            class="frame"
            :class="{ sized: !!imageStyle(i) }"
            :style="imageStyle(i)"
          >
            <img
              v-if="urls[i]"
              :src="urls[i]"
              :alt="photo.altText ?? ''"
              draggable="false"
              @load="onLoad(i, $event)"
              @error="onError(i)"
            />
          </div>
          <div v-if="!settled[i]" class="spinner" />
        </figure>
      </div>
    </div>
    <div v-if="!ready" class="loading" :aria-label="t('OVERLAY_LOADING')">
      <div class="spinner" />
    </div>
  </div>
</template>

<style scoped>
.overlay {
  --bar: 32px;
  --fg: rgb(15, 20, 25);
  --bar-bg: rgba(255, 255, 255, 0.92);
  --line: rgb(207, 217, 222);
  --pill: rgba(15, 20, 25, 0.06);
  --accent: rgb(29, 155, 240);
  position: fixed;
  inset: 0;
  font-family:
    TwitterChirp, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    Helvetica, Arial, sans-serif;
  font-size: 13px;
  line-height: 18px;
  color: var(--fg);
  outline: none;
}

.overlay.dark {
  --fg: rgb(231, 233, 234);
  --bar-bg: rgba(0, 0, 0, 0.88);
  --line: rgb(47, 51, 54);
  --pill: rgba(231, 233, 234, 0.1);
}

.bar {
  position: absolute;
  inset: 0 0 auto;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 10px;
  height: var(--bar);
  box-sizing: border-box;
  padding: 0 8px;
  font-size: 12px;
  line-height: 16px;
  background: var(--bar-bg);
  border-bottom: 1px solid var(--line);
  backdrop-filter: blur(12px);
}

.help {
  display: flex;
  flex: 1;
  gap: 6px;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
}

button,
.post-link {
  appearance: none;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
  padding: 2px 8px;
  border: 0;
  border-radius: 9999px;
  background: var(--pill);
  color: inherit;
  font: inherit;
  text-decoration: none;
  white-space: nowrap;
  cursor: pointer;
}

button:hover,
button:focus-visible,
.post-link:hover,
.post-link:focus-visible {
  color: var(--accent);
  background: rgba(29, 155, 240, 0.12);
  outline: none;
}

button[aria-busy="true"] {
  cursor: progress;
  opacity: 0.5;
}

kbd {
  min-width: 10px;
  padding: 0 4px;
  border: 1px solid currentColor;
  border-radius: 4px;
  font: inherit;
  font-size: 10px;
  line-height: 12px;
  text-align: center;
  opacity: 0.7;
}

.status {
  flex-shrink: 0;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.close {
  margin-left: auto;
}

.scroller {
  position: absolute;
  inset: var(--bar) 0 0;
  overflow: auto;
  overscroll-behavior: contain;
  overflow-anchor: none;
  background: rgba(0, 0, 0, 0.8);
  cursor: default;
}

.bg-white .scroller {
  background: rgba(255, 255, 255, 0.8);
}

.list {
  position: relative;
  box-sizing: border-box;
  min-width: 100%;
  min-height: 100%;
}

.size-full .list,
.size-fit-height .list {
  width: max-content;
}

.size-fit-window .scroller {
  overflow-x: hidden;
}

figure {
  position: relative;
  display: block;
  margin: 0;
  padding: 0 0 2px;
}

figure.current {
  background: rgba(128, 128, 128, 0.1);
}

figure:last-child:not(:only-child) {
  min-height: calc(100dvh - var(--bar));
}

.frame {
  display: flex;
  justify-content: center;
}

.frame.sized {
  display: block;
  margin: 0 auto;
}

.frame.sized,
.frame:not(.sized) img {
  background: black;
}

.bg-white .frame.sized,
.bg-white .frame:not(.sized) img {
  background: white;
}

img {
  display: block;
  width: auto;
  height: auto;
  user-select: none;
}

.frame.sized img {
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
}

.size-fit-window img {
  max-width: 100%;
  max-height: calc(100dvh - var(--bar) - 2px);
}

.size-fit-width img {
  max-width: 100%;
}

.size-fit-height img {
  max-height: calc(100dvh - var(--bar) - 2px);
}

.download {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 4px 0;
}

.auto-hide .download {
  position: absolute;
  inset: 0 0 auto;
  z-index: 1;
  box-sizing: border-box;
  background: rgba(0, 0, 0, 0.5);
  opacity: 0;
  transition: opacity 0.3s ease-in-out;
}

.auto-hide .download:hover,
.auto-hide .download:focus-within {
  opacity: 1;
}

@media (hover: none) {
  .auto-hide .download {
    opacity: 1;
  }
}

.download a {
  padding: 2px 12px;
  font-size: 12px;
  line-height: 16px;
  border: 1px solid var(--line);
  border-radius: 9999px;
  background: var(--bar-bg);
  color: var(--fg);
  font-weight: 700;
  text-decoration: none;
}

.download a:hover,
.download a:focus-visible,
figure.current .download a {
  border-color: var(--accent);
  color: var(--accent);
  outline: none;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(29, 155, 240, 0.25);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

figure > .spinner {
  position: absolute;
  top: 50%;
  left: 50%;
  margin: -16px 0 0 -16px;
  pointer-events: none;
}

.loading {
  position: absolute;
  inset: var(--bar) 0 0;
  z-index: 3;
  display: grid;
  place-items: center;
  background: rgba(0, 0, 0, 0.6);
  pointer-events: none;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .spinner {
    animation-duration: 2.4s;
  }

  .auto-hide .download {
    transition: none;
  }
}
</style>
