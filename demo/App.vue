<template>
  <div>{{ msg }}</div>
</template>

<script>
import { test } from './test.js';

test();
export default {
  data() {
    return {
      msg: 'Hi from the Vue file!'
    }
  }
}
</script>

<style scoped>
div {
  color: blue;
}
</style>