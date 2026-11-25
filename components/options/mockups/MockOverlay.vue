<script setup lang="ts">
import MockFrame from './MockFrame.vue';
import MockPhoto from './MockPhoto.vue';
import MockPost from './MockPost.vue';

defineProps<{ play: boolean }>();
</script>

<template>
  <MockFrame wide>
    <div class="page">
      <div class="nav"><span /><span /><span /><span /></div>
      <div class="feed"><MockPost :variant="0" /></div>
    </div>
    <div class="overlay">
      <div class="toolbar">
        <span class="chip">1 / 3</span>
        <span class="chip" />
        <span class="chip" />
        <span class="chip close" />
      </div>
      <div class="viewport">
        <div class="strip" :class="{ play }">
          <div class="image"><MockPhoto :variant="0" /></div>
          <div class="image"><MockPhoto :variant="1" /></div>
          <div class="image"><MockPhoto :variant="2" /></div>
        </div>
      </div>
    </div>
  </MockFrame>
</template>

<style scoped>
.page {
  display: flex;
  justify-content: center;
  height: 100%;
}

.nav {
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 10px 10px 0 0;
}

.nav span {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--mock-fg);
}

.feed {
  width: 136px;
  border-right: 1px solid var(--line);
  border-left: 1px solid var(--line);
}

.overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: rgba(0, 0, 0, 0.82);
}

.toolbar {
  display: flex;
  gap: 4px;
  justify-content: center;
  padding: 6px;
}

.chip {
  min-width: 18px;
  height: 9px;
  padding: 0 4px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
  font-size: 6px;
  line-height: 9px;
}

.close {
  min-width: 9px;
  margin-left: 12px;
}

.viewport {
  flex: 1;
  overflow: hidden;
}

.strip {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  transition: transform 0.9s cubic-bezier(0.4, 0, 0.2, 1) 0.5s;
}

.strip.play {
  transform: translateY(-70px);
}

.image {
  width: 104px;
  height: 64px;
  overflow: hidden;
  border-radius: 3px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
}
</style>
