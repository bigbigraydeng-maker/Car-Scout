const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// API配置 - 用户需要填写
const CONFIG = {
  github: {
    token: process.env.GITHUB_TOKEN || '', // GitHub Personal Access Token
    owner: process.env.GITHUB_OWNER || '', // GitHub用户名
    repo: process.env.GITHUB_REPO || 'car-scout', // 仓库名
  },
  render: {
    apiKey: process.env.RENDER_API_KEY || '', // Render API Key
    serviceName: process.env.RENDER_SERVICE_NAME || 'car-scout',
    region: 'oregon', // oregon 或 singapore
  }
};

class AutoDeployer {
  constructor() {
    this.checkConfig();
  }

  checkConfig() {
    const missing = [];
    if (!CONFIG.github.token) missing.push('GITHUB_TOKEN');
    if (!CONFIG.github.owner) missing.push('GITHUB_OWNER');
    if (!CONFIG.render.apiKey) missing.push('RENDER_API_KEY');
    
    if (missing.length > 0) {
      console.error('❌ 缺少必要的环境变量：');
      missing.forEach(v => console.error(`   - ${v}`));
      console.error('\n请设置环境变量后重试：');
      console.error('   Windows: set GITHUB_TOKEN=your_token');
      console.error('   或修改此文件开头的CONFIG对象');
      process.exit(1);
    }
  }

  // HTTP请求封装
  async request(options, data = null) {
    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            resolve({
              status: res.statusCode,
              body: JSON.parse(body)
            });
          } catch (e) {
            resolve({
              status: res.statusCode,
              body: body
            });
          }
        });
      });
      
      req.on('error', reject);
      
      if (data) {
        req.write(JSON.stringify(data));
      }
      
      req.end();
    });
  }

  // 1. 创建GitHub仓库
  async createGitHubRepo() {
    console.log('📦 步骤1：创建GitHub仓库...\n');
    
    const options = {
      hostname: 'api.github.com',
      path: '/user/repos',
      method: 'POST',
      headers: {
        'Authorization': `token ${CONFIG.github.token}`,
        'User-Agent': 'CarScout-Deployer',
        'Content-Type': 'application/json'
      }
    };

    const data = {
      name: CONFIG.github.repo,
      description: 'Car Scout - 智能二手车抓取与管理系统',
      private: false,
      auto_init: true
    };

    try {
      const result = await this.request(options, data);
      
      if (result.status === 201) {
        console.log('✅ GitHub仓库创建成功！');
        console.log(`   地址：https://github.com/${CONFIG.github.owner}/${CONFIG.github.repo}\n`);
        return result.body.clone_url;
      } else if (result.status === 422 && result.body.message && result.body.message.includes('already exists')) {
        console.log('⚠️  仓库已存在，使用现有仓库');
        console.log(`   地址：https://github.com/${CONFIG.github.owner}/${CONFIG.github.repo}\n`);
        return `https://github.com/${CONFIG.github.owner}/${CONFIG.github.repo}.git`;
      } else {
        throw new Error(result.body.message || '创建失败');
      }
    } catch (error) {
      console.error('❌ 创建GitHub仓库失败：', error.message);
      throw error;
    }
  }

  // 2. 上传代码到GitHub
  async pushToGitHub(repoUrl) {
    console.log('📤 步骤2：上传代码到GitHub...\n');
    
    try {
      // 初始化git
      if (!fs.existsSync('.git')) {
        execSync('git init', { stdio: 'inherit' });
      }
      
      // 配置git
      execSync('git config user.email "deploy@carscout.com"', { stdio: 'ignore' });
      execSync('git config user.name "Car Scout Deployer"', { stdio: 'ignore' });
      
      // 添加所有文件
      execSync('git add .', { stdio: 'inherit' });
      
      // 提交
      try {
        execSync('git commit -m "Initial deployment"', { stdio: 'inherit' });
      } catch (e) {
        console.log('⚠️  没有新文件需要提交');
      }
      
      // 设置远程仓库
      try {
        execSync('git remote remove origin', { stdio: 'ignore' });
      } catch (e) {}
      
      // 添加认证信息到URL
      const authUrl = repoUrl.replace('https://', `https://${CONFIG.github.token}@`);
      execSync(`git remote add origin ${authUrl}`, { stdio: 'inherit' });
      
      // 推送
      execSync('git branch -M main', { stdio: 'ignore' });
      execSync('git push -u origin main --force', { stdio: 'inherit' });
      
      console.log('✅ 代码上传成功！\n');
    } catch (error) {
      console.error('❌ 上传代码失败：', error.message);
      throw error;
    }
  }

  // 3. 创建Render服务
  async createRenderService() {
    console.log('🚀 步骤3：创建Render服务...\n');
    
    const options = {
      hostname: 'api.render.com',
      path: '/v1/services',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CONFIG.render.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    const data = {
      type: 'web_service',
      name: CONFIG.render.serviceName,
      ownerId: 'me',
      repo: `https://github.com/${CONFIG.github.owner}/${CONFIG.github.repo}`,
      branch: 'main',
      buildFilter: null,
      env: 'node',
      buildCommand: 'npm install',
      startCommand: 'node src/web-server.js',
      plan: 'free',
      region: CONFIG.render.region,
      autoDeploy: 'yes'
    };

    try {
      const result = await this.request(options, data);
      
      if (result.status === 201 || result.status === 200) {
        console.log('✅ Render服务创建成功！');
        console.log(`   服务名：${result.body.name || CONFIG.render.serviceName}`);
        console.log(`   状态：${result.body.status || 'creating'}\n`);
        return result.body;
      } else if (result.status === 409) {
        console.log('⚠️  服务已存在，获取现有服务信息...\n');
        return await this.getRenderService();
      } else {
        throw new Error(result.body.message || '创建失败');
      }
    } catch (error) {
      console.error('❌ 创建Render服务失败：', error.message);
      throw error;
    }
  }

  // 获取Render服务信息
  async getRenderService() {
    const options = {
      hostname: 'api.render.com',
      path: '/v1/services',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CONFIG.render.apiKey}`,
        'Accept': 'application/json'
      }
    };

    try {
      const result = await this.request(options);
      const service = result.body.find(s => s.name === CONFIG.render.serviceName);
      if (service) {
        return service;
      }
      throw new Error('服务未找到');
    } catch (error) {
      throw error;
    }
  }

  // 4. 等待部署完成
  async waitForDeployment(service) {
    console.log('⏳ 步骤4：等待部署完成...\n');
    console.log('   部署通常需要2-3分钟，请稍候...\n');
    
    const maxAttempts = 30;
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        const options = {
          hostname: 'api.render.com',
          path: `/v1/services/${service.id}`,
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${CONFIG.render.apiKey}`,
            'Accept': 'application/json'
          }
        };

        const result = await this.request(options);
        const status = result.body.status;
        
        if (status === 'live') {
          console.log('✅ 部署完成！\n');
          return result.body;
        } else if (status === 'build_failed' || status === 'canceled') {
          throw new Error(`部署失败，状态：${status}`);
        }
        
        process.stdout.write(`   状态：${status} (${attempts + 1}/${maxAttempts})...\r`);
        
        await new Promise(resolve => setTimeout(resolve, 10000)); // 10秒检查一次
        attempts++;
      } catch (error) {
        console.error('   检查状态失败：', error.message);
        await new Promise(resolve => setTimeout(resolve, 10000));
        attempts++;
      }
    }
    
    throw new Error('部署超时，请手动检查Render Dashboard');
  }

  // 主流程
  async deploy() {
    console.log('\n');
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║                                                ║');
    console.log('║   🚀 Car Scout 自动部署工具                    ║');
    console.log('║                                                ║');
    console.log('║   GitHub → Render 全自动部署                   ║');
    console.log('║                                                ║');
    console.log('╚════════════════════════════════════════════════╝');
    console.log('\n');

    try {
      // 步骤1：创建GitHub仓库
      const repoUrl = await this.createGitHubRepo();
      
      // 步骤2：上传代码
      await this.pushToGitHub(repoUrl);
      
      // 步骤3：创建Render服务
      const service = await this.createRenderService();
      
      // 步骤4：等待部署
      const deployedService = await this.waitForDeployment(service);
      
      // 显示结果
      console.log('╔════════════════════════════════════════════════╗');
      console.log('║              ✅ 部署成功！                      ║');
      console.log('╠════════════════════════════════════════════════╣');
      console.log(`║  GitHub仓库：                                   ║`);
      console.log(`║  https://github.com/${CONFIG.github.owner}/${CONFIG.github.repo}  ║`);
      console.log(`║                                                 ║`);
      console.log(`║  访问地址：                                     ║`);
      console.log(`║  ${deployedService.url || '等待生成...'}${' '.repeat(Math.max(0, 40 - (deployedService.url || '').length))}║`);
      console.log(`║                                                 ║`);
      console.log(`║  将地址分享给合伙人即可！                        ║`);
      console.log('╚════════════════════════════════════════════════╝');
      console.log('\n');
      
      // 保存部署信息
      const deployInfo = {
        github: `https://github.com/${CONFIG.github.owner}/${CONFIG.github.repo}`,
        render: deployedService.url || `https://${CONFIG.render.serviceName}.onrender.com`,
        deployedAt: new Date().toISOString()
      };
      
      fs.writeFileSync('deploy-info.json', JSON.stringify(deployInfo, null, 2));
      console.log('💾 部署信息已保存到 deploy-info.json\n');
      
    } catch (error) {
      console.error('\n❌ 部署失败：', error.message);
      console.log('\n请检查：');
      console.log('1. API Token是否正确');
      console.log('2. 网络连接是否正常');
      console.log('3. GitHub和Render服务状态');
      process.exit(1);
    }
  }
}

// 运行部署
const deployer = new AutoDeployer();
deployer.deploy();
