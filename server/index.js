#!/usr/bin/env node

const express = require('express')
const { vueMiddleware } = require('../middleware')

const app = express()
const root = process.cwd();
const path = require('path');
const prebundle = require('../prebundle');
const { loadConfigFromFile } = require('./config');

async function start() {
  app.use(vueMiddleware())

  app.use(express.static(path.join(root, './demo')))

  const config = await loadConfigFromFile();
  console.log(config.plugins, 'config')

  app.listen(3003, async () => {
    await prebundle(path.join(root, './demo'));
    console.log('server running at http://localhost:3003')
  })
}

start();
