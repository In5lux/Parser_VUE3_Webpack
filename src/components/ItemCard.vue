<script setup lang="ts">
import type { ISearchItem } from '../intefaces/ISearchItem';
import { CONFIG } from '../config/config';

defineProps<{ item: ISearchItem }>();

const { HOST, PORT } = CONFIG;

const emit = defineEmits(['send-mail']);

async function sendMail(event: Event) {
  const id = (event.target as HTMLElement).id;
  fetch(HOST + ':' + PORT + '/mail', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify([id])
  }).then(async (res) => {
    let result: string = await res.text();
    emit('send-mail', result);
  });
}
</script>

<template>
  <div class="item-card" :key="item.number">
    <h1>{{ item.customer }}</h1>
    <p>{{ item.number }}</p>
    <p><b>Тип закупки:</b> {{ item.type }}</p>
    <p><b>Описание:</b> {{ item.description }}</p>
    <p><b>Цена:</b> {{ item.price }}</p>
    <p><b>Дата публикации:</b> {{ item.published }}</p>
    <p><b>Дата окончания:</b> {{ item.end }}</p>
    <p v-if="item.securing_requisition">
      <b>Обеспечение заявки:</b> {{ item.securing_requisition }}
    </p>
    <p v-if="item.securing_contract">
      <b>Обеспечение договора:</b> {{ item.securing_contract }}
    </p>
    <p>
      <a v-bind:href="item.link" target="_blank"><b>Подробнее</b>...</a>
      <a v-if="item.documents" v-bind:href="item.documents" target="_blank"
        ><b>Документы</b>...</a
      >
    </p>
    <img
      src="@/assets/img/mail.png"
      alt="Отправить на email"
      width="40"
      @click.prevent="sendMail"
      :id="item.number"
      class="mail"
    />
  </div>
  <hr />
</template>

<style scoped>
.item-card {
  position: relative;
  padding: 20px;
  margin: 20px;
  border: 2px solid rgb(12, 0, 124, 0.1);
  background-color: rgba(252, 251, 229, 0.8);
  border-radius: 10px;
}
.item-card:hover {
  background-color: rgba(252, 251, 229, 1);
  box-shadow: 0px 0px 5px 5px rgba(0, 0, 0, 0.2);
  border: 2px solid linen;
}
.mail {
  position: absolute;
  bottom: 30px;
  right: 20px;
  cursor: pointer;
}
hr {
  border: none;
  width: 98%;
  height: 50px;
  margin-top: 0;
  /*border-bottom: 1px solid #1f1209;*/
  box-shadow: 0 20px 20px -20px darkslategray;
  margin: -70px auto 10px;
}
</style>
