<script setup lang="ts">
import MockCursor from './MockCursor.vue';
import MockFrame from './MockFrame.vue';
import MockPhoto from './MockPhoto.vue';

defineProps<{ play: boolean }>();
</script>

<template>
  <MockFrame>
    <div class="thumb">
      <MockPhoto :variant="2" />
      <span class="ripple" :class="{ play }" />
      <span class="pointer"><MockCursor /></span>
    </div>
    <svg class="arrow" viewBox="0 0 16 10" aria-hidden="true">
      <path d="M1 5h13M10 1l4 4-4 4" />
    </svg>
    <div class="opened">
      <div class="image"><MockPhoto :variant="2" /></div>
    </div>
  </MockFrame>
</template>

<style scoped>
.thumb {
  position: absolute;
  top: 26px;
  left: 8px;
  width: 38px;
  height: 28px;
  border-radius: 4px;
}

.thumb > :first-child {
  border-radius: 4px;
}

.ripple {
  position: absolute;
  top: 12px;
  left: 17px;
  width: 10px;
  height: 10px;
  margin: -5px 0 0 -5px;
  border: 1.5px solid #fff;
  border-radius: 50%;
  opacity: 0.9;
}

.ripple.play {
  animation: ripple 1s ease-out infinite;
}

@keyframes ripple {
  from {
    opacity: 0.9;
    transform: scale(0.4);
  }
  to {
    opacity: 0;
    transform: scale(2.2);
  }
}

.pointer {
  position: absolute;
  top: 12px;
  left: 17px;
}

.arrow {
  position: absolute;
  top: 37px;
  left: 52px;
  width: 14px;
  height: 9px;
  fill: none;
  stroke: var(--muted);
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.opened {
  position: absolute;
  top: 6px;
  right: 6px;
  bottom: 6px;
  left: 72px;
  display: grid;
  place-items: center;
  border-radius: 6px;
  background: #0e0e0e;
}

.image {
  width: 52px;
  height: 58px;
  overflow: hidden;
  border-radius: 2px;
}
</style>
