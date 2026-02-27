/**
 * Car Scout - 车辆管理 CLI 工具
 * 用于查看、更新和管理数据库中的车辆
 */

const VehicleDatabase = require('./vehicle-database');
const fs = require('fs');
const path = require('path');

class VehicleManager {
  constructor() {
    this.db = new VehicleDatabase();
  }

  showHelp() {
    console.log(`
🚗 Car Scout 车辆管理工具

用法: node vehicle-manager.js [命令] [选项]

命令:
  list              列出所有活跃车辆
  list --status=X   按状态筛选 (new/contacted/purchased/等)
  list --today      只显示今日新增
  view [ID]         查看车辆详情
  status [ID] [状态] 更新车辆状态
  stats             显示统计信息
  cleanup           清理90天前的旧数据
  export [文件名]    导出数据到JSON

示例:
  node vehicle-manager.js list
  node vehicle-manager.js list --status=new
  node vehicle-manager.js view fb_123456789
  node vehicle-manager.js status fb_123456789 contacted
  node vehicle-manager.js export backup.json
`);
  }

  async run(args) {
    const command = args[0];
    
    switch (command) {
      case 'list':
        await this.listVehicles(args);
        break;
      case 'view':
        await this.viewVehicle(args[1]);
        break;
      case 'status':
        await this.updateStatus(args[1], args[2]);
        break;
      case 'stats':
        await this.showStats();
        break;
      case 'cleanup':
        await this.cleanup();
        break;
      case 'export':
        await this.exportData(args[1]);
        break;
      default:
        this.showHelp();
    }
  }

  async listVehicles(args) {
    const flag = args.find(a => a.startsWith('--'));
    let vehicles = [];
    
    if (flag === '--today') {
      vehicles = this.db.getNewVehiclesToday();
      console.log(`\n🆕 今日新增车辆 (${vehicles.length}辆)\n`);
    } else if (flag && flag.startsWith('--status=')) {
      const status = flag.split('=')[1];
      vehicles = this.db.vehicles.vehicles.filter(v => v.status === status);
      console.log(`\n📋 状态为 "${status}" 的车辆 (${vehicles.length}辆)\n`);
    } else {
      vehicles = this.db.getActiveVehicles();
      console.log(`\n✅ 活跃车辆 (${vehicles.length}辆)\n`);
    }
    
    if (vehicles.length === 0) {
      console.log('暂无车辆\n');
      return;
    }
    
    // 按优先级排序
    vehicles.sort((a, b) => b.priority - a.priority);
    
    // 显示表格
    console.log('ID | 年份 | 价格 | 里程 | 优先级 | 状态 | 标题');
    console.log('---|------|------|------|--------|------|------');
    
    vehicles.slice(0, 20).forEach(v => {
      const shortId = v.id.substring(0, 15);
      const shortTitle = v.title ? v.title.substring(0, 30) + '...' : 'N/A';
      const mileage = v.mileage ? `${(v.mileage/1000).toFixed(0)}k` : '?';
      console.log(`${shortId} | ${v.year} | $${v.price} | ${mileage}km | ${v.priority} | ${v.status} | ${shortTitle}`);
    });
    
    if (vehicles.length > 20) {
      console.log(`\n... 还有 ${vehicles.length - 20} 辆车辆 ...`);
    }
    console.log();
  }

  async viewVehicle(id) {
    if (!id) {
      console.log('❌ 请提供车辆ID\n');
      return;
    }
    
    const vehicle = this.db.vehicles.vehicles.find(v => v.id === id || v.id.includes(id));
    
    if (!vehicle) {
      console.log(`❌ 未找到车辆: ${id}\n`);
      return;
    }
    
    console.log(`\n🚗 车辆详情\n`);
    console.log(`ID: ${vehicle.id}`);
    console.log(`标题: ${vehicle.title}`);
    console.log(`年份: ${vehicle.year}`);
    console.log(`价格: $${vehicle.price.toLocaleString()}`);
    console.log(`里程: ${vehicle.mileage.toLocaleString()} km`);
    console.log(`位置: ${vehicle.location || vehicle.searchLocation}`);
    console.log(`优先级: ${vehicle.priority}/9`);
    console.log(`状态: ${vehicle.status}`);
    console.log(`首次发现: ${new Date(vehicle.firstSeen).toLocaleString()}`);
    console.log(`最后更新: ${new Date(vehicle.lastSeen).toLocaleString()}`);
    console.log(`链接: ${vehicle.url}`);
    
    if (vehicle.priceHistory && vehicle.priceHistory.length > 1) {
      console.log(`\n📈 价格历史:`);
      vehicle.priceHistory.forEach(h => {
        console.log(`   ${new Date(h.date).toLocaleDateString()}: $${h.price.toLocaleString()}`);
      });
    }
    
    if (vehicle.changes && vehicle.changes.length > 0) {
      console.log(`\n📝 变动记录:`);
      vehicle.changes.slice(-5).forEach(c => {
        console.log(`   ${new Date(c.date).toLocaleDateString()}: ${c.field} ${c.old} → ${c.new}`);
      });
    }
    
    if (vehicle.notes) {
      console.log(`\n📌 备注: ${vehicle.notes}`);
    }
    
    console.log();
  }

  async updateStatus(id, status) {
    if (!id || !status) {
      console.log('❌ 用法: status [ID] [状态]\n');
      console.log('可用状态: new, contacted, purchased, watching, expired, sold\n');
      return;
    }
    
    const validStatuses = ['new', 'contacted', 'purchased', 'watching', 'expired', 'sold'];
    if (!validStatuses.includes(status)) {
      console.log(`❌ 无效状态. 可用: ${validStatuses.join(', ')}\n`);
      return;
    }
    
    const success = this.db.updateStatus(id, status);
    if (success) {
      console.log(`✅ 车辆 ${id.substring(0, 15)}... 状态已更新为: ${status}\n`);
    } else {
      console.log(`❌ 未找到车辆: ${id}\n`);
    }
  }

  async showStats() {
    const stats = this.db.getStats();
    const today = this.db.getNewVehiclesToday();
    const updated = this.db.getUpdatedVehicles(1);
    
    console.log(`\n📊 数据库统计\n`);
    console.log(`总车辆数: ${stats.total}`);
    console.log(`今日新增: ${today.length}`);
    console.log(`今日更新: ${updated.length}`);
    console.log(`活跃车辆: ${this.db.getActiveVehicles().length}`);
    console.log(`\n状态分布:`);
    Object.entries(stats.statuses).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });
    console.log(`\n最后更新: ${stats.lastUpdate || '从未'}\n`);
  }

  async cleanup() {
    console.log('\n🧹 清理旧数据...\n');
    const removed = this.db.cleanupOldData();
    console.log(`✅ 清理完成，删除了 ${removed} 辆旧车辆\n`);
  }

  async exportData(filename) {
    if (!filename) {
      filename = `export_${new Date().toISOString().split('T')[0]}.json`;
    }
    
    const exportPath = path.join(__dirname, '..', 'data', filename);
    fs.writeFileSync(exportPath, JSON.stringify(this.db.vehicles, null, 2));
    console.log(`\n💾 数据已导出到: ${exportPath}\n`);
  }
}

// 运行
const manager = new VehicleManager();
manager.run(process.argv.slice(2)).catch(err => {
  console.error('错误:', err.message);
  process.exit(1);
});
