#!/usr/bin/env node

const express = require('express')
const { vueMiddleware } = require('../middleware')

const root = process.cwd();
const path = require('path');
const prebundle = require('../prebundle');
const { loadConfigFromFile } = require('./config');
const { createPluginContainer } = require('../plugin/plugin-container');

async function start() {
  const app = express()

  const config = await loadConfigFromFile();
  const container = await createPluginContainer(config);

  app.use(vueMiddleware({}, container))
  app.use(express.static(path.join(root, './demo')))
  

  container.configureServer(app);

  app.listen(3003, async () => {
    container.buildStart();
    await prebundle(path.join(root, './demo'), container);
    console.log('server running at http://localhost:3003')
  })  
}

start();
