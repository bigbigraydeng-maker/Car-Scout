/**
 * Car Scout - Report Generator v2.0
 * 生成每日车辆报告
 * 合并了历史项目的报告风格
 */

const fs = require('fs');
const path = require('path');
const CarScoringModel = require('./scoring');

class ReportGenerator {
  constructor() {
    this.scoringModel = new CarScoringModel();
    this.dataDir = path.join(__dirname, '..', 'data');
    this.reportsDir = path.join(__dirname, '..', 'reports', 'daily');
  }

  /**
   * 生成每日报告
   */
  async generateDailyReport(dataFile) {
    console.log('📊 生成每日报告...\n');
    
    // 读取数据
    const rawData = fs.readFileSync(dataFile, 'utf8');
    const data = JSON.parse(rawData);
    
    // 评分所有车辆
    const scoredVehicles = data.vehicles.map(vehicle => {
      const scoring = this.scoringModel.scoreVehicle(vehicle);
      return {
        ...vehicle,
        scoring
      };
    });
    
    // 按评分排序
    scoredVehicles.sort((a, b) => b.scoring.totalScore - a.scoring.totalScore);
    
    // 筛选可投资车辆 (评分75+)
    const investableVehicles = scoredVehicles.filter(v => v.scoring.totalScore >= 75);
    
    // 生成报告
    const report = {
      date: data.scrapeDate,
      totalVehicles: scoredVehicles.length,
      investableCount: investableVehicles.length,
      topVehicles: scoredVehicles.slice(0, 5),
      investableVehicles: investableVehicles,
      allVehicles: scoredVehicles,
      generatedAt: new Date().toISOString()
    };
    
    // 保存JSON报告
    const reportFile = path.join(this.dataDir, `report_${data.scrapeDate}.json`);
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    
    // 生成Markdown报告（增强版）
    const mdReport = this.generateMarkdownReport(report);
    const mdFile = path.join(this.reportsDir, `report_${data.scrapeDate}.md`);
    fs.writeFileSync(mdFile, mdReport);
    
    // 生成文本报告
    const textReport = this.generateTextReport(report);
    const textFile = path.join(this.dataDir, `report_${data.scrapeDate}.txt`);
    fs.writeFileSync(textFile, textReport);
    
    console.log('✅ 报告生成完成!');
    console.log(`📄 JSON报告: ${reportFile}`);
    console.log(`📝 Markdown报告: ${mdFile}`);
    console.log(`📝 文本报告: ${textFile}`);
    
    return { 
      report, 
      textReport,
      mdReport,
      reportFile, 
      textFile,
      mdFile
    };
  }

  /**
   * 生成Markdown格式报告（来自历史项目风格）
   */
  generateMarkdownReport(report) {
    const date = report.date;
    const topDeals = report.topVehicles;
    const investableCount = report.investableCount;
    
    let md = `# 🚗 Car Scout - Toyota二手车寻宝报告

**日期**: ${date}  
**搜索范围**: Auckland & Waikato  
**预算区间**: $2,000 - $5,000 NZD  
**目标车型**: Toyota Corolla / Vitz / RAV4  
**年份要求**: 2002+

---

## 📊 今日概览

- **分析车辆总数**: ${report.totalVehicles} 辆
- **优质车辆数量**: ${investableCount} 辆 (评分75+)
- **推荐关注**: TOP ${Math.min(topDeals.length, 5)} 辆

---

## ⭐ TOP ${Math.min(topDeals.length, 5)} 推荐车辆

`;

    topDeals.forEach((vehicle, index) => {
      const s = vehicle.scoring;
      const p = s.pricing;
      const pa = s.profitAnalysis;
      
      const priorityTag = s.isGoodDeal ? '🔥 ' : '';
      const riskEmoji = s.riskLevel === '低' ? '🟢' : s.riskLevel === '中' ? '🟡' : '🔴';
      
      md += `### ${index + 1}. ${priorityTag}${vehicle.title}

**基本信息**:
- **地区**: ${vehicle.searchLocation}
- **年份**: ${vehicle.year || '未知'}
- **公里数**: ${vehicle.mileage ? vehicle.mileage.toLocaleString() + ' km' : '未知'}

**价格分析**:
- **挂牌价**: $${vehicle.price?.toLocaleString() || '未知'}
- **预估市场价**: $${p?.marketPrice?.toLocaleString() || '未知'}
- **预估利润**: $${pa?.estimatedProfit?.toLocaleString() || '未知'} (${pa?.profitMarginPercent || 0}%)
- **流动性**: ${pa?.liquidity || 'Unknown'}

**采购建议**:
- **建议采购价**: $${p?.idealPurchasePrice?.toLocaleString() || '未知'}
- **最高可接受价**: $${p?.maxPurchasePrice?.toLocaleString() || '未知'}
- **评分**: ${s.totalScore}/100
- **风险等级**: ${riskEmoji} ${s.riskLevel}
- **建议**: **${pa?.recommendation || 'PASS'}**

**评分详情**:
| 维度 | 得分 | 满分 |
|------|------|------|
| 车型流通 | ${s.modelScore} | 20 |
| 年份 | ${s.yearScore} | 15 |
| 公里数 | ${s.mileageScore} | 15 |
| 价格性价比 | ${s.priceScore} | 20 |
| WOF | ${s.wofScore} | 10 |
| 卖家动机 | ${s.sellerScore} | 10 |
| 图片质量 | ${s.imageScore} | 10 |

**车辆链接**: ${vehicle.url}

---

`;
    });

    // 添加建议和风险提示
    md += `## 📝 联系策略

对于评分 80+ 的车辆:
1. **快速行动** - 好deal通常在24小时内被抢
2. **准备现金** - 卖家更喜欢现金买家
3. **当天看车** - 约卖家尽快实地看车
4. **合理议价** - 可以在标价基础上再谈5-10%

## 📋 采购价格参考

### Auckland地区
- **最高收购价** = 市场参考价 - 1500
- **理想采购价** = 最高收购价 - 300

### Waikato地区
- **最高收购价** = 市场参考价 - 1300
- **理想采购价** = 最高收购价 - 300

## ⚠️ 风险提示

- 务必实地验车，检查机械状况
- 建议做pre-purchase inspection ($100-150)
- 查询车辆历史报告 (CarJam)
- 确认无贷款/抵押
- 注意识别虚假信息
- 所有评分仅供参考，不构成投资建议

## 📊 评分标准

| 评分 | 等级 | 建议 |
|------|------|------|
| 90-100 | 优秀 | 强烈推荐 |
| 80-89 | 良好 | 推荐 |
| 75-79 | 可接受 | 考虑 |
| <75 | 一般 | 谨慎 |

---

*报告生成时间: ${new Date().toLocaleString('en-NZ', { timeZone: 'Pacific/Auckland' })}*  
*数据来源: Facebook Marketplace*  
*工具: Car Scout Toyota v2.0*
`;

    return md;
  }

  /**
   * 生成文本格式报告
   */
  generateTextReport(report) {
    const lines = [];
    
    lines.push('╔══════════════════════════════════════════╗');
    lines.push('║     🚗 Car Scout 每日车辆报告            ║');
    lines.push('╚══════════════════════════════════════════╝');
    lines.push('');
    lines.push(`📅 日期: ${report.date}`);
    lines.push(`⏰ 生成时间: ${new Date().toLocaleString('en-NZ', { timeZone: 'Pacific/Auckland' })}`);
    lines.push('');
    
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push('📊 今日汇总');
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push(`🚗 抓取车辆总数: ${report.totalVehicles} 辆`);
    lines.push(`✅ 可投资车辆: ${report.investableCount} 辆 (评分75+)`);
    lines.push('');
    
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push(`🏆 TOP ${Math.min(report.topVehicles.length, 5)} 推荐车辆`);
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push('');
    
    report.topVehicles.forEach((vehicle, index) => {
      lines.push(this.formatVehicleDetail(vehicle, index + 1));
      lines.push('');
    });
    
    if (report.investableVehicles.length > 5) {
      lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      lines.push(`📋 其他可投资车辆 (${report.investableVehicles.length - 5} 辆)`);
      lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      lines.push('');
      
      report.investableVehicles.slice(5).forEach((vehicle, index) => {
        lines.push(this.formatVehicleBrief(vehicle, index + 6));
      });
      lines.push('');
    }
    
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push('💡 提示: 建议优先查看TOP 3车辆');
    lines.push('⚠️ 注意: 所有评分仅供参考，实地看车前请与卖家确认');
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    return lines.join('\n');
  }

  /**
   * 格式化车辆详情
   */
  formatVehicleDetail(vehicle, rank) {
    const lines = [];
    const s = vehicle.scoring;
    const p = s.pricing;
    const pa = s.profitAnalysis;
    
    const riskEmoji = s.riskLevel === '低' ? '🟢' : s.riskLevel === '中' ? '🟡' : '🔴';
    
    lines.push(`🏅 第 ${rank} 名 ${s.isGoodDeal ? '🔥' : ''}`);
    lines.push('┌────────────────────────────────────────┐');
    lines.push(`│ 🚗 ${vehicle.title.substring(0, 35).padEnd(35)} │`);
    lines.push('├────────────────────────────────────────┤');
    lines.push(`│ 📍 地区: ${vehicle.searchLocation.padEnd(29)} │`);
    lines.push(`│ 📅 年份: ${String(vehicle.year || '未知').padEnd(29)} │`);
    lines.push(`│ 🛣️  公里数: ${String(vehicle.mileage ? vehicle.mileage.toLocaleString() + ' km' : '未知').padEnd(26)} │`);
    lines.push('├────────────────────────────────────────┤');
    lines.push(`│ 💰 挂牌价: $${String(vehicle.price || '未知').padEnd(27)} │`);
    lines.push(`│ ⭐ 综合评分: ${String(s.totalScore).padEnd(25)} │`);
    lines.push(`│ 💹 利润率: ${String((pa?.profitMarginPercent || 0) + '%').padEnd(27)} │`);
    lines.push('├────────────────────────────────────────┤');
    
    if (p) {
      lines.push(`│ 💵 建议采购价: $${String(p.idealPurchasePrice).padEnd(23)} │`);
      lines.push(`│ 📈 最高可接受: $${String(p.maxPurchasePrice).padEnd(23)} │`);
      lines.push(`│ 💵 预计转售价: $${String(p.estimatedResalePrice).padEnd(23)} │`);
      lines.push(`│ 📊 预计利润: ${p.estimatedProfitRange.padEnd(25)} │`);
    }
    
    lines.push('├────────────────────────────────────────┤');
    lines.push(`│ ⚠️ 风险等级: ${riskEmoji} ${s.riskLevel.padEnd(24)} │`);
    lines.push(`│ 📋 WOF: ${String(vehicle.wof || '未知').padEnd(31)} │`);
    lines.push(`│ 📝 建议: ${String(pa?.recommendation || 'PASS').padEnd(30)} │`);
    lines.push('├────────────────────────────────────────┤');
    lines.push('│ 📊 评分详情:                           │');
    lines.push(`│   车型: ${String(s.modelScore).padEnd(3)}/20  年份: ${String(s.yearScore).padEnd(3)}/15  公里: ${String(s.mileageScore).padEnd(3)}/15 │`);
    lines.push(`│   价格: ${String(s.priceScore).padEnd(3)}/20  WOF: ${String(s.wofScore).padEnd(3)}/10  卖家: ${String(s.sellerScore).padEnd(3)}/10 │`);
    lines.push(`│   图片: ${String(s.imageScore).padEnd(3)}/10                          │`);
    lines.push('├────────────────────────────────────────┤');
    lines.push(`│ 🔗 ${vehicle.url.substring(0, 38).padEnd(38)} │`);
    lines.push('└────────────────────────────────────────┘');
    
    return lines.join('\n');
  }

  /**
   * 格式化车辆简要信息
   */
  formatVehicleBrief(vehicle, rank) {
    const s = vehicle.scoring;
    const p = s.pricing;
    const riskEmoji = s.riskLevel === '低' ? '🟢' : s.riskLevel === '中' ? '🟡' : '🔴';
    
    let line = `${rank}. ${vehicle.title.substring(0, 30)} | `;
    line += `$${vehicle.price} | `;
    line += `评分:${s.totalScore} | `;
    line += `${riskEmoji}${s.riskLevel}`;
    
    if (p) {
      line += ` | 建议采购$${p.idealPurchasePrice}`;
    }
    
    return line;
  }

  /**
   * 生成飞书消息格式
   */
  generateFeishuMessage(report) {
    const lines = [];
    
    lines.push(`🚗 Car Scout Toyota 报告 | ${report.date}`);
    lines.push('');
    lines.push(`📊 今日抓取: ${report.totalVehicles} 辆`);
    lines.push(`✅ 可投资: ${report.investableCount} 辆 (评分75+)`);
    lines.push('');
    lines.push('🏆 TOP 3 推荐:');
    lines.push('');
    
    report.topVehicles.slice(0, 3).forEach((v, i) => {
      const p = v.scoring.pricing;
      const pa = v.scoring.profitAnalysis;
      const riskEmoji = v.scoring.riskLevel === '低' ? '🟢' : v.scoring.riskLevel === '中' ? '🟡' : '🔴';
      
      lines.push(`${i + 1}. ${v.title.substring(0, 25)}`);
      lines.push(`   💰 $${v.price} | ⭐ ${v.scoring.totalScore}分 | ${riskEmoji} ${v.scoring.riskLevel}风险`);
      lines.push(`   💹 利润率 ${pa?.profitMarginPercent || 0}% | 建议: ${pa?.recommendation || 'PASS'}`);
      if (p) {
        lines.push(`   💵 建议采购 $${p.idealPurchasePrice} | 预计利润 ${p.estimatedProfitRange}`);
      }
      lines.push(`   🔗 ${v.url}`);
      lines.push('');
    });
    
    if (report.investableVehicles.length > 3) {
      lines.push(`📋 还有 ${report.investableVehicles.length - 3} 辆可投资车辆`);
      lines.push('   查看完整报告获取详情');
    }
    
    return lines.join('\n');
  }
}

// 如果直接运行
if (require.main === module) {
  const args = process.argv.slice(2);
  const dataFile = args[0];
  
  if (!dataFile) {
    console.error('Usage: node report.js <data-file>');
    process.exit(1);
  }
  
  const generator = new ReportGenerator();
  generator.generateDailyReport(dataFile)
    .then(result => {
      console.log('\n' + result.textReport);
    })
    .catch(console.error);
}

module.exports = ReportGenerator;
