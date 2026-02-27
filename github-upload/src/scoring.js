/**
 * Car Scout - Scoring Model v2.0
 * Toyota二手车评分系统 (100分制)
 * 合并了历史项目的利润计算逻辑
 */

const fs = require('fs');
const path = require('path');

class CarScoringModel {
  constructor() {
    // 加载配置文件
    this.config = this.loadConfig();
    
    // 市场参考价表 (基于历史项目数据 + 扩展)
    this.marketPrices = {
      'corolla': {
        '2012+': { '<150k': 7000, '150-180k': 6000, '180-220k': 4500, '>220k': 3500 },
        '2008-2011': { '<150k': 6000, '150-180k': 5500, '180-220k': 4500, '>220k': 3500 },
        '2005-2007': { '<150k': 5000, '150-180k': 4500, '180-220k': 4000, '>220k': 3500 },
        '2002-2004': { '<150k': 4000, '150-180k': 3500, '180-220k': 3500, '>220k': 3000 }
      },
      'vitz': {
        '2012+': { '<150k': 6500, '150-180k': 5500, '180-220k': 4000, '>220k': 3500 },
        '2008-2011': { '<150k': 5500, '150-180k': 5000, '180-220k': 4000, '>220k': 3500 },
        '2005-2007': { '<150k': 4500, '150-180k': 4000, '180-220k': 3500, '>220k': 3000 },
        '2002-2004': { '<150k': 3500, '150-180k': 3000, '180-220k': 3000, '>220k': 2500 }
      },
      'rav4': {
        '2012+': { '<150k': 8500, '150-180k': 7500, '180-220k': 6500, '>220k': 5500 },
        '2008-2011': { '<150k': 7500, '150-180k': 7000, '180-220k': 6000, '>220k': 5500 },
        '2005-2007': { '<150k': 6500, '150-180k': 6000, '180-220k': 5500, '>220k': 5000 },
        '2002-2004': { '<150k': 5500, '150-180k': 5000, '180-220k': 5000, '>220k': 4500 }
      }
    };
  }

  loadConfig() {
    try {
      const configPath = path.join(__dirname, '..', 'search_config.json');
      const configData = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(configData);
    } catch (err) {
      console.warn('无法加载配置文件，使用默认配置');
      return {
        analysis: { min_profit_margin: 0.10, target_profit_margin: 0.25 },
        keywords: {
          urgent_signals: ['urgent sale', 'need gone', 'moving overseas'],
          risk_signals: ['gearbox issue', 'oil leak', 'overheating']
        }
      };
    }
  }

  /**
   * 主评分函数
   */
  scoreVehicle(vehicle) {
    const scores = {
      modelScore: this.scoreModel(vehicle),
      yearScore: this.scoreYear(vehicle),
      mileageScore: this.scoreMileage(vehicle),
      priceScore: this.scorePrice(vehicle),
      wofScore: this.scoreWOF(vehicle),
      sellerScore: this.scoreSeller(vehicle),
      imageScore: this.scoreImages(vehicle)
    };

    const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
    
    // 计算利润分析（来自历史项目）
    const profitAnalysis = this.calculateProfitAnalysis(vehicle);
    
    return {
      ...scores,
      totalScore: Math.round(totalScore),
      pricing: this.calculatePricing(vehicle, profitAnalysis),
      profitAnalysis,
      riskLevel: this.assessRisk(vehicle, totalScore, scores),
      isGoodDeal: this.isGoodDeal(totalScore, profitAnalysis)
    };
  }

  /**
   * 1. 车型流通分 (20分)
   */
  scoreModel(vehicle) {
    const title = (vehicle.title || '').toLowerCase();
    const desc = (vehicle.description || '').toLowerCase();
    const text = title + ' ' + desc;
    
    if (text.includes('corolla') || text.includes('corola')) return 20;
    if (text.includes('vitz') || text.includes('yaris')) return 18;
    if (text.includes('rav4') || text.includes('rav 4')) return 16;
    
    return 15;
  }

  /**
   * 2. 年份分 (15分)
   */
  scoreYear(vehicle) {
    const year = vehicle.year;
    if (!year) return 5;
    
    if (year >= 2012) return 15;
    if (year >= 2008) return 12;
    if (year >= 2005) return 8;
    if (year >= 2002) return 6;
    
    return 0;
  }

  /**
   * 3. 公里数分 (15分)
   */
  scoreMileage(vehicle) {
    const mileage = vehicle.mileage;
    if (!mileage) return 8;
    
    if (mileage < 150000) return 15;
    if (mileage < 180000) return 12;
    if (mileage < 220000) return 8;
    
    return 4;
  }

  /**
   * 4. 价格性价比分 (20分) - 增强版
   */
  scorePrice(vehicle) {
    const profitAnalysis = this.calculateProfitAnalysis(vehicle);
    const margin = profitAnalysis.profitMarginPercent;
    
    if (margin > 30) return 20;
    if (margin >= 20) return 17;
    if (margin >= 15) return 15;
    if (margin >= 10) return 12;
    if (margin >= 5) return 8;
    
    return 5;
  }

  /**
   * 5. WOF分 (10分)
   */
  scoreWOF(vehicle) {
    const wof = (vehicle.wof || '').toLowerCase();
    
    if (!wof || wof.includes('expired') || wof.includes('no')) return 0;
    
    try {
      const wofDate = this.parseDate(wof);
      if (!wofDate) return 4;
      
      const now = new Date();
      const monthsLeft = (wofDate - now) / (1000 * 60 * 60 * 24 * 30);
      
      if (monthsLeft >= 6) return 10;
      if (monthsLeft >= 3) return 7;
      return 4;
    } catch {
      return 4;
    }
  }

  /**
   * 6. 卖家动机分 (10分) - 增强版，使用配置文件
   */
  scoreSeller(vehicle) {
    const desc = (vehicle.description || '').toLowerCase();
    const title = (vehicle.title || '').toLowerCase();
    const text = title + ' ' + desc;
    
    let score = 10;
    
    // 正向信号 (+5)
    const urgentSignals = this.config.keywords?.urgent_signals || [
      'urgent sale', 'need gone', 'moving overseas',
      'leaving nz', 'must sell', 'quick sale'
    ];
    
    if (urgentSignals.some(s => text.includes(s))) {
      score += 5;
    }
    
    // 风险信号 (直接0分)
    const riskSignals = this.config.keywords?.risk_signals || [
      'gearbox issue', 'oil leak', 'overheating',
      'mechanical problem', 'engine problem', 'transmission issue',
      'not running', 'doesn\'t start', 'needs work'
    ];
    
    if (riskSignals.some(s => text.includes(s))) {
      return 0;
    }
    
    return Math.min(score, 10);
  }

  /**
   * 7. 图片质量分 (10分)
   */
  scoreImages(vehicle) {
    const count = vehicle.imageCount || 0;
    
    if (count >= 8) return 10;
    if (count >= 4) return 7;
    return 4;
  }

  /**
   * 利润分析 - 来自历史项目
   */
  calculateProfitAnalysis(vehicle) {
    const askingPrice = vehicle.price || 0;
    const marketPrice = this.getMarketPrice(vehicle);
    
    if (!marketPrice || askingPrice <= 0) {
      return {
        askingPrice,
        marketPrice: null,
        profitMarginPercent: 0,
        estimatedProfit: 0,
        liquidity: 'Unknown',
        dealScore: 0
      };
    }
    
    const profit = marketPrice - askingPrice;
    const margin = askingPrice > 0 ? (profit / askingPrice) * 100 : 0;
    
    // 流动性评级
    let liquidity = 'Low';
    let dealScore = 5;
    
    if (margin > 30) {
      liquidity = 'High';
      dealScore = 9;
    } else if (margin > 20) {
      liquidity = 'Medium-High';
      dealScore = 8;
    } else if (margin > 15) {
      liquidity = 'Medium';
      dealScore = 7;
    } else if (margin > 10) {
      liquidity = 'Low-Medium';
      dealScore = 6;
    }
    
    // 最小利润率检查
    const minMargin = (this.config.analysis?.min_profit_margin || 0.10) * 100;
    
    return {
      askingPrice,
      marketPrice,
      profitMarginPercent: Math.round(margin * 10) / 10,
      estimatedProfit: Math.round(profit),
      liquidity,
      dealScore,
      isGoodDeal: margin >= minMargin,
      recommendation: margin >= minMargin && dealScore >= 7 ? 'BUY' : 'PASS'
    };
  }

  /**
   * 获取市场参考价
   */
  getMarketPrice(vehicle) {
    const model = this.detectModel(vehicle);
    const yearRange = this.getYearRange(vehicle.year);
    const mileageRange = this.getMileageRange(vehicle.mileage);
    
    if (!this.marketPrices[model] || !this.marketPrices[model][yearRange]) {
      return null;
    }
    
    return this.marketPrices[model][yearRange][mileageRange] || 5000;
  }

  /**
   * 计算采购价 - 地区差异化
   */
  calculatePricing(vehicle, profitAnalysis) {
    const marketPrice = profitAnalysis.marketPrice;
    if (!marketPrice) return null;
    
    const location = vehicle.searchLocation || 'Auckland';
    const isAuckland = location.toLowerCase().includes('auckland');
    
    // 最高收购价 - 地区差异化
    const maxPurchasePrice = isAuckland 
      ? marketPrice - 1500 
      : marketPrice - 1300;
    
    // 理想采购价
    const idealPurchasePrice = Math.max(maxPurchasePrice - 300, vehicle.price * 0.9);
    
    // 预计利润区间
    const minProfit = marketPrice - maxPurchasePrice;
    const maxProfit = marketPrice - idealPurchasePrice;
    
    return {
      marketPrice,
      maxPurchasePrice: Math.round(maxPurchasePrice),
      idealPurchasePrice: Math.round(idealPurchasePrice),
      estimatedResalePrice: marketPrice,
      estimatedProfitRange: `$${Math.max(0, minProfit)} - $${Math.max(0, maxProfit)}`,
      locationAdjustment: isAuckland ? '-1500' : '-1300'
    };
  }

  /**
   * 风险评估
   */
  assessRisk(vehicle, totalScore, scores) {
    // 高风险因素
    if (scores.wofScore === 0) return '高';
    if (scores.sellerScore === 0) return '高';
    if (totalScore < 75) return '高';
    
    // 中风险因素
    if (totalScore < 85) return '中';
    if (scores.wofScore <= 4) return '中';
    if (vehicle.mileage && vehicle.mileage > 200000) return '中';
    if (vehicle.year && vehicle.year < 2005) return '中';
    
    return '低';
  }

  /**
   * 判断是否为好的交易
   */
  isGoodDeal(totalScore, profitAnalysis) {
    const minScore = this.config.analysis?.min_deal_score || 75;
    return totalScore >= minScore && profitAnalysis.isGoodDeal;
  }

  /**
   * 辅助函数：检测车型
   */
  detectModel(vehicle) {
    const text = ((vehicle.title || '') + ' ' + (vehicle.description || '')).toLowerCase();
    
    if (text.includes('corolla') || text.includes('corola')) return 'corolla';
    if (text.includes('vitz') || text.includes('yaris')) return 'vitz';
    if (text.includes('rav4') || text.includes('rav 4')) return 'rav4';
    
    return 'corolla';
  }

  /**
   * 辅助函数：获取年份区间
   */
  getYearRange(year) {
    if (!year) return '2008-2011';
    if (year >= 2012) return '2012+';
    if (year >= 2008) return '2008-2011';
    if (year >= 2005) return '2005-2007';
    return '2002-2004';
  }

  /**
   * 辅助函数：获取公里数区间
   */
  getMileageRange(mileage) {
    if (!mileage) return '150-180k';
    if (mileage < 150000) return '<150k';
    if (mileage < 180000) return '150-180k';
    if (mileage < 220000) return '180-220k';
    return '>220k';
  }

  /**
   * 辅助函数：解析日期
   */
  parseDate(dateStr) {
    if (!dateStr) return null;
    
    try {
      // 尝试标准格式
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) return date;
      
      // NZ格式: JAN 2025
      const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      const match = dateStr.toLowerCase().match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*(\d{4})/);
      if (match) {
        const month = months.indexOf(match[1].substring(0, 3));
        const year = parseInt(match[2]);
        if (month >= 0) return new Date(year, month, 1);
      }
      
      // 数字格式: 01/2025 或 01-2025
      const numMatch = dateStr.match(/(\d{1,2})[\/\-](\d{4})/);
      if (numMatch) {
        const month = parseInt(numMatch[1]) - 1;
        const year = parseInt(numMatch[2]);
        return new Date(year, month, 1);
      }
      
      return null;
    } catch {
      return null;
    }
  }
}

module.exports = CarScoringModel;
