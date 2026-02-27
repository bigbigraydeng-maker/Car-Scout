/**
 * Car Scout - 飞书多维表格集成模块
 * 用于可视化管理和车辆全生命周期追踪
 */

const fs = require('fs');
const path = require('path');

class FeishuTableIntegration {
  constructor() {
    this.configPath = path.join(__dirname, '..', 'config', 'feishu-table.json');
    this.templatePath = path.join(__dirname, '..', 'templates', 'vehicle-workflow.json');
    this.ensureDirectories();
  }

  ensureDirectories() {
    const dirs = [
      path.join(__dirname, '..', 'config'),
      path.join(__dirname, '..', 'templates'),
      path.join(__dirname, '..', 'exports')
    ];
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });
  }

  // 生成飞书多维表格配置
  generateTableConfig() {
    const config = {
      tableName: "Car Scout 车辆管理",
      description: "二手车收购全流程管理系统",
      fields: [
        // 基础信息
        { fieldName: "车辆ID", type: "text", primary: true },
        { fieldName: "标题", type: "text" },
        { fieldName: "年份", type: "number" },
        { fieldName: "品牌", type: "singleSelect", options: ["Toyota", "Honda", "Mazda", "其他"] },
        { fieldName: "车型", type: "singleSelect", options: ["Corolla", "Vitz", "RAV4", "Yaris", "其他"] },
        { fieldName: "价格", type: "currency", currency: "NZD" },
        { fieldName: "里程", type: "number", unit: "km" },
        { fieldName: "位置", type: "text" },
        { fieldName: "卖家链接", type: "url" },
        { fieldName: "Facebook链接", type: "url" },
        
        // 评分与优先级
        { fieldName: "优先级", type: "singleSelect", 
          options: [
            { name: "🔴 极高", color: "#FF4D4F" },
            { name: "🟠 高", color: "#FF7A45" },
            { name: "🟡 中", color: "#FFC53D" },
            { name: "🟢 低", color: "#73D13D" }
          ]
        },
        { fieldName: "收购评分", type: "number", min: 0, max: 100 },
        { fieldName: "预估利润", type: "currency", currency: "NZD" },
        
        // 生命周期状态
        { fieldName: "当前阶段", type: "singleSelect",
          options: [
            { name: "📥 新发现", color: "#1890FF" },
            { name: "📞 已联系", color: "#722ED1" },
            { name: "📅 预约看车", color: "#EB2F96" },
            { name: "🔍 车检中", color: "#FA8C16" },
            { name: "💰 议价中", color: "#FAAD14" },
            { name: "✅ 已购买", color: "#52C41A" },
            { name: "🧹 清理中", color: "#13C2C2" },
            { name: "📸 拍照上架", color: "#2F54EB" },
            { name: "🔄 已重新上架", color: "#52C41A" },
            { name: "❌ 放弃", color: "#F5222D" },
            { name: "🏁 已完成", color: "#8C8C8C" }
          ]
        },
        
        // 看车记录
        { fieldName: "预约看车时间", type: "dateTime" },
        { fieldName: "看车地址", type: "text" },
        { fieldName: "看车备注", type: "multilineText" },
        { fieldName: "车况评估", type: "multilineText" },
        { fieldName: "问题清单", type: "multilineText" },
        
        // 车检记录
        { fieldName: "车检日期", type: "date" },
        { fieldName: "车检地点", type: "text" },
        { fieldName: "车检报告", type: "attachment" },
        { fieldName: "需要维修", type: "multilineText" },
        { fieldName: "维修预算", type: "currency", currency: "NZD" },
        { fieldName: "车检通过", type: "checkbox" },
        
        // 购买记录
        { fieldName: "成交价", type: "currency", currency: "NZD" },
        { fieldName: "购买日期", type: "date" },
        { fieldName: "卖家联系方式", type: "text" },
        { fieldName: "交易备注", type: "multilineText" },
        { fieldName: "付款凭证", type: "attachment" },
        
        // 清理和整备
        { fieldName: "清理项目", type: "multilineText" },
        { fieldName: "清理费用", type: "currency", currency: "NZD" },
        { fieldName: "整备完成日期", type: "date" },
        { fieldName: "整备后照片", type: "attachment" },
        
        // 重新上架
        { fieldName: "上架价格", type: "currency", currency: "NZD" },
        { fieldName: "上架日期", type: "date" },
        { fieldName: "销售平台", type: "multipleSelect", 
          options: ["TradeMe", "Facebook", "Skykiwi", "其他"] 
        },
        { fieldName: "销售状态", type: "singleSelect",
          options: ["出售中", "已预定", "已售出"] 
        },
        { fieldName: "最终售价", type: "currency", currency: "NZD" },
        
        // 财务统计
        { fieldName: "总成本", type: "formula", formula: "成交价+维修预算+清理费用" },
        { fieldName: "实际利润", type: "formula", formula: "最终售价-总成本" },
        { fieldName: "利润率", type: "formula", formula: "实际利润/总成本" },
        
        // 时间追踪
        { fieldName: "首次发现", type: "dateTime" },
        { fieldName: "最后更新", type: "dateTime" },
        { fieldName: "预计完成", type: "date" },
        
        // 标签和分类
        { fieldName: "标签", type: "multipleSelect",
          options: ["急售", "可议价", "车况好", "需要整备", "高性价比", "留作自用"] 
        },
        { fieldName: "负责人", type: "user" }
      ],
      
      views: [
        {
          name: "🎯 今日待办",
          type: "gallery",
          filters: [
            { field: "当前阶段", operator: "isAnyOf", values: ["📞 已联系", "📅 预约看车", "🔍 车检中", "💰 议价中"] }
          ],
          sorts: [{ field: "优先级", order: "desc" }]
        },
        {
          name: "📊 看车日程",
          type: "calendar",
          dateField: "预约看车时间"
        },
        {
          name: "💰 财务看板",
          type: "kanban",
          groupField: "当前阶段",
          showFields: ["价格", "预估利润", "总成本", "实际利润"]
        },
        {
          name: "📈 数据分析",
          type: "dashboard",
          charts: [
            { type: "pie", field: "当前阶段", title: "车辆分布" },
            { type: "bar", field: "月份", valueField: "实际利润", title: "月度利润" },
            { type: "line", field: "日期", valueField: "累计利润", title: "累计利润趋势" }
          ]
        }
      ]
    };
    
    fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
    return config;
  }

  // 生成车辆导入模板
  generateImportTemplate(vehicles) {
    const template = vehicles.map(v => ({
      "车辆ID": v.id,
      "标题": v.title,
      "年份": v.year,
      "品牌": v.searchBrand || "Toyota",
      "车型": v.searchModel || "Unknown",
      "价格": v.price,
      "里程": v.mileage,
      "位置": v.location || v.searchLocation,
      "Facebook链接": v.url,
      "优先级": this.getPriorityLabel(v.priority),
      "收购评分": v.priority * 10,
      "当前阶段": "📥 新发现",
      "首次发现": v.firstSeen,
      "最后更新": v.lastSeen,
      "标签": v.priority >= 6 ? "高性价比" : ""
    }));
    
    const exportPath = path.join(__dirname, '..', 'exports', `import_${new Date().toISOString().split('T')[0]}.json`);
    fs.writeFileSync(exportPath, JSON.stringify(template, null, 2));
    return exportPath;
  }

  getPriorityLabel(score) {
    if (score >= 7) return "🔴 极高";
    if (score >= 5) return "🟠 高";
    if (score >= 3) return "🟡 中";
    return "🟢 低";
  }

  // 生成Markdown格式的看车清单
  generateInspectionChecklist(vehicle) {
    return `
# 🔍 看车检查清单 | ${vehicle.year} ${vehicle.title}

## 📋 基础信息
- **车辆ID**: ${vehicle.id}
- **价格**: $${vehicle.price.toLocaleString()}
- **里程**: ${vehicle.mileage.toLocaleString()} km
- **位置**: ${vehicle.location}
- **预约时间**: _______________

## ✅ 外观检查
- [ ] 车身划痕、凹陷
- [ ] 油漆色差（事故痕迹）
- [ ] 轮胎磨损程度
- [ ] 玻璃裂纹
- [ ] 灯光功能

## ✅ 内饰检查  
- [ ] 座椅磨损
- [ ] 仪表盘故障灯
- [ ] 空调冷暖
- [ ] 音响/导航
- [ ] 异味（水淹/烟味）

## ✅ 机械检查
- [ ] 发动机启动
- [ ] 怠速稳定性
- [ ] 变速箱换挡
- [ ] 转向手感
- [ ] 刹车性能
- [ ] 底盘异响

## ✅ 文件检查
- [ ] WOF有效期
- [ ] 路税Reg
- [ ] 保养记录
- [ ] 车主手册

## 📝 看车备注
${vehicle.viewingNotes || ''}

## 💰 议价空间
- 心理价位: $__________
- 最高出价: $__________

---
**检查日期**: _______________
**检查人**: _______________
`;
  }

  // 生成车检报告模板
  generateInspectionReport(vehicle) {
    return `
# 🔧 专业车检报告 | ${vehicle.year} ${vehicle.title}

## 📊 车辆概况
| 项目 | 状态 |
|------|------|
| 发动机 | ⬜ 优 / ⬜ 良 / ⬜ 差 |
| 变速箱 | ⬜ 优 / ⬜ 良 / ⬜ 差 |
| 底盘 | ⬜ 优 / ⬜ 良 / ⬜ 差 |
| 电气系统 | ⬜ 优 / ⬜ 良 / ⬜ 差 |

## ⚠️ 发现问题
1. _________________________________
2. _________________________________
3. _________________________________

## 🔧 建议维修
| 项目 | 预估费用 |
|------|---------|
| | $ |
| | $ |
| | $ |
| **总计** | $ |

## 📈 车检结论
⬜ 建议购买  ⬜ 谨慎购买  ⬜ 不建议

## 💡 最终建议
${vehicle.inspectionRecommendation || ''}

---
**车检日期**: _______________
**检测机构**: _______________
**检测师**: _______________
`;
  }
}

module.exports = FeishuTableIntegration;
