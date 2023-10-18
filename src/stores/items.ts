import { ref } from 'vue';
import { defineStore } from 'pinia';
import type { ISearchItem } from '../intefaces/ISearchItem';

type ISearchList = ISearchItem[] | null;

export const useItemsStore = defineStore('search-items', () => {
  const items = ref<ISearchList>([]);

  function setItems(state: ISearchList): void {
    items.value = state;
  }

  return { items, setItems };
});
