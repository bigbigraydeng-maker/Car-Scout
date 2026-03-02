# Car Scout 配置文件
# 用户自定义筛选条件

## 搜索配置
SEARCH_CONFIG = {
  "models": ["Corolla", "Vitz", "Wish", "RAV4"],
  "locations": [
    {"name": "Auckland", "slug": "auckland"},
    {"name": "Waikato", "slug": "waikato"}
  ],
  "minPrice": 2000,
  "maxPrice": 5000,
  "minYear": 2005,
  "maxMileage": 200000
}

## 排除条件
EXCLUDE_CONDITIONS = {
  "maxMileage": 200000,  # 超过20万公里排除
  "minYear": 2005,       # 2005年以前排除
  "majorFaults": [       # 大故障关键词
    "engine problem",
    "engine issue",
    "transmission problem",
    "gearbox issue",
    "blown head gasket",
    "overheating",
    "not running",
    "doesn't start",
    "wont start",
    "engine knock",
    "oil leak",
    "coolant leak",
    "water damage",
    "written off",
    " totaled",
    "engine blown",
    "gearbox blown",
    " transmission",
    "clutch problem",
    "发动机问题",
    "变速箱",
    "无法启动",
    "漏油",
    "漏水",
    "过热"
  ]
}

## 抓取配置
SCRAPE_CONFIG = {
  "openListingDetails": true,  # 打开每个listing获取描述
  "maxResults": 30,            # 每个搜索最多结果数
  "scrollTimes": 3,            # 滚动次数加载更多
  "delayBetweenClicks": 2000   # 点击间隔(毫秒)
}

## 评分权重
SCORING_WEIGHTS = {
  "priceAdvantage": 25,
  "mileageCondition": 20,
  "modelPopularity": 15,
  "location": 10,
  "yearDepreciation": 10,
  "descriptionQuality": 10,
  "riskIndicators": 10
}
