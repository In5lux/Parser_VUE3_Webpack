<script setup lang="ts">
defineProps<{
  message: string | undefined;
}>();
</script>

<template>
  <p class="search-msg">{{ message }}</p>
</template>

<style scoped>
.search-msg {
  margin-top: 20px;
  text-align: center;
  font-size: 20px;
}
</style>
