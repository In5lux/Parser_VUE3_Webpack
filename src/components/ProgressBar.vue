<script setup lang="ts">
defineProps<{
  value: number;
  max: number;
}>();
</script>

<template>
  <progress :value="value" :max="max"></progress>
</template>

<style scoped>
progress {
  inline-size: 100%;
  appearance: none;
  -moz-appearance: none;
  -webkit-appearance: none;
  height: 3px;
  position: fixed;
}

progress::-webkit-progress-bar {
  background: #fff;
}

progress::-moz-progress-bar {
  background: rgb(0, 100, 255, 0.7);
}

progress::-webkit-progress-value {
  background: rgba(0, 100, 255, 0.7);
}
</style>
