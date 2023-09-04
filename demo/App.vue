<template>
  <div>{{ msg }}</div>
</template>

<script>
import { test } from './test.js';
// import test11 from 'test:module'

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