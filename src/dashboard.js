#!/usr/bin/env node
/**
 * Car Scout - 主控制面板
 * 一站式管理所有功能
 */

const VehicleDatabase = require('./vehicle-database');
const VehicleWorkflowManager = require('./vehicle-workflow-manager');
const VisualReportGenerator = require('./visual-report-generator');
const fs = require('fs');
const path = require('path');

class CarScoutDashboard {
  constructor() {
    this.db = new VehicleDatabase();
    this.workflow = new VehicleWorkflowManager();
    this.visual = new VisualReportGenerator();
  }

  async run() {
    const args = process.argv.slice(2);
    const command = args[0];

    switch (command) {
      case 'scrape':
        await this.runScraper();
        break;
      case 'report':
        await this.generateReport();
        break;
      case 'dashboard':
        await this.openDashboard();
        break;
      case 'list':
        await this.listVehicles(args);
        break;
      case 'view':
        await this.viewVehicle(args[1]);
        break;
      case 'advance':
        await this.advanceVehicle(args[1], args[2], args[3]);
        break;
      case 'todos':
        await this.showTodos();
        break;
      case 'feishu':
        await this.generateFeishuTemplate();
        break;
      case 'setup':
        await this.setupSystem();
        break;
      case 'help':
      default:
        this.showHelp();
    }
  }

  showHelp() {
    console.log(`
🚗 Car Scout 主控制面板

用法: npm run scout [命令] [选项]

主要命令:
  scrape                    运行Facebook抓取
  report                    生成今日报告
  dashboard                 打开可视化看板
  todos                     显示今日待办
  
车辆管理:
  list                      列出所有车辆
  list --today              只显示今日新增
  list --status=XXX         按状态筛选
  view [ID]                 查看车辆详情
  advance [ID] [阶段]       推进车辆到下一阶段
  
飞书集成:
  feishu                    生成飞书导入模板
  setup                     初始化系统配置

阶段列表:
  new         → 📥 新发现
  contacted   → 📞 已联系
  viewing     → 📅 预约看车
  inspecting  → 🔍 车检中
  negotiating → 💰 议价中
  purchased   → ✅ 已购买
  cleaning    → 🧹 清理中
  reselling   → 🔄 已上架
  sold        → 🏁 已售出
  abandoned   → ❌ 已放弃

示例:
  npm run scout scrape
  npm run scout report
  npm run scout list --today
  npm run scout view fb_123456789
  npm run scout advance fb_123456789 contacted
`);
  }

  async runScraper() {
    console.log('🚀 启动Facebook抓取器...\n');
    const FacebookScraperWithDB = require('./facebook-scraper-v4');
    const scraper = new FacebookScraperWithDB();
    await scraper.run();
  }

  async generateReport() {
    console.log('📊 生成完整报告...\n');
    const report = await this.workflow.generateFullReport();
    
    console.log('✅ 报告生成完成！');
    console.log(`\n📁 文件位置:`);
    console.log(`   可视化看板: ${report.dashboardPath}`);
    console.log(`   飞书导入: ${report.importPath}`);
    console.log(`   今日待办: ${report.todoPath}`);
    console.log(`\n📈 统计信息:`);
    console.log(`   数据库总车辆: ${report.stats.total}`);
    console.log(`   活跃车辆: ${report.stats.active}`);
    console.log(`   今日待办: ${report.stats.todos}`);
  }

  async openDashboard() {
    const report = await this.workflow.generateFullReport();
    console.log(`\n🌐 可视化看板已生成: ${report.dashboardPath}`);
    console.log('请用浏览器打开查看\n');
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
      console.log(`\n📋 状态"${status}"的车辆 (${vehicles.length}辆)\n`);
    } else {
      vehicles = this.db.getActiveVehicles();
      console.log(`\n✅ 活跃车辆 (${vehicles.length}辆)\n`);
    }
    
    if (vehicles.length === 0) {
      console.log('暂无车辆\n');
      return;
    }
    
    vehicles.sort((a, b) => b.priority - a.priority);
    
    console.log('ID                          | 年份 | 价格    | 里程   | 优先级 | 状态');
    console.log('----------------------------|------|---------|--------|--------|------');
    
    vehicles.slice(0, 20).forEach(v => {
      const id = v.id.substring(0, 25).padEnd(27);
      const price = `$${v.price.toLocaleString()}`.padEnd(7);
      const mileage = v.mileage ? `${(v.mileage/1000).toFixed(0)}k km`.padEnd(6) : '?'.padEnd(6);
      console.log(`${id}| ${v.year} | ${price} | ${mileage} | ${v.priority}      | ${v.status}`);
    });
    console.log();
  }

  async viewVehicle(id) {
    if (!id) {
      console.log('❌ 请提供车辆ID\n');
      return;
    }
    
    const profile = this.workflow.getVehicleProfile(id);
    
    if (!profile) {
      console.log(`❌ 未找到车辆: ${id}\n`);
      return;
    }
    
    console.log(`\n🚗 车辆详情\n`);
    console.log(`ID: ${profile.basic.id}`);
    console.log(`标题: ${profile.basic.title}`);
    console.log(`年份: ${profile.basic.year}`);
    console.log(`价格: $${profile.basic.price.toLocaleString()}`);
    console.log(`里程: ${profile.basic.mileage.toLocaleString()} km`);
    console.log(`位置: ${profile.basic.location}`);
    
    if (profile.financial.purchasePrice) {
      console.log(`\n💰 财务信息:`);
      console.log(`  购买价格: $${profile.financial.purchasePrice.toLocaleString()}`);
      console.log(`  总成本: $${profile.financial.totalCost.toLocaleString()}`);
      if (profile.financial.suggestedResalePrice) {
        console.log(`  建议售价: $${profile.financial.suggestedResalePrice.toLocaleString()}`);
        console.log(`  预期利润: $${profile.financial.expectedProfit.toLocaleString()}`);
      }
    }
    
    if (profile.timeline.length > 0) {
      console.log(`\n📈 流程历史:`);
      profile.timeline.forEach(t => {
        console.log(`  ${new Date(t.date).toLocaleDateString()}: ${t.from} → ${t.to}`);
        if (t.notes) console.log(`    备注: ${t.notes}`);
      });
    }
    
    console.log(`\n📄 相关文档:`);
    console.log(`  看车清单: ${fs.existsSync(profile.documents.checklist) ? '✅' : '❌'}`);
    console.log(`  车检报告: ${fs.existsSync(profile.documents.inspection) ? '✅' : '❌'}`);
    console.log(`  清理清单: ${fs.existsSync(profile.documents.cleaning) ? '✅' : '❌'}`);
    console.log();
  }

  async advanceVehicle(id, stage, notes) {
    if (!id || !stage) {
      console.log('❌ 用法: advance [车辆ID] [阶段] [备注(可选)]\n');
      return;
    }
    
    const result = await this.workflow.advanceVehicle(id, stage, notes);
    
    if (result.success) {
      console.log(`✅ ${result.message}\n`);
    } else {
      console.log(`❌ ${result.error}\n`);
      if (result.availableNext) {
        console.log(`可选下一阶段: ${result.availableNext.join(', ')}\n`);
      }
    }
  }

  async showTodos() {
    const todos = this.workflow.getTodayTodos();
    
    if (todos.length === 0) {
      console.log('\n✅ 今日暂无待办事项\n');
      return;
    }
    
    console.log(`\n📋 今日待办 (${todos.length}项)\n`);
    
    const high = todos.filter(t => t.urgency === 'high');
    const medium = todos.filter(t => t.urgency === 'medium');
    
    if (high.length > 0) {
      console.log('🔴 高优先级:\n');
      high.forEach((todo, i) => {
        console.log(`${i + 1}. ${todo.vehicle.year} ${todo.vehicle.title.substring(0, 30)}`);
        console.log(`   🎯 ${todo.action} (${todo.reason})`);
        console.log(`   💰 $${todo.vehicle.price.toLocaleString()}`);
        if (todo.time) console.log(`   ⏰ ${todo.time}`);
        console.log();
      });
    }
    
    if (medium.length > 0) {
      console.log('🟡 中优先级:\n');
      medium.forEach((todo, i) => {
        console.log(`${i + 1}. ${todo.vehicle.title.substring(0, 40)}`);
        console.log(`   🎯 ${todo.action}\n`);
      });
    }
  }

  async generateFeishuTemplate() {
    console.log('📤 生成飞书导入模板...\n');
    const FeishuTableIntegration = require('./feishu-table-integration');
    const feishu = new FeishuTableIntegration();
    
    const config = feishu.generateTableConfig();
    console.log('✅ 飞书表格配置已生成');
    console.log(`📁 配置位置: config/feishu-table.json\n`);
    console.log('请按以下步骤操作:');
    console.log('1. 在飞书多维表格创建新表格');
    console.log('2. 按配置文件设置字段');
    console.log('3. 运行 "npm run scout report" 生成导入文件');
    console.log('4. 导入到飞书表格\n');
  }

  async setupSystem() {
    console.log('🔧 初始化Car Scout系统...\n');
    
    // 创建必要的目录
    const dirs = [
      'database',
      'workflow',
      'reports/visual',
      'exports',
      'templates'
    ];
    
    dirs.forEach(dir => {
      const fullPath = path.join(__dirname, '..', dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
        console.log(`✅ 创建目录: ${dir}`);
      }
    });
    
    // 初始化数据库
    const db = new VehicleDatabase();
    console.log(`✅ 数据库初始化完成 (${db.vehicles.vehicles.length} 辆车辆)\n`);
    
    console.log('系统准备就绪！\n');
    console.log('下一步:');
    console.log('  npm run scout scrape    - 开始抓取');
    console.log('  npm run scout report    - 生成报告\n');
  }
}

// 运行
const dashboard = new CarScoutDashboard();
dashboard.run().catch(err => {
  console.error('错误:', err.message);
  process.exit(1);
});
