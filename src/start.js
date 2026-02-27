#!/usr/bin/env node

// Render入口 - 确保数据库文件存在，然后启动服务器
const fs = require('fs');
const path = require('path');

// 确保database目录存在
const dbDir = path.join(__dirname, '..', 'database');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log('✅ Created database directory');
}

// 确保vehicles.json文件存在
const vehiclesFile = path.join(dbDir, 'vehicles.json');
if (!fs.existsSync(vehiclesFile)) {
  const initialData = {
    vehicles: [],
    lastUpdate: new Date().toISOString(),
    version: '1.0'
  };
  fs.writeFileSync(vehiclesFile, JSON.stringify(initialData, null, 2));
  console.log('✅ Created initial vehicles.json');
}

// 现在启动服务器
console.log('🚀 Starting Car Scout server...');
require('./web-server.js');
