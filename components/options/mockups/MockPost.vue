<script setup lang="ts">
import { t } from '../../../lib/i18n';
import MockPhoto from './MockPhoto.vue';

withDefaults(
  defineProps<{ variant?: number; pill?: boolean; highlight?: boolean }>(),
  { variant: 0, pill: true, highlight: false },
);
</script>

<template>
  <div class="post">
    <div class="head">
      <span class="avatar" />
      <span class="lines">
        <span class="line" />
        <span class="line short" />
      </span>
    </div>
    <div class="photo"><MockPhoto :variant="variant" /></div>
    <div class="bar">
      <svg class="icon" viewBox="0 0 12 12" aria-hidden="true">
        <path d="M2 5.5a4 3.5 0 1 1 3 3.4L3 10.5V8.6A3.6 3.5 0 0 1 2 5.5z" />
      </svg>
      <svg class="icon" viewBox="0 0 12 12" aria-hidden="true">
        <path d="M3 9V3.5h5m-1.5-2L8 3.5 6.5 5M9 3v5.5H4m1.5 2L4 8.5 5.5 7" />
      </svg>
      <svg class="icon" viewBox="0 0 12 12" aria-hidden="true">
        <path
          d="M6 10S1.5 7.3 1.5 4.4A2.2 2.2 0 0 1 6 3.3a2.2 2.2 0 0 1 4.5 1.1C10.5 7.3 6 10 6 10z"
        />
      </svg>
      <span v-if="pill" class="pill" :class="{ highlight }">{{
        t('BUTTON_TEXT')
      }}</span>
    </div>
  </div>
</template>

<style scoped>
.post {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px 8px;
}

.head {
  display: flex;
  gap: 4px;
  align-items: center;
}

.avatar {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: var(--blue);
}

.lines {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
}

.line {
  width: 70%;
  height: 3px;
  border-radius: 2px;
  background: var(--mock-fg);
}

.line.short {
  width: 45%;
}

.photo {
  height: 34px;
  overflow: hidden;
  border-radius: 4px;
}

.bar {
  display: flex;
  gap: 9px;
  align-items: center;
  height: 11px;
}

.icon {
  width: 8px;
  height: 8px;
  fill: none;
  stroke: rgb(113, 118, 123);
  stroke-width: 1.1;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.pill {
  margin-left: auto;
  padding: 1px 5px;
  border: 1px solid currentColor;
  border-radius: 999px;
  color: rgb(113, 118, 123);
  font-size: 6.5px;
  line-height: 7px;
  white-space: nowrap;
}

.pill.highlight {
  color: var(--blue);
  background: var(--blue-soft);
  box-shadow: 0 0 0 2px var(--blue-soft);
}
</style>
