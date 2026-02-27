const fs = require('fs');
const path = require('path');

// Simple report generator for cron job
class SimpleReporter {
  constructor() {
    this.dataDir = path.join(__dirname, '..', 'data');
    this.reportsDir = path.join(__dirname, '..', 'reports', 'daily');
  }

  generateReport() {
    const today = new Date().toISOString().split('T')[0];
    
    // Load most recent data
    const vehiclesFile = path.join(this.dataDir, 'vehicles.json');
    let vehicles = [];
    let lastUpdate = null;
    
    if (fs.existsSync(vehiclesFile)) {
      const data = JSON.parse(fs.readFileSync(vehiclesFile, 'utf8'));
      vehicles = data.vehicles || [];
      lastUpdate = data.lastUpdate;
    }

    // Filter for relevant vehicles
    const toyotaVehicles = vehicles.filter(v => 
      v.brand?.toLowerCase() === 'toyota' ||
      v.title?.toLowerCase().includes('toyota')
    );

    const goodDeals = toyotaVehicles.filter(v => {
      const pa = v.profitAnalysis;
      if (!pa) return false;
      // Check if any scenario has positive profit
      const scenarios = pa.scenarios || {};
      return Object.values(scenarios).some(s => (s.profit || 0) > 300);
    });

    // Generate summary
    const summary = {
      date: today,
      dataDate: lastUpdate ? new Date(lastUpdate).toISOString().split('T')[0] : 'unknown',
      totalVehicles: vehicles.length,
      toyotaCount: toyotaVehicles.length,
      goodDealsCount: goodDeals.length,
      topPicks: toyotaVehicles.slice(0, 5)
    };

    // Generate text report
    const report = this.formatReport(summary, toyotaVehicles);
    
    // Save report
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
    
    const reportFile = path.join(this.reportsDir, `report_${today}.txt`);
    fs.writeFileSync(reportFile, report);
    
    console.log(report);
    return { summary, report, reportFile };
  }

  formatReport(summary, vehicles) {
    const lines = [];
    
    lines.push('╔════════════════════════════════════════════════╗');
    lines.push('║        🚗 Car Scout 每日报告                   ║');
    lines.push('╚════════════════════════════════════════════════╝');
    lines.push('');
    lines.push(`📅 报告日期: ${summary.date}`);
    lines.push(`📊 数据日期: ${summary.dataDate}`);
    lines.push('');
    
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push('📊 数据概览');
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push(`📦 数据库车辆总数: ${summary.totalVehicles} 辆`);
    lines.push(`🚗 Toyota车辆: ${summary.toyotaCount} 辆`);
    lines.push(`💰 优质机会: ${summary.goodDealsCount} 辆`);
    lines.push('');
    
    if (vehicles.length > 0) {
      lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      lines.push('🏆 TOP 车辆推荐');
      lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      lines.push('');
      
      vehicles.slice(0, 5).forEach((v, i) => {
        const pa = v.profitAnalysis;
        const rec = pa?.recommendation || 'N/A';
        const profit = pa?.scenarios?.optimistic?.profit || 0;
        
        lines.push(`\n${i + 1}. ${v.title || 'Unknown'}`);
        lines.push(`   💰 价格: $${v.price || 'N/A'} | 📍 ${v.location || 'N/A'}`);
        lines.push(`   📅 ${v.year || 'N/A'}年 | 🛣️ ${v.mileage ? v.mileage.toLocaleString() + 'km' : 'N/A'}`);
        lines.push(`   🏷️  建议: ${rec}`);
        if (profit > 0) {
          lines.push(`   💵 乐观预估利润: $${profit}`);
        }
        lines.push(`   🔗 ${v.url}`);
      });
    }
    
    lines.push('');
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push('⚠️  说明');
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push('• 数据来源: TradeMe个人卖家');
    lines.push('• 筛选条件: Toyota, $2000-5000, 2002+');
    lines.push('• 自动抓取因浏览器限制未能完成，以上为历史数据分析');
    lines.push('• 建议手动访问 TradeMe 查看最新车源');
    lines.push('');
    lines.push('═══════════════════════════════════════════════════');
    
    return lines.join('\n');
  }
}

// Run
const reporter = new SimpleReporter();
reporter.generateReport();
