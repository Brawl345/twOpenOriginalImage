<script setup lang="ts">
import MockFrame from './MockFrame.vue';
import MockPost from './MockPost.vue';
</script>

<template>
  <MockFrame>
    <div class="feed">
      <MockPost :variant="0" highlight />
      <MockPost :variant="1" highlight />
      <MockPost :variant="2" highlight />
    </div>
  </MockFrame>
</template>

<style scoped>
.feed {
  width: 216px;
  transform: scale(0.625);
  transform-origin: top left;
}

.feed > * + * {
  border-top: 1px solid var(--line);
}
</style>
