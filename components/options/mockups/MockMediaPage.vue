<script setup lang="ts">
import MockFrame from './MockFrame.vue';
import MockPhoto from './MockPhoto.vue';

defineProps<{ search?: boolean }>();
</script>

<template>
  <MockFrame>
    <div v-if="search" class="search">
      <svg class="icon" viewBox="0 0 12 12" aria-hidden="true">
        <circle cx="5" cy="5" r="3.2" />
        <path d="M7.4 7.4 10 10" />
      </svg>
      <span class="query" />
    </div>
    <template v-else>
      <div class="banner" />
      <span class="avatar" />
    </template>
    <div class="tabs">
      <span class="tab" />
      <span class="tab" />
      <span class="tab active" />
    </div>
    <div class="grid">
      <div v-for="n in 6" :key="n" class="cell">
        <MockPhoto :variant="n - 1" />
      </div>
    </div>
  </MockFrame>
</template>

<style scoped>
.search {
  display: flex;
  gap: 4px;
  align-items: center;
  height: 12px;
  margin: 2px 8px 2px;
  padding: 0 6px;
  border: 1px solid var(--line-strong);
  border-radius: 999px;
}

.icon {
  width: 7px;
  height: 7px;
  fill: none;
  stroke: var(--muted);
  stroke-width: 1.4;
  stroke-linecap: round;
}

.query {
  width: 36px;
  height: 3px;
  border-radius: 2px;
  background: var(--mock-fg);
}

.banner {
  height: 16px;
  background: var(--mock-fg);
}

.avatar {
  position: absolute;
  top: 9px;
  left: 8px;
  width: 14px;
  height: 14px;
  border: 2px solid var(--mock-bg);
  border-radius: 50%;
  background: var(--blue);
}

.tabs {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  height: 10px;
  padding: 3px 8px 0;
  border-bottom: 1px solid var(--line);
}

.tab {
  width: 16px;
  height: 3px;
  border-radius: 2px;
  background: var(--mock-fg);
}

.tab.active {
  background: var(--blue);
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2px;
  padding: 3px 8px;
}

.cell {
  height: 25px;
  overflow: hidden;
}
</style>
