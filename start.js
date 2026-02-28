#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// 确保数据库目录存在
const dbDir = path.join(__dirname, 'database');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log('✅ Created database directory');
}

// 确保 vehicles.json 存在
const vehiclesFile = path.join(dbDir, 'vehicles.json');
if (!fs.existsSync(vehiclesFile)) {
  fs.writeFileSync(vehiclesFile, JSON.stringify({
    vehicles: [],
    lastUpdate: new Date().toISOString(),
    version: '1.0'
  }, null, 2));
  console.log('✅ Created initial vehicles.json');
}

// 加载并启动服务器
console.log('🚀 Starting Car Scout server...');
const CarScoutWebServer = require('./web-server.js');
const port = process.env.PORT || 3000;
const server = new CarScoutWebServer(port);
server.start();
