// scripts/devices-api.js
const express = require('express');
const toml = require('toml');
const fs = require('fs/promises');
const path = require('path');

const app = express();
const BASE = path.resolve(__dirname, '../packages-index/entities');

async function readTomlDir(dir) {
  const files = await fs.readdir(dir);
  const result = [];
  for (const file of files) {
    if (file.endsWith('.toml')) {
      const content = await fs.readFile(path.join(dir, file), 'utf-8');
      result.push({ file, ...toml.parse(content) });
    }
  }
  return result;
}

app.get('/api/devices', async (req, res) => {
  const devices = await readTomlDir(path.join(BASE, 'device'));
  res.json(devices);
});

app.get('/api/variants', async (req, res) => {
  const { device } = req.query;
  const variants = await readTomlDir(path.join(BASE, 'device-variant'));
  const filtered = variants.filter(v => v.file.startsWith(`${device}@`));
  res.json(filtered);
});

app.get('/api/images', async (req, res) => {
  const { variant } = req.query;
  const images = await readTomlDir(path.join(BASE, 'image-combo'));
  const filtered = images.filter(img => img.device_variant === variant);
  res.json(filtered);
});

app.listen(3001, () => {
  console.log('Devices API running at http://localhost:3001');
});
