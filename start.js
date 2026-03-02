// start.js - Render 启动入口
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3014;

// 简单的 HTTP 服务器（保持 Render 实例运行）
const server = http.createServer((req, res) => {
  const url = req.url;
  
  if (url === '/health' || url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      service: 'Car Scout',
      version: '3.3',
      timestamp: new Date().toISOString()
    }));
  } else if (url === '/status') {
    // 返回最新报告状态
    const dataDir = path.join(__dirname, 'data');
    let latestReport = null;
    
    try {
      const files = fs.readdirSync(dataDir);
      const reports = files.filter(f => f.startsWith('report_') && f.endsWith('.md'));
      if (reports.length > 0) {
        latestReport = reports.sort().pop();
      }
    } catch (e) {}
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'running',
      latestReport: latestReport,
      timestamp: new Date().toISOString()
    }));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`🚗 Car Scout Web Server`);
  console.log(`📡 监听端口: ${PORT}`);
  console.log(`🔗 健康检查: http://localhost:${PORT}/health`);
  console.log(`📊 状态页面: http://localhost:${PORT}/status`);
});

// 保持进程运行
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    process.exit(0);
  });
});
