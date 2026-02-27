/**
 * Car Scout - 车辆数据库和去重管理系统
 * 功能：历史记录、去重、状态追踪、增量报告
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class VehicleDatabase {
  constructor() {
    this.dbDir = path.join(__dirname, '..', 'database');
    this.vehiclesFile = path.join(this.dbDir, 'vehicles.json');
    this.historyDir = path.join(__dirname, '..', 'data', 'history');
    
    // 确保目录存在
    if (!fs.existsSync(this.dbDir)) fs.mkdirSync(this.dbDir, { recursive: true });
    if (!fs.existsSync(this.historyDir)) fs.mkdirSync(this.historyDir, { recursive: true });
    
    this.vehicles = this.loadDatabase();
  }

  // 加载数据库
  loadDatabase() {
    if (fs.existsSync(this.vehiclesFile)) {
      try {
        return JSON.parse(fs.readFileSync(this.vehiclesFile, 'utf8'));
      } catch (e) {
        console.error('数据库加载失败，创建新数据库');
        return { vehicles: [], lastUpdate: null };
      }
    }
    return { vehicles: [], lastUpdate: null };
  }

  // 保存数据库
  saveDatabase() {
    this.vehicles.lastUpdate = new Date().toISOString();
    fs.writeFileSync(this.vehiclesFile, JSON.stringify(this.vehicles, null, 2));
  }

  // 生成车辆唯一ID (基于URL)
  generateId(url) {
    // 提取Facebook item ID
    const match = url.match(/\/item\/(\d+)\//);
    if (match) {
      return `fb_${match[1]}`;
    }
    //  fallback: 使用URL hash
    return `url_${crypto.createHash('md5').update(url).digest('hex').substring(0, 12)}`;
  }

  // 检查车辆是否已存在
  findExisting(url) {
    const id = this.generateId(url);
    return this.vehicles.vehicles.find(v => v.id === id);
  }

  // 添加或更新车辆
  addOrUpdateVehicle(vehicleData) {
    const id = this.generateId(vehicleData.url);
    const existing = this.findExisting(vehicleData.url);
    
    const now = new Date().toISOString();
    
    if (existing) {
      // 更新现有车辆
      const changes = [];
      
      if (existing.price !== vehicleData.price) {
        changes.push({
          field: 'price',
          old: existing.price,
          new: vehicleData.price,
          date: now
        });
        existing.price = vehicleData.price;
        existing.priceHistory = existing.priceHistory || [];
        existing.priceHistory.push({ price: vehicleData.price, date: now });
      }
      
      if (existing.mileage !== vehicleData.mileage) {
        changes.push({
          field: 'mileage',
          old: existing.mileage,
          new: vehicleData.mileage,
          date: now
        });
        existing.mileage = vehicleData.mileage;
      }
      
      if (changes.length > 0) {
        existing.changes = existing.changes || [];
        existing.changes.push(...changes);
        existing.lastSeen = now;
        existing.status = 'updated'; // 标记为有更新
        console.log(`   📝 车辆有更新: ${vehicleData.title?.substring(0, 30)}...`);
        changes.forEach(c => console.log(`      ${c.field}: ${c.old} → ${c.new}`));
        this.saveDatabase();
        return { action: 'updated', vehicle: existing, changes };
      }
      
      // 无变化，只更新最后看到时间
      existing.lastSeen = now;
      this.saveDatabase();
      return { action: 'unchanged', vehicle: existing };
    }
    
    // 添加新车辆
    const newVehicle = {
      id,
      ...vehicleData,
      status: 'new', // 新发现
      firstSeen: now,
      lastSeen: now,
      priceHistory: [{ price: vehicleData.price, date: now }],
      changes: [],
      notes: '',
      priority: this.calculatePriority(vehicleData)
    };
    
    this.vehicles.vehicles.push(newVehicle);
    this.saveDatabase();
    console.log(`   🆕 新车辆: ${vehicleData.title?.substring(0, 30)}...`);
    return { action: 'new', vehicle: newVehicle };
  }

  // 计算优先级
  calculatePriority(vehicle) {
    let score = 0;
    
    // 价格越低优先级越高
    if (vehicle.price < 3000) score += 3;
    else if (vehicle.price < 4000) score += 2;
    else if (vehicle.price < 5000) score += 1;
    
    // 里程越低优先级越高
    if (vehicle.mileage < 100000) score += 3;
    else if (vehicle.mileage < 130000) score += 2;
    else if (vehicle.mileage < 160000) score += 1;
    
    // 年份越新优先级越高
    if (vehicle.year >= 2010) score += 2;
    else if (vehicle.year >= 2005) score += 1;
    
    return score;
  }

  // 更新车辆状态
  updateStatus(id, status, notes = '') {
    const vehicle = this.vehicles.vehicles.find(v => v.id === id);
    if (vehicle) {
      vehicle.status = status;
      if (notes) vehicle.notes = notes;
      vehicle.statusUpdated = new Date().toISOString();
      this.saveDatabase();
      return true;
    }
    return false;
  }

  // 获取今日新增车辆
  getNewVehiclesToday() {
    const today = new Date().toISOString().split('T')[0];
    return this.vehicles.vehicles.filter(v => 
      v.firstSeen.startsWith(today) && v.status === 'new'
    );
  }

  // 获取有更新的车辆
  getUpdatedVehicles(days = 1) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    
    return this.vehicles.vehicles.filter(v => {
      if (!v.changes || v.changes.length === 0) return false;
      const lastChange = v.changes[v.changes.length - 1];
      return new Date(lastChange.date) > cutoff;
    });
  }

  // 获取活跃车辆 (未下架)
  getActiveVehicles() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    return this.vehicles.vehicles.filter(v => {
      // 30天内_seen过且不是sold/removed状态
      return new Date(v.lastSeen) > thirtyDaysAgo && 
             !['sold', 'removed', 'expired'].includes(v.status);
    });
  }

  // 标记过期车辆
  markExpiredVehicles() {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    let count = 0;
    this.vehicles.vehicles.forEach(v => {
      if (new Date(v.lastSeen) < sevenDaysAgo && v.status === 'new') {
        v.status = 'expired';
        count++;
      }
    });
    
    if (count > 0) {
      this.saveDatabase();
      console.log(`标记了 ${count} 辆过期车辆`);
    }
    return count;
  }

  // 生成每日增量报告
  generateDailyReport() {
    const today = new Date().toISOString().split('T')[0];
    
    const newVehicles = this.getNewVehiclesToday();
    const updatedVehicles = this.getUpdatedVehicles(1);
    const activeVehicles = this.getActiveVehicles();
    
    const report = {
      date: today,
      summary: {
        new: newVehicles.length,
        updated: updatedVehicles.length,
        active: activeVehicles.length,
        total: this.vehicles.vehicles.length
      },
      newVehicles: newVehicles.sort((a, b) => b.priority - a.priority),
      updatedVehicles: updatedVehicles,
      topPicks: activeVehicles
        .filter(v => v.priority >= 5)
        .sort((a, b) => b.priority - a.priority)
        .slice(0, 5)
    };
    
    // 保存报告
    const reportFile = path.join(this.historyDir, `report_${today}.json`);
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    
    return report;
  }

  // 获取统计信息
  getStats() {
    const statuses = {};
    this.vehicles.vehicles.forEach(v => {
      statuses[v.status] = (statuses[v.status] || 0) + 1;
    });
    
    return {
      total: this.vehicles.vehicles.length,
      statuses,
      lastUpdate: this.vehicles.lastUpdate
    };
  }

  // 清理旧数据 (保留90天)
  cleanupOldData() {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    const beforeCount = this.vehicles.vehicles.length;
    
    this.vehicles.vehicles = this.vehicles.vehicles.filter(v => {
      // 保留已购买或标记的车辆
      if (['purchased', 'contacted', 'watching'].includes(v.status)) {
        return true;
      }
      // 删除90天未见的过期车辆
      return new Date(v.lastSeen) > ninetyDaysAgo;
    });
    
    const removed = beforeCount - this.vehicles.vehicles.length;
    if (removed > 0) {
      this.saveDatabase();
      console.log(`清理了 ${removed} 辆旧车辆数据`);
    }
    return removed;
  }
}

module.exports = VehicleDatabase;
