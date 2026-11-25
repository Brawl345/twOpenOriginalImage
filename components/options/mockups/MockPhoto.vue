<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{ variant?: number }>(), {
  variant: 0,
});

const BLUE: [string, string, string] = ['#8ecdf7', '#1d9bf0', '#0b5e94'];
const PALETTES: [string, string, string][] = [
  BLUE,
  ['#f9b384', '#e0607e', '#7a2e5c'],
  ['#a8e6cf', '#3fb68b', '#1f6f50'],
  ['#c3b5f7', '#7856ff', '#3d2a99'],
];

const colors = computed(
  () => PALETTES[props.variant % PALETTES.length] ?? BLUE,
);
</script>

<template>
  <svg viewBox="0 0 40 30" preserveAspectRatio="xMidYMid slice">
    <rect width="40" height="30" :fill="colors[0]" />
    <circle cx="30" cy="8" r="4" fill="#ffd25e" />
    <path d="M0 30L12 13l8 10 7-7 13 14z" :fill="colors[1]" />
    <path d="M0 30c8-7 16-8 24-4s12 1 16-2v6z" :fill="colors[2]" />
  </svg>
</template>

<style scoped>
svg {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
