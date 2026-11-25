<script setup lang="ts">
import MockFrame from './MockFrame.vue';
import MockPhoto from './MockPhoto.vue';
</script>

<template>
  <MockFrame>
    <div class="photo blurry"><MockPhoto :variant="1" /></div>
    <div class="photo sharp"><MockPhoto :variant="1" /></div>
    <span class="divider" />
    <span class="badge">orig</span>
  </MockFrame>
</template>

<style scoped>
.photo {
  position: absolute;
  inset: 6px;
  overflow: hidden;
  border-radius: 6px;
}

.blurry :deep(svg) {
  filter: blur(2.5px) saturate(0.7);
  transform: scale(1.1);
}

.sharp {
  clip-path: inset(0 0 0 50%);
}

.divider {
  position: absolute;
  top: 6px;
  bottom: 6px;
  left: calc(50% - 1px);
  width: 2px;
  background: #fff;
  box-shadow: 0 0 3px rgba(0, 0, 0, 0.4);
}

.badge {
  position: absolute;
  right: 10px;
  bottom: 10px;
  padding: 2px 4px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  font-size: 7px;
  font-weight: 700;
}
</style>
