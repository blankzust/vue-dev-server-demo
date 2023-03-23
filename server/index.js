#!/usr/bin/env node

const express = require('express')
const { vueMiddleware } = require('../middleware')

const app = express()
const root = process.cwd();
const path = require('path');

app.use(vueMiddleware())

app.use(express.static(path.join(root, './demo')))

app.listen(3002, () => {
  console.log('server running at http://localhost:3002')
})

