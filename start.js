#!/usr/bin/env node

// Render 智能入口 - 自动找到正确的工作目录
const fs = require('fs');
const path = require('path');

// 尝试多个可能的路径
const possiblePaths = [
  './src/web-server.js',           // 从根目录运行
  './web-server.js',               // 从src目录运行
  '../src/web-server.js',          // 从database等目录运行
  '/opt/render/project/src/web-server.js',  // Render绝对路径
];

let found = false;

for (const tryPath of possiblePaths) {
  try {
    const fullPath = path.resolve(tryPath);
    if (fs.existsSync(fullPath)) {
      console.log(`✅ Found web-server.js at: ${fullPath}`);
      require(fullPath);
      found = true;
      break;
    }
  } catch (e) {
    // 继续尝试下一个
  }
}

if (!found) {
  console.error('❌ Cannot find web-server.js');
  console.error('Current directory:', process.cwd());
  console.error('__dirname:', __dirname);
  console.error('Files in current dir:');
  try {
    console.error(fs.readdirSync('.'));
  } catch (e) {}
  process.exit(1);
}
