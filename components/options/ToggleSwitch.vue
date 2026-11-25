<script setup lang="ts">
defineProps<{ id?: string; large?: boolean }>();
const checked = defineModel<boolean>({ required: true });
</script>

<template>
  <span class="switch" :class="{ large }">
    <input :id="id" v-model="checked" type="checkbox" role="switch" />
    <span class="track" aria-hidden="true">
      <span class="thumb">
        <svg viewBox="0 0 16 16">
          <path v-if="checked" d="M3.5 8.5l3 3 6-7" />
          <path v-else d="M4.5 4.5l7 7m0-7l-7 7" />
        </svg>
      </span>
    </span>
  </span>
</template>

<style scoped>
.switch {
  --w: 44px;
  --h: 26px;
  position: relative;
  display: inline-flex;
  flex: none;
  width: var(--w);
  height: var(--h);
}

.large {
  --w: 56px;
  --h: 32px;
}

input {
  position: absolute;
  inset: 0;
  z-index: 1;
  width: 100%;
  height: 100%;
  margin: 0;
  opacity: 0;
  cursor: pointer;
}

.track {
  width: 100%;
  height: 100%;
  border-radius: 999px;
  background: var(--line-strong);
  transition: background-color 0.2s;
}

.thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  display: grid;
  place-items: center;
  width: calc(var(--h) - 6px);
  height: calc(var(--h) - 6px);
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
  transition: transform 0.2s cubic-bezier(0.3, 1.4, 0.6, 1);
}

svg {
  width: 60%;
  height: 60%;
  fill: none;
  stroke: var(--line-strong);
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

input:checked + .track {
  background: var(--blue);
}

input:checked + .track .thumb {
  transform: translateX(calc(var(--w) - var(--h)));
}

input:checked + .track svg {
  stroke: var(--blue);
}

input:focus-visible + .track {
  outline: 2px solid var(--blue);
  outline-offset: 2px;
}
</style>
