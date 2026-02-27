#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const dbDir = path.join(__dirname, '..', 'database');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log('✅ Created database directory');
}
const vehiclesFile = path.join(dbDir, 'vehicles.json');
if (!fs.existsSync(vehiclesFile)) {
  fs.writeFileSync(vehiclesFile, JSON.stringify({vehicles:[],lastUpdate:new Date().toISOString(),version:'1.0'}, null, 2));
  console.log('✅ Created initial vehicles.json');
}
console.log('🚀 Starting Car Scout server...');
require('./web-server.js');
