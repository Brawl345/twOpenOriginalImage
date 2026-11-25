<script setup lang="ts">
import MockFrame from './MockFrame.vue';

defineProps<{ from: string; to: string }>();
</script>

<template>
  <MockFrame>
    <div class="file">
      <svg viewBox="0 0 24 30" aria-hidden="true">
        <path d="M3 1h12l6 6v21a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z" />
        <path class="fold" d="M15 1v6h6" />
        <path class="hill" d="M5 24l5-6 3 3 3-4 4 7z" />
      </svg>
      <span class="name before">{{ from }}</span>
      <span class="name after">{{ to }}</span>
    </div>
  </MockFrame>
</template>

<style scoped>
.file {
  display: flex;
  flex-direction: column;
  gap: 3px;
  align-items: center;
  justify-content: center;
  height: 100%;
}

svg {
  width: 20px;
  height: 25px;
  margin-bottom: 2px;
  fill: var(--card);
  stroke: var(--line-strong);
  stroke-width: 1.2;
  stroke-linejoin: round;
}

.fold {
  fill: none;
}

.hill {
  fill: var(--blue);
  stroke: none;
}

.name {
  padding: 2px 5px;
  border-radius: 4px;
  font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
  font-size: 8px;
  white-space: nowrap;
}

.before {
  color: var(--muted);
  text-decoration: line-through;
}

.after {
  background: var(--blue-soft);
  color: var(--blue);
}
</style>
