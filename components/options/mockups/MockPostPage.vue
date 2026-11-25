<script setup lang="ts">
import MockFrame from './MockFrame.vue';
import MockPost from './MockPost.vue';
</script>

<template>
  <MockFrame>
    <div class="header">
      <svg class="icon" viewBox="0 0 12 12" aria-hidden="true">
        <path d="M10 6H2.5M6 2.5 2.5 6 6 9.5" />
      </svg>
      <span class="line" />
    </div>
    <div class="body">
      <MockPost :variant="3" highlight />
      <div class="reply"><span class="avatar" /><span class="line" /></div>
      <div class="reply"><span class="avatar" /><span class="line" /></div>
    </div>
  </MockFrame>
</template>

<style scoped>
.header {
  position: relative;
  z-index: 1;
  display: flex;
  gap: 6px;
  align-items: center;
  height: 14px;
  padding: 0 8px;
  border-bottom: 1px solid var(--line);
  background: var(--mock-bg);
}

.icon {
  width: 8px;
  height: 8px;
  fill: none;
  stroke: var(--text);
  stroke-width: 1.4;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.line {
  width: 30px;
  height: 3px;
  border-radius: 2px;
  background: var(--mock-fg);
}

.body {
  width: 160px;
  transform: scale(0.85) translateY(-12px);
  transform-origin: top left;
}

.reply {
  display: flex;
  gap: 4px;
  align-items: center;
  padding: 5px 8px;
  border-top: 1px solid var(--line);
}

.reply .line {
  width: 60%;
}

.avatar {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--mock-fg);
}
</style>
