/**
 * Car Scout - 轻量级Web服务器
 * 支持多用户访问和实时数据同步
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

class CarScoutWebServer {
  constructor(port = 3000) {
    this.port = port;
    this.dataDir = path.join(__dirname, '..', 'database');
    this.vehiclesFile = path.join(this.dataDir, 'vehicles.json');
  }

  // 读取车辆数据
  loadVehicles() {
    if (fs.existsSync(this.vehiclesFile)) {
      try {
        return JSON.parse(fs.readFileSync(this.vehiclesFile, 'utf8'));
      } catch (e) {
        return { vehicles: [], lastUpdate: null };
      }
    }
    return { vehicles: [], lastUpdate: null };
  }

  // 生成HTML页面
  generateHTML() {
    const data = this.loadVehicles();
    const vehicles = data.vehicles || [];
    
    // 统计数据
    const stats = {
      total: vehicles.length,
      new: vehicles.filter(v => v.status === 'new').length,
      contacted: vehicles.filter(v => v.status === 'contacted').length,
      viewing: vehicles.filter(v => v.status === 'viewing').length,
      inspecting: vehicles.filter(v => v.status === 'inspecting').length,
      negotiating: vehicles.filter(v => v.status === 'negotiating').length,
      purchased: vehicles.filter(v => v.status === 'purchased').length,
      cleaning: vehicles.filter(v => v.status === 'cleaning').length,
      reselling: vehicles.filter(v => v.status === 'reselling').length,
      sold: vehicles.filter(v => v.status === 'sold').length
    };

    const statusLabels = {
      'new': '📥 新发现',
      'contacted': '📞 已联系',
      'viewing': '📅 预约看车',
      'inspecting': '🔍 车检中',
      'negotiating': '💰 议价中',
      'purchased': '✅ 已购买',
      'cleaning': '🧹 清理中',
      'reselling': '🔄 已上架',
      'sold': '🏁 已售出'
    };

    const statusColors = {
      'new': '#1890ff',
      'contacted': '#52c41a',
      'viewing': '#fa8c16',
      'inspecting': '#f5222d',
      'negotiating': '#fa541c',
      'purchased': '#722ed1',
      'cleaning': '#13c2c2',
      'reselling': '#2f54eb',
      'sold': '#389e0d'
    };

    // 生成车辆卡片HTML
    const vehicleCards = vehicles.map(v => {
      const priorityColor = v.priority >= 6 ? '#ff4d4f' : v.priority >= 3 ? '#faad14' : '#52c41a';
      const statusColor = statusColors[v.status] || '#999';
      
      return `
        <div class="vehicle-card" style="border-left-color: ${priorityColor}">
          <div class="vehicle-header">
            <div class="vehicle-title">${v.year} ${v.title}</div>
            <div class="vehicle-priority" style="background: ${priorityColor}">优先级 ${v.priority}</div>
          </div>
          <div class="vehicle-info">
            <div class="info-item">
              <div class="info-value">$${v.price?.toLocaleString() || '?'}</div>
              <div class="info-label">价格</div>
            </div>
            <div class="info-item">
              <div class="info-value">${v.mileage ? (v.mileage/1000).toFixed(0) + 'k' : '?'} km</div>
              <div class="info-label">里程</div>
            </div>
            <div class="info-item">
              <div class="info-value">${v.location || 'Auckland'}</div>
              <div class="info-label">位置</div>
            </div>
          </div>
          <div class="vehicle-status">
            <span class="status-badge" style="background: ${statusColor}20; color: ${statusColor}; border: 1px solid ${statusColor}">
              ${statusLabels[v.status] || v.status}
            </span>
            ${v.viewingDate ? `<span class="viewing-date">📅 ${v.viewingDate}</span>` : ''}
          </div>
          <div class="vehicle-actions">
            <a href="${v.url}" target="_blank" class="btn btn-primary">🔗 查看Facebook</a>
          </div>
        </div>
      `;
    }).join('');

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🚗 Car Scout - 车辆管理看板</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', sans-serif;
        background: #f0f2f5;
        line-height: 1.6;
      }
      .header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 40px 20px;
        text-align: center;
      }
      .header h1 { font-size: 2.5em; margin-bottom: 10px; }
      .header p { opacity: 0.9; }
      
      .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
      
      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 15px;
        margin-bottom: 30px;
      }
      .stat-card {
        background: white;
        padding: 20px;
        border-radius: 12px;
        text-align: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      }
      .stat-card .number {
        font-size: 2em;
        font-weight: bold;
        color: #667eea;
      }
      .stat-card .label { color: #666; font-size: 0.9em; margin-top: 5px; }
      
      .filter-tabs {
        display: flex;
        gap: 10px;
        margin-bottom: 20px;
        flex-wrap: wrap;
        padding: 0 10px;
      }
      .filter-tab {
        padding: 10px 20px;
        background: white;
        border: 2px solid #e0e0e0;
        border-radius: 25px;
        cursor: pointer;
        transition: all 0.3s;
        font-size: 0.9em;
      }
      .filter-tab:hover, .filter-tab.active {
        border-color: #667eea;
        background: #f0f5ff;
      }
      
      .vehicle-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
        gap: 20px;
      }
      
      .vehicle-card {
        background: white;
        border-radius: 12px;
        padding: 20px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        border-left: 5px solid #ddd;
      }
      .vehicle-header {
        display: flex;
        justify-content: space-between;
        align-items: start;
        margin-bottom: 15px;
      }
      .vehicle-title {
        font-size: 1.2em;
        font-weight: bold;
        color: #333;
        flex: 1;
      }
      .vehicle-priority {
        color: white;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 0.85em;
        font-weight: 500;
      }
      
      .vehicle-info {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
        margin: 15px 0;
        padding: 15px 0;
        border-top: 1px solid #eee;
        border-bottom: 1px solid #eee;
      }
      .info-item { text-align: center; }
      .info-value {
        font-size: 1.3em;
        font-weight: bold;
        color: #667eea;
      }
      .info-label {
        font-size: 0.85em;
        color: #999;
      }
      
      .vehicle-status {
        margin: 15px 0;
      }
      .status-badge {
        display: inline-block;
        padding: 6px 14px;
        border-radius: 20px;
        font-size: 0.85em;
        font-weight: 500;
      }
      .viewing-date {
        margin-left: 10px;
        color: #fa8c16;
        font-weight: 500;
      }
      
      .vehicle-actions {
        margin-top: 15px;
      }
      .btn {
        display: inline-block;
        padding: 10px 20px;
        border-radius: 8px;
        text-decoration: none;
        font-size: 0.9em;
        transition: all 0.3s;
      }
      .btn-primary {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }
      .btn-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
      }
      
      .last-update {
        text-align: center;
        color: #999;
        margin-top: 30px;
        padding: 20px;
      }
      
      @media (max-width: 768px) {
        .vehicle-grid {
          grid-template-columns: 1fr;
        }
        .stats-grid {
          grid-template-columns: repeat(2, 1fr);
        }
      }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚗 Car Scout</h1>
        <p>车辆管理看板 - 实时共享</p>
    </div>
    
    <div class="container">
        <div class="stats-grid">
            <div class="stat-card">
                <div class="number">${stats.total}</div>
                <div class="label">总车辆</div>
            </div>
            <div class="stat-card">
                <div class="number">${stats.new}</div>
                <div class="label">📥 新发现</div>
            </div>
            <div class="stat-card">
                <div class="number">${stats.viewing}</div>
                <div class="label">📅 待看车</div>
            </div>
            <div class="stat-card">
                <div class="number">${stats.inspecting}</div>
                <div class="label">🔍 车检中</div>
            </div>
            <div class="stat-card">
                <div class="number">${stats.purchased}</div>
                <div class="label">✅ 已购买</div>
            </div>
            <div class="stat-card">
                <div class="number">${stats.reselling}</div>
                <div class="label">🔄 已上架</div>
            </div>
        </div>
        
        <div class="filter-tabs">
            <div class="filter-tab active" onclick="filterVehicles('all')">全部 (${stats.total})</div>
            <div class="filter-tab" onclick="filterVehicles('new')">📥 新发现 (${stats.new})</div>
            <div class="filter-tab" onclick="filterVehicles('viewing')">📅 看车 (${stats.viewing})</div>
            <div class="filter-tab" onclick="filterVehicles('inspecting')">🔍 车检 (${stats.inspecting})</div>
            <div class="filter-tab" onclick="filterVehicles('purchased')">✅ 购买 (${stats.purchased})</div>
            <div class="filter-tab" onclick="filterVehicles('cleaning')">🧹 清理 (${stats.cleaning})</div>
            <div class="filter-tab" onclick="filterVehicles('reselling')">🔄 上架 (${stats.reselling})</div>
        </div>
        
        <div class="vehicle-grid" id="vehicle-grid">
            ${vehicleCards}
        </div>
        
        <div class="last-update">
            最后更新：${data.lastUpdate ? new Date(data.lastUpdate).toLocaleString() : '从未更新'}
            <br><br>
            <button class="btn btn-primary" onclick="location.reload()">🔄 刷新页面</button>
        </div>
    </div>
    
    <script>
        function filterVehicles(status) {
            const cards = document.querySelectorAll('.vehicle-card');
            cards.forEach(card => {
                if (status === 'all') {
                    card.style.display = 'block';
                } else {
                    const cardStatus = card.getAttribute('data-status');
                    card.style.display = cardStatus === status ? 'block' : 'none';
                }
            });
            
            document.querySelectorAll('.filter-tab').forEach(tab => {
                tab.classList.remove('active');
            });
            event.target.classList.add('active');
        }
        
        // 自动每30秒刷新
        setInterval(() => {
            location.reload();
        }, 30000);
    </script>
</body>
</html>`;
  }

  start() {
    const server = http.createServer((req, res) => {
      const parsedUrl = url.parse(req.url, true);
      
      // 设置CORS头，允许跨域访问
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      
      if (parsedUrl.pathname === '/') {
        const html = this.generateHTML();
        res.end(html);
      } else if (parsedUrl.pathname === '/api/vehicles') {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(this.loadVehicles()));
      } else {
        res.statusCode = 404;
        res.end('Not Found');
      }
    });

    server.listen(this.port, () => {
      console.log(`\n🌐 Car Scout Web服务器已启动！`);
      console.log(`\n📱 访问地址：http://localhost:${this.port}`);
      console.log(`\n💡 使用方式：`);
      console.log(`   1. 在本机浏览器打开上述地址`);
      console.log(`   2. 或将地址分享给合伙人`);
      console.log(`   3. 确保防火墙允许端口 ${this.port}`);
      console.log(`\n⏱️  页面每30秒自动刷新`);
      console.log(`\n按 Ctrl+C 停止服务器\n`);
    });

    return server;
  }
}

// 如果直接运行
if (require.main === module) {
  const port = process.env.PORT || process.argv[2] || 3000;
  console.log(`🚀 Starting server on port ${port}`);
  const server = new CarScoutWebServer(port);
  server.start();
}

module.exports = CarScoutWebServer;

