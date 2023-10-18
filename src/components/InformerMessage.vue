<script setup lang="ts">
defineProps<{
  informerMsg: string | undefined;
}>();
</script>

<template>
  <div class="informer-background">
    <div class="stop-word-informer">{{ informerMsg }}</div>
  </div>
</template>

<style scoped>
.informer-background {
  background-color: rgba(255, 255, 255, 0.4);
  position: fixed;
  display: flex;
  align-items: center;
  justify-content: center;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.stop-word-informer {
  background-color: #fff;
  position: fixed;
  border: 1px solid #ccc;
  padding: 50px;
  border-radius: 15px;
  box-shadow: 0px 0px 20px darkslategray;
  max-width: 80%;
}
</style>
