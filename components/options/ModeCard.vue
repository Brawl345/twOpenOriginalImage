<script setup lang="ts">
import { ref } from 'vue';

defineProps<{ title: string; selected: boolean }>();
defineEmits<{ select: [] }>();
const hovered = ref(false);
const focused = ref(false);
</script>

<template>
  <button
    type="button"
    role="radio"
    class="card"
    :class="{ selected }"
    :aria-checked="selected"
    :tabindex="selected ? 0 : -1"
    @click="$emit('select')"
    @mouseenter="hovered = true"
    @mouseleave="hovered = false"
    @focus="focused = true"
    @blur="focused = false"
  >
    <slot :play="hovered || focused" />
    <span class="label">
      <span class="radio" aria-hidden="true">
        <svg viewBox="0 0 16 16"><path d="M4 8.5l2.5 2.5L12 5.5" /></svg>
      </span>
      <span class="title">{{ title }}</span>
    </span>  </button>
</template>

<style scoped>
.card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 2px solid var(--line);
  border-radius: 16px;
  background: var(--card);
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.2s,
    background-color 0.2s,
    transform 0.2s;
}

.card:hover {
  border-color: var(--line-strong);
}

.card:active {
  transform: scale(0.99);
}

.selected,
.selected:hover {
  border-color: var(--blue);
  background: var(--blue-soft);
}

.label {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: 4px;
}

.radio {
  display: grid;
  flex: none;
  place-items: center;
  width: 20px;
  height: 20px;
  border: 2px solid var(--line-strong);
  border-radius: 50%;
  transition:
    background-color 0.2s,
    border-color 0.2s;
}

.radio svg {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: #fff;
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
  opacity: 0;
}

.selected .radio {
  border-color: var(--blue);
  background: var(--blue);
}

.selected .radio svg {
  opacity: 1;
}

.title {
  font-weight: 700;
}
</style>
