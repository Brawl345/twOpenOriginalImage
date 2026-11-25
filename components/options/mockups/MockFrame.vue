<script setup lang="ts">
defineProps<{ wide?: boolean }>();
</script>

<template>
  <div class="frame" :class="{ wide }">
    <slot />
  </div>
</template>

<style scoped>
.frame {
  position: relative;
  width: 136px;
  height: 84px;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--mock-bg);
  font-size: 8px;
  line-height: 1;
  color: var(--text);
  user-select: none;
}

.wide {
  width: 100%;
  height: 112px;
}
</style>
