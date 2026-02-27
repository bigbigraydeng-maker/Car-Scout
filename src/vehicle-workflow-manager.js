/**
 * Car Scout - 车辆全流程管理器
 * 管理从发现到重新上架的完整生命周期，支持多车并行
 */

const VehicleDatabase = require('./vehicle-database');
const FeishuTableIntegration = require('./feishu-table-integration');
const VisualReportGenerator = require('./visual-report-generator');
const fs = require('fs');
const path = require('path');

class VehicleWorkflowManager {
  constructor() {
    this.db = new VehicleDatabase();
    this.feishu = new FeishuTableIntegration();
    this.visualReport = new VisualReportGenerator();
    this.workflowDir = path.join(__dirname, '..', 'workflow');
    
    if (!fs.existsSync(this.workflowDir)) {
      fs.mkdirSync(this.workflowDir, { recursive: true });
    }
  }

  // 车辆生命周期状态流转
  getWorkflowStages() {
    return [
      { id: 'new', name: '📥 新发现', next: ['contacted', 'abandoned'] },
      { id: 'contacted', name: '📞 已联系', next: ['viewing', 'negotiating', 'abandoned'] },
      { id: 'viewing', name: '📅 预约看车', next: ['inspecting', 'negotiating', 'abandoned'] },
      { id: 'inspecting', name: '🔍 车检中', next: ['negotiating', 'abandoned'] },
      { id: 'negotiating', name: '💰 议价中', next: ['purchased', 'abandoned'] },
      { id: 'purchased', name: '✅ 已购买', next: ['cleaning'] },
      { id: 'cleaning', name: '🧹 清理中', next: ['reselling'] },
      { id: 'reselling', name: '🔄 已上架', next: ['sold'] },
      { id: 'sold', name: '🏁 已售出', next: [] },
      { id: 'abandoned', name: '❌ 已放弃', next: [] }
    ];
  }

  // 推进车辆到下一阶段
  async advanceVehicle(vehicleId, toStage, notes = '') {
    const vehicle = this.db.vehicles.vehicles.find(v => v.id === vehicleId);
    if (!vehicle) {
      return { success: false, error: '车辆不存在' };
    }

    const currentStage = vehicle.status;
    const workflow = this.getWorkflowStages();
    const currentStageInfo = workflow.find(s => s.id === currentStage);
    
    if (!currentStageInfo.next.includes(toStage)) {
      return { 
        success: false, 
        error: `无法从 ${currentStageInfo.name} 直接跳到该阶段`,
        availableNext: currentStageInfo.next
      };
    }

    // 更新状态
    const oldStatus = vehicle.status;
    vehicle.status = toStage;
    vehicle.statusUpdated = new Date().toISOString();
    
    // 记录阶段历史
    if (!vehicle.workflowHistory) vehicle.workflowHistory = [];
    vehicle.workflowHistory.push({
      from: oldStatus,
      to: toStage,
      date: new Date().toISOString(),
      notes: notes
    });

    // 阶段特定处理
    await this.handleStageTransition(vehicle, toStage, notes);
    
    this.db.saveDatabase();
    
    return { 
      success: true, 
      vehicle,
      message: `车辆已推进到: ${workflow.find(s => s.id === toStage).name}`
    };
  }

  // 处理阶段转换
  async handleStageTransition(vehicle, stage, notes) {
    const stageHandlers = {
      'viewing': () => {
        // 生成看车清单
        const checklist = this.feishu.generateInspectionChecklist(vehicle);
        const checklistPath = path.join(this.workflowDir, `checklist_${vehicle.id}.md`);
        fs.writeFileSync(checklistPath, checklist);
        console.log(`   📋 看车清单已生成: ${checklistPath}`);
      },
      
      'inspecting': () => {
        // 生成车检报告模板
        const report = this.feishu.generateInspectionReport(vehicle);
        const reportPath = path.join(this.workflowDir, `inspection_${vehicle.id}.md`);
        fs.writeFileSync(reportPath, report);
        console.log(`   🔧 车检报告模板已生成: ${reportPath}`);
      },
      
      'purchased': () => {
        // 计算成本
        vehicle.purchasePrice = vehicle.price;
        vehicle.purchaseDate = new Date().toISOString();
        console.log(`   💰 记录购买价格: $${vehicle.purchasePrice}`);
      },
      
      'cleaning': () => {
        // 生成清理清单
        const cleaningList = this.generateCleaningList(vehicle);
        const cleaningPath = path.join(this.workflowDir, `cleaning_${vehicle.id}.md`);
        fs.writeFileSync(cleaningPath, cleaningList);
        console.log(`   🧹 清理清单已生成: ${cleaningPath}`);
      },
      
      'reselling': () => {
        // 建议售价
        const suggestedPrice = this.calculateResalePrice(vehicle);
        vehicle.suggestedResalePrice = suggestedPrice;
        console.log(`   💡 建议售价: $${suggestedPrice.toLocaleString()}`);
      }
    };

    if (stageHandlers[stage]) {
      stageHandlers[stage]();
    }
  }

  // 生成清理清单
  generateCleaningList(vehicle) {
    return `
# 🧹 车辆清理清单 | ${vehicle.year} ${vehicle.title}

## 📋 外观清理
- [ ] 车身清洗（外洗+内洗）
- [ ] 轮毂清洁
- [ ] 玻璃清洁
- [ ] 发动机舱清洁

## 🔧 机械整备
- [ ] 机油更换
- [ ] 机油滤芯更换
- [ ] 空气滤芯清洁/更换
- [ ] 空调滤芯清洁/更换
- [ ] 轮胎气压检查
- [ ] 刹车片检查

## 🎨 美容修复
- [ ] 划痕抛光
- [ ] 内饰清洁
- [ ] 座椅保养
- [ ] 异味处理

## 📸 拍照准备
- [ ] 外观多角度照片 (6张)
- [ ] 内饰照片 (4张)
- [ ] 发动机舱照片 (2张)
- [ ] 轮胎/底盘照片 (2张)
- [ ] 瑕疵部位照片

## 💰 成本记录
| 项目 | 费用 |
|------|------|
| 清洗费用 | $____ |
| 保养费用 | $____ |
| 维修费用 | $____ |
| 美容费用 | $____ |
| **总计** | $____ |

## 📝 整备备注
${vehicle.cleaningNotes || ''}

---
**预计完成**: _______________
**实际完成**: _______________
`;
  }

  // 计算建议售价
  calculateResalePrice(vehicle) {
    const purchasePrice = vehicle.purchasePrice || vehicle.price;
    const cleaningCost = vehicle.cleaningCost || 500;
    const repairCost = vehicle.repairCost || 0;
    const targetMargin = 0.20; // 20%利润率
    
    const totalCost = purchasePrice + cleaningCost + repairCost;
    const suggestedPrice = Math.ceil(totalCost * (1 + targetMargin) / 100) * 100;
    
    return suggestedPrice;
  }

  // 获取今日待办事项
  getTodayTodos() {
    const todos = [];
    const vehicles = this.db.getActiveVehicles();
    
    vehicles.forEach(v => {
      // 新发现且高优先级 - 建议今天联系
      if (v.status === 'new' && v.priority >= 6) {
        todos.push({
          vehicle: v,
          action: '联系卖家',
          urgency: 'high',
          reason: '高优先级新车辆'
        });
      }
      
      // 已预约看车 - 检查时间
      if (v.status === 'viewing' && v.viewingDate) {
        const viewingDate = new Date(v.viewingDate);
        const today = new Date();
        if (viewingDate.toDateString() === today.toDateString()) {
          todos.push({
            vehicle: v,
            action: '前往看车',
            urgency: 'high',
            reason: '今日预约',
            time: viewingDate.toLocaleTimeString()
          });
        }
      }
      
      // 车检完成待议价
      if (v.status === 'inspecting' && v.inspectionPassed) {
        todos.push({
          vehicle: v,
          action: '开始议价',
          urgency: 'medium',
          reason: '车检通过'
        });
      }
      
      // 购买后待清理
      if (v.status === 'purchased' && !v.cleaningStarted) {
        todos.push({
          vehicle: v,
          action: '开始清理',
          urgency: 'medium',
          reason: '待整备'
        });
      }
      
      // 清理完成待上架
      if (v.status === 'cleaning' && v.cleaningCompleted) {
        todos.push({
          vehicle: v,
          action: '拍照上架',
          urgency: 'medium',
          reason: '整备完成'
        });
      }
    });
    
    return todos.sort((a, b) => {
      const urgencyOrder = { high: 0, medium: 1, low: 2 };
      return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    });
  }

  // 生成完整的可视化报告
  async generateFullReport() {
    const stats = this.db.getStats();
    const vehicles = this.db.getActiveVehicles();
    const todos = this.getTodayTodos();
    
    // 生成HTML看板
    const dashboardPath = this.visualReport.generateDashboard(vehicles, stats);
    
    // 生成飞书导入文件
    const importPath = this.feishu.generateImportTemplate(vehicles);
    
    // 生成今日待办清单
    const todoPath = this.generateTodoList(todos);
    
    return {
      dashboardPath,
      importPath,
      todoPath,
      stats: {
        total: stats.total,
        active: vehicles.length,
        todos: todos.length
      }
    };
  }

  // 生成待办清单
  generateTodoList(todos) {
    const today = new Date().toISOString().split('T')[0];
    const todoPath = path.join(this.workflowDir, `todos_${today}.md`);
    
    let md = `# 📋 今日待办清单 | ${today}\n\n`;
    md += `**共 ${todos.length} 项待办**\n\n`;
    
    if (todos.length === 0) {
      md += `✅ 今日暂无待办事项，可以休息一下！\n`;
    } else {
      const highPriority = todos.filter(t => t.urgency === 'high');
      const mediumPriority = todos.filter(t => t.urgency === 'medium');
      
      if (highPriority.length > 0) {
        md += `## 🔴 高优先级 (${highPriority.length}项)\n\n`;
        highPriority.forEach((todo, i) => {
          md += `${i + 1}. **${todo.vehicle.year} ${todo.vehicle.title.substring(0, 30)}**\n`;
          md += `   - 📍 ${todo.vehicle.location || '位置待定'}\n`;
          md += `   - 💰 $${todo.vehicle.price.toLocaleString()}\n`;
          md += `   - 🎯 ${todo.action} (${todo.reason})\n`;
          if (todo.time) md += `   - ⏰ ${todo.time}\n`;
          md += `   - 🔗 [查看详情](${todo.vehicle.url})\n\n`;
        });
      }
      
      if (mediumPriority.length > 0) {
        md += `## 🟡 中优先级 (${mediumPriority.length}项)\n\n`;
        mediumPriority.forEach((todo, i) => {
          md += `${i + 1}. **${todo.vehicle.year} ${todo.vehicle.title.substring(0, 30)}**\n`;
          md += `   - 🎯 ${todo.action} (${todo.reason})\n\n`;
        });
      }
    }
    
    fs.writeFileSync(todoPath, md);
    return todoPath;
  }

  // 批量操作 - 推进多辆车
  async batchAdvance(vehicleIds, toStage, notes = '') {
    const results = [];
    
    for (const id of vehicleIds) {
      const result = await this.advanceVehicle(id, toStage, notes);
      results.push({ id, ...result });
    }
    
    return results;
  }

  // 获取车辆完整档案
  getVehicleProfile(vehicleId) {
    const vehicle = this.db.vehicles.vehicles.find(v => v.id === vehicleId);
    if (!vehicle) return null;
    
    return {
      basic: {
        id: vehicle.id,
        title: vehicle.title,
        year: vehicle.year,
        price: vehicle.price,
        mileage: vehicle.mileage,
        location: vehicle.location
      },
      financial: {
        purchasePrice: vehicle.purchasePrice,
        cleaningCost: vehicle.cleaningCost,
        repairCost: vehicle.repairCost,
        totalCost: (vehicle.purchasePrice || 0) + (vehicle.cleaningCost || 0) + (vehicle.repairCost || 0),
        suggestedResalePrice: vehicle.suggestedResalePrice,
        expectedProfit: (vehicle.suggestedResalePrice || 0) - ((vehicle.purchasePrice || 0) + (vehicle.cleaningCost || 0) + (vehicle.repairCost || 0))
      },
      timeline: vehicle.workflowHistory || [],
      documents: {
        checklist: path.join(this.workflowDir, `checklist_${vehicle.id}.md`),
        inspection: path.join(this.workflowDir, `inspection_${vehicle.id}.md`),
        cleaning: path.join(this.workflowDir, `cleaning_${vehicle.id}.md`)
      }
    };
  }
}

module.exports = VehicleWorkflowManager;
