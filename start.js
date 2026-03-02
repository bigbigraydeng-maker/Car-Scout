#!/usr/bin/env node

// Render 智能入口 - 自动找到正确的 web-server 并启动监听
const fs = require('fs');
const path = require('path');

// 尝试多个可能路径（兼容不同工作目录）
const possiblePaths = [
  './src/web-server.js',
  './web-server.js',
  '../src/web-server.js',
  '/opt/render/project/src/src/web-server.js',
  '/opt/render/project/src/web-server.js'
];

function ensureDatabase() {
  const rootDir = __dirname;
  const dbDir = path.join(rootDir, 'database');
  const vehiclesFile = path.join(dbDir, 'vehicles.json');

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    console.log(`✅ Created database directory: ${dbDir}`);
  }

  if (!fs.existsSync(vehiclesFile)) {
    const initialData = {
      vehicles: [],
      lastUpdate: new Date().toISOString(),
      version: '1.0'
    };
    fs.writeFileSync(vehiclesFile, JSON.stringify(initialData, null, 2));
    console.log(`✅ Created initial vehicles file: ${vehiclesFile}`);
  }
}

let serverModulePath = null;
for (const tryPath of possiblePaths) {
  const fullPath = path.resolve(tryPath);
  if (fs.existsSync(fullPath)) {
    serverModulePath = fullPath;
    console.log(`✅ Found web-server.js at: ${fullPath}`);
    break;
  }
}

if (!serverModulePath) {
  console.error('❌ Cannot find web-server.js');
  console.error('Current directory:', process.cwd());
  console.error('__dirname:', __dirname);
  process.exit(1);
}

ensureDatabase();

const CarScoutWebServer = require(serverModulePath);
const port = process.env.PORT || process.argv[2] || 3000;

console.log(`🚀 Starting Car Scout server on port ${port}...`);
const server = new CarScoutWebServer(port);
server.start();
