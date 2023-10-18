<script setup lang="ts">
defineProps<{
  stopwordsList: string[] | undefined;
}>();

defineEmits(['stop-word-delete']);
</script>

<template>
  <div class="stopwords-editor-background">
    <div class="stop-words-editor">
      <span
        class="word"
        v-for="(word, index) in stopwordsList"
        :key="index"
        v-on:click.stop.alt.exact="$emit('stop-word-delete', index)"
        >{{ word }}</span
      >
    </div>
  </div>
</template>

<style scoped>
.stopwords-editor-background {
  background-color: rgba(255, 255, 255, 0.3);
  position: fixed;
  display: flex;
  align-items: center;
  justify-content: center;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;  
}

.stop-words-editor {
  background-color: #fff;
  position: fixed;  
  border: 1px solid #ccc;
  padding: 25px;  
  border-radius: 15px;
  /* box-shadow: 0px 0px 20px darkslategray; */
  box-shadow:  0 0 0 25px #fff, 0 0 20px 30px darkslategray;
  max-width: 80%;
  max-height: 500px;
  overflow-y: scroll;
  display: inline-block;
}

.stop-words-editor::-webkit-scrollbar {
    display: none;
}

.word {
  display: inline-block;
  border-radius: 5px;
  border: 1px solid rgb(12, 0, 124);
  padding: 2px;
  margin: 5px;
  user-select: none;
}

.word:hover {
  cursor: pointer;
  background-color: #ccc;
}
</style>
