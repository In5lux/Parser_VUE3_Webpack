<script setup lang="ts">

defineProps<{ customers: string[] }>();

const emit = defineEmits(['select-customer']);

</script>

<template>
	<ul>
		<template v-for="customer in customers" :key="customer">
      <li @click="$emit('select-customer', customer)">{{customer.replace(/["«»]/g,'')}}</li>
		</template>
	</ul>		
</template>

<style scoped>
li {
	padding: 5px;
}
li:hover {
	background-color: #ddd;	
}
</style>