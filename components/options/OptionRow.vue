<script setup lang="ts">
import { ref, useId } from 'vue';
import ToggleSwitch from './ToggleSwitch.vue';

defineProps<{ title: string }>();
const checked = defineModel<boolean>({ required: true });
const id = useId();
const hovered = ref(false);
const focused = ref(false);
</script>

<template>
  <label
    :for="id"
    class="row"
    :class="{ off: !checked }"
    @mouseenter="hovered = true"
    @mouseleave="hovered = false"
    @focusin="focused = true"
    @focusout="focused = false"
  >
    <span class="preview" aria-hidden="true">
      <slot :play="hovered || focused" />
    </span>
    <span class="title">{{ title }}</span>
    <ToggleSwitch :id="id" v-model="checked" />
  </label>
</template>

<style scoped>
.row {
  display: flex;
  gap: 16px;
  align-items: center;
  padding: 14px 20px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.row + .row {
  border-top: 1px solid var(--line);
}

.row:hover {
  background: var(--sunken);
}

.preview {
  flex: none;
  transition:
    filter 0.3s,
    opacity 0.3s;
}

.off .preview {
  filter: grayscale(1);
  opacity: 0.55;
}

.title {
  flex: 1;
  min-width: 0;
  font-weight: 700;
}

@media (max-width: 520px) {
  .preview {
    display: none;
  }
}
</style>
