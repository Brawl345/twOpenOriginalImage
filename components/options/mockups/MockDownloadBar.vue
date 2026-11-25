<script setup lang="ts">
import MockCursor from './MockCursor.vue';
import MockFrame from './MockFrame.vue';
import MockPhoto from './MockPhoto.vue';
</script>

<template>
  <MockFrame>
    <div class="panes">
      <div class="pane">
        <MockPhoto :variant="0" />
      </div>
      <div class="pane">
        <MockPhoto :variant="0" />
        <div class="bar">
          <span class="current">orig</span>
          <svg class="icon" viewBox="0 0 12 12" aria-hidden="true">
            <path d="M6 1.5v6M3.5 5 6 7.5 8.5 5M2 10h8" />
          </svg>
        </div>
        <span class="pointer"><MockCursor /></span>
      </div>
    </div>
  </MockFrame>
</template>

<style scoped>
.panes {
  display: flex;
  gap: 4px;
  height: 100%;
  padding: 6px;
}

.pane {
  position: relative;
  flex: 1;
  overflow: hidden;
  border-radius: 6px;
}

.bar {
  position: absolute;
  top: 4px;
  right: 4px;
  left: 4px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 3px 5px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.72);
  color: #fff;
  font-size: 6.5px;
  font-weight: 700;
}

.icon {
  width: 7px;
  height: 7px;
  fill: none;
  stroke: #8ecdf7;
  stroke-width: 1.4;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.pointer {
  position: absolute;
  top: 9px;
  left: 34px;
}
</style>
