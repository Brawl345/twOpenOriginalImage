<script setup lang="ts">
import MockFrame from './MockFrame.vue';
import MockPhoto from './MockPhoto.vue';
</script>

<template>
  <MockFrame wide>
    <div class="strip">
      <span class="tab">
        <svg class="icon" viewBox="0 0 12 12" aria-hidden="true">
          <path d="M2 2l8 8M10 2 2 10" />
        </svg>
        x.com
      </span>
      <span
        v-for="n in 3"
        :key="n"
        class="tab photo-tab"
        :class="{ active: n === 1 }"
      >
        <span class="favicon"><MockPhoto :variant="n - 1" /></span>
        img{{ n }}
      </span>
    </div>
    <div class="content">
      <div class="image"><MockPhoto :variant="0" /></div>
    </div>
  </MockFrame>
</template>

<style scoped>
.strip {
  display: flex;
  gap: 2px;
  align-items: flex-end;
  height: 18px;
  padding: 0 6px;
  background: var(--mock-dim);
}

.tab {
  display: inline-flex;
  flex: none;
  gap: 3px;
  align-items: center;
  height: 14px;
  padding: 0 6px;
  border-radius: 5px 5px 0 0;
  color: var(--muted);
  font-size: 6.5px;
  white-space: nowrap;
}

.photo-tab {
  border: 1px solid transparent;
  border-bottom: none;
}

.tab.active {
  background: #0e0e0e;
  color: #fff;
}

.icon {
  width: 6px;
  height: 6px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
}

.favicon {
  width: 7px;
  height: 7px;
  overflow: hidden;
  border-radius: 2px;
}

.content {
  display: grid;
  place-items: center;
  height: calc(100% - 18px);
  background: #0e0e0e;
}

.image {
  width: 120px;
  height: 80px;
  overflow: hidden;
}
</style>
