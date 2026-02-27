/**
 * Car Scout - 可视化HTML报告生成器
 * 生成交互式车辆管理看板
 */

const fs = require('fs');
const path = require('path');

class VisualReportGenerator {
  constructor() {
    this.reportsDir = path.join(__dirname, '..', 'reports', 'visual');
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  generateDashboard(vehicles, stats) {
    const today = new Date().toISOString().split('T')[0];
    const html = this.generateHTML(vehicles, stats, today);
    
    const reportPath = path.join(this.reportsDir, `dashboard_${today}.html`);
    fs.writeFileSync(reportPath, html);
    
    return reportPath;
  }

  generateHTML(vehicles, stats, date) {
    const newVehicles = vehicles.filter(v => v.status === 'new');
    const contacted = vehicles.filter(v => v.status === 'contacted');
    const viewing = vehicles.filter(v => v.status === 'viewing');
    const inspecting = vehicles.filter(v => v.status === 'inspecting');
    const purchased = vehicles.filter(v => v.status === 'purchased');
    const cleaning = vehicles.filter(v => v.status === 'cleaning');
    const reselling = vehicles.filter(v => v.status === 'reselling');

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🚗 Car Scout 车辆管理看板 | ${date}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f7fa;
            color: #333;
            line-height: 1.6;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 { font-size: 2.5em; margin-bottom: 10px; }
        .header .date { opacity: 0.9; font-size: 1.1em; }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            padding: 30px;
            max-width: 1400px;
            margin: 0 auto;
        }
        
        .stat-card {
            background: white;
            border-radius: 12px;
            padding: 25px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .stat-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 4px 16px rgba(0,0,0,0.15);
        }
        .stat-card .number {
            font-size: 3em;
            font-weight: bold;
            color: #667eea;
        }
        .stat-card .label {
            color: #666;
            margin-top: 5px;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 0 30px 30px;
        }
        
        .section {
            background: white;
            border-radius: 12px;
            padding: 25px;
            margin-bottom: 25px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .section-title {
            font-size: 1.5em;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 3px solid #667eea;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .vehicle-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
            gap: 20px;
        }
        
        .vehicle-card {
            border: 2px solid #e0e0e0;
            border-radius: 10px;
            padding: 20px;
            transition: all 0.3s;
            position: relative;
        }
        .vehicle-card:hover {
            border-color: #667eea;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
        }
        
        .vehicle-card.priority-high { border-left: 5px solid #ff4d4f; }
        .vehicle-card.priority-medium { border-left: 5px solid #faad14; }
        .vehicle-card.priority-low { border-left: 5px solid #52c41a; }
        
        .vehicle-image {
            width: 100%;
            height: 180px;
            border-radius: 8px;
            overflow: hidden;
            margin-bottom: 15px;
            background: #f5f5f5;
        }
        .vehicle-image img {
            width: 100%;
            height: 100%;
            object-fit: cover;
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
        
        .vehicle-year {
            background: #667eea;
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.9em;
        }
        
        .vehicle-stats {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            margin: 15px 0;
            padding: 15px 0;
            border-top: 1px solid #eee;
            border-bottom: 1px solid #eee;
        }
        
        .vehicle-stat {
            text-align: center;
        }
        .vehicle-stat .value {
            font-size: 1.3em;
            font-weight: bold;
            color: #667eea;
        }
        .vehicle-stat .label {
            font-size: 0.85em;
            color: #999;
        }
        
        .status-badge {
            display: inline-block;
            padding: 6px 14px;
            border-radius: 20px;
            font-size: 0.85em;
            font-weight: 500;
        }
        .status-new { background: #e6f7ff; color: #1890ff; }
        .status-contacted { background: #f6ffed; color: #52c41a; }
        .status-viewing { background: #fff7e6; color: #fa8c16; }
        .status-inspecting { background: #fff1f0; color: #f5222d; }
        .status-purchased { background: #f9f0ff; color: #722ed1; }
        .status-cleaning { background: #e6fffb; color: #13c2c2; }
        .status-reselling { background: #f0f5ff; color: #2f54eb; }
        
        .action-buttons {
            display: flex;
            gap: 10px;
            margin-top: 15px;
        }
        
        .btn {
            flex: 1;
            padding: 10px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.9em;
            transition: all 0.2s;
            text-align: center;
            text-decoration: none;
        }
        .btn-primary { background: #667eea; color: white; }
        .btn-primary:hover { background: #5568d3; }
        .btn-secondary { background: #f0f0f0; color: #333; }
        .btn-secondary:hover { background: #e0e0e0; }
        
        .workflow-timeline {
            display: flex;
            justify-content: space-between;
            margin: 20px 0;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 10px;
        }
        
        .timeline-step {
            text-align: center;
            flex: 1;
            position: relative;
        }
        .timeline-step::after {
            content: '→';
            position: absolute;
            right: -10px;
            top: 50%;
            transform: translateY(-50%);
            color: #ccc;
            font-size: 1.5em;
        }
        .timeline-step:last-child::after { display: none; }
        
        .timeline-step .icon {
            font-size: 2em;
            margin-bottom: 5px;
        }
        .timeline-step .count {
            font-size: 1.5em;
            font-weight: bold;
            color: #667eea;
        }
        .timeline-step .label {
            font-size: 0.85em;
            color: #666;
        }
        
        @media print {
            .header { background: #667eea !important; -webkit-print-color-adjust: exact; }
            .vehicle-card { break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚗 Car Scout 车辆管理看板</h1>
        <div class="date">${date} | 实时数据更新</div>
    </div>
    
    <div class="stats-grid">
        <div class="stat-card">
            <div class="number">${stats.total}</div>
            <div class="label">数据库总车辆</div>
        </div>
        <div class="stat-card">
            <div class="number">${newVehicles.length}</div>
            <div class="label">今日新增</div>
        </div>
        <div class="stat-card">
            <div class="number">${purchased.length}</div>
            <div class="label">已购买</div>
        </div>
        <div class="stat-card">
            <div class="number">${viewing.length + inspecting.length}</div>
            <div class="label">看车/车检中</div>
        </div>
    </div>
    
    <div class="container">
        <!-- 工作流程概览 -->
        <div class="section">
            <div class="section-title">📊 工作流程概览</div>
            <div class="workflow-timeline">
                <div class="timeline-step">
                    <div class="icon">📥</div>
                    <div class="count">${newVehicles.length}</div>
                    <div class="label">新发现</div>
                </div>
                <div class="timeline-step">
                    <div class="icon">📞</div>
                    <div class="count">${contacted.length}</div>
                    <div class="label">已联系</div>
                </div>
                <div class="timeline-step">
                    <div class="icon">📅</div>
                    <div class="count">${viewing.length}</div>
                    <div class="label">预约看车</div>
                </div>
                <div class="timeline-step">
                    <div class="icon">🔍</div>
                    <div class="count">${inspecting.length}</div>
                    <div class="label">车检中</div>
                </div>
                <div class="timeline-step">
                    <div class="icon">✅</div>
                    <div class="count">${purchased.length}</div>
                    <div class="label">已购买</div>
                </div>
                <div class="timeline-step">
                    <div class="icon">🧹</div>
                    <div class="count">${cleaning.length}</div>
                    <div class="label">清理中</div>
                </div>
                <div class="timeline-step">
                    <div class="icon">🔄</div>
                    <div class="count">${reselling.length}</div>
                    <div class="label">已上架</div>
                </div>
            </div>
        </div>
        
        <!-- 今日新增 -->
        ${newVehicles.length > 0 ? this.generateVehicleSection('🆕 今日新增车辆', newVehicles) : ''}
        
        <!-- 待看车 -->
        ${viewing.length > 0 ? this.generateVehicleSection('📅 待看车', viewing) : ''}
        
        <!-- 车检中 -->
        ${inspecting.length > 0 ? this.generateVehicleSection('🔍 车检中', inspecting) : ''}
        
        <!-- 已购买待清理 -->
        ${purchased.length > 0 ? this.generateVehicleSection('✅ 已购买待清理', purchased) : ''}
        
        <!-- 清理中 -->
        ${cleaning.length > 0 ? this.generateVehicleSection('🧹 清理中', cleaning) : ''}
        
        <!-- 已上架 -->
        ${reselling.length > 0 ? this.generateVehicleSection('🔄 已重新上架', reselling) : ''}
    </div>
    
    <script>
        // 简单的交互功能
        function updateStatus(vehicleId, newStatus) {
            alert('车辆 ' + vehicleId + ' 状态更新为: ' + newStatus);
            // 实际应用中这里会调用API
        }
    </script>
</body>
</html>`;
  }

  generateVehicleSection(title, vehicles) {
    return `
        <div class="section">
            <div class="section-title">${title} (${vehicles.length}辆)</div>
            <div class="vehicle-grid">
                ${vehicles.map(v => this.generateVehicleCard(v)).join('')}
            </div>
        </div>
    `;
  }

  generateVehicleCard(vehicle) {
    const priorityClass = vehicle.priority >= 6 ? 'priority-high' : 
                         vehicle.priority >= 3 ? 'priority-medium' : 'priority-low';
    
    const statusClass = `status-${vehicle.status}`;
    
    // 生成图片HTML（如果有图片URL）
    const imageHtml = vehicle.imageUrl ? 
      `<div class="vehicle-image"><img src="${vehicle.imageUrl}" alt="${vehicle.title}" onerror="this.style.display='none'"></div>` : 
      `<div class="vehicle-image" style="background: #f0f0f0; display: flex; align-items: center; justify-content: center; color: #999;">🚗 暂无图片</div>`;
    
    return `
        <div class="vehicle-card ${priorityClass}">
            ${imageHtml}
            <div class="vehicle-header">
                <div class="vehicle-title">${vehicle.title}</div>
                <div class="vehicle-year">${vehicle.year}</div>
            </div>
            
            <div class="vehicle-stats">
                <div class="vehicle-stat">
                    <div class="value">$${vehicle.price.toLocaleString()}</div>
                    <div class="label">价格</div>
                </div>
                <div class="vehicle-stat">
                    <div class="value">${(vehicle.mileage/1000).toFixed(0)}k</div>
                    <div class="label">里程</div>
                </div>
                <div class="vehicle-stat">
                    <div class="value">${vehicle.priority}</div>
                    <div class="label">优先级</div>
                </div>
            </div>
            
            <div style="margin: 10px 0;">
                <span class="status-badge ${statusClass}">${this.getStatusLabel(vehicle.status)}</span>
                ${vehicle.location ? `<span style="color: #666; margin-left: 10px;">📍 ${vehicle.location}</span>` : ''}
            </div>
            
            <div class="action-buttons">
                <a href="${vehicle.url}" target="_blank" class="btn btn-primary">🔗 查看链接</a>
                <button class="btn btn-secondary" onclick="updateStatus('${vehicle.id}', 'next')">➡️ 推进</button>
            </div>
        </div>
    `;
  }

  getStatusLabel(status) {
    const labels = {
      'new': '📥 新发现',
      'contacted': '📞 已联系',
      'viewing': '📅 预约看车',
      'inspecting': '🔍 车检中',
      'negotiating': '💰 议价中',
      'purchased': '✅ 已购买',
      'cleaning': '🧹 清理中',
      'reselling': '🔄 已上架',
      'sold': '🏁 已售出',
      'abandoned': '❌ 已放弃'
    };
    return labels[status] || status;
  }
}

module.exports = VisualReportGenerator;
