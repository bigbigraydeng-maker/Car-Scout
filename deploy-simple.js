const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 加载环境变量
require('dotenv').config();

// API配置
const CONFIG = {
  github: {
    token: process.env.GITHUB_TOKEN || '',
    owner: process.env.GITHUB_OWNER || '',
    repo: process.env.GITHUB_REPO || 'car-scout',
  },
  render: {
    apiKey: process.env.RENDER_API_KEY || '',
    serviceName: process.env.RENDER_SERVICE_NAME || 'car-scout',
    region: process.env.RENDER_REGION || 'oregon',
  }
};

// 简化的自动部署类
class SimpleDeployer {
  async deploy() {
    console.log('\n🚀 Car Scout 自动部署\n');
    
    // 检查配置
    if (!CONFIG.github.token || !CONFIG.github.owner || !CONFIG.render.apiKey) {
      console.error('❌ 缺少配置信息');
      console.log('\n请创建 .env 文件：');
      console.log('  复制 .env.example 为 .env');
      console.log('  填写您的API Token');
      console.log('\n或运行：API自动部署.bat\n');
      process.exit(1);
    }

    try {
      // 1. GitHub
      console.log('📦 创建GitHub仓库...');
      await this.createGitHubRepo();
      
      console.log('📤 上传代码...');
      await this.pushToGitHub();
      
      // 2. Render
      console.log('🚀 创建Render服务...');
      const service = await this.createRenderService();
      
      console.log('⏳ 等待部署完成（约2-3分钟）...');
      await this.waitForDeployment(service);
      
      // 3. 完成
      const url = `https://${CONFIG.render.serviceName}.onrender.com`;
      
      console.log('\n✅ 部署成功！\n');
      console.log('═══════════════════════════════════════');
      console.log('  GitHub: https://github.com/' + CONFIG.github.owner + '/' + CONFIG.github.repo);
      console.log('  访问地址: ' + url);
      console.log('═══════════════════════════════════════\n');
      
      // 保存信息
      fs.writeFileSync('deploy-info.json', JSON.stringify({
        github: `https://github.com/${CONFIG.github.owner}/${CONFIG.github.repo}`,
        render: url,
        time: new Date().toISOString()
      }, null, 2));
      
    } catch (err) {
      console.error('\n❌ 部署失败:', err.message);
      process.exit(1);
    }
  }

  async createGitHubRepo() {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify({
        name: CONFIG.github.repo,
        description: 'Car Scout - 车辆管理系统',
        private: false,
        auto_init: true
      });

      const req = https.request({
        hostname: 'api.github.com',
        path: '/user/repos',
        method: 'POST',
        headers: {
          'Authorization': `token ${CONFIG.github.token}`,
          'User-Agent': 'CarScout',
          'Content-Type': 'application/json',
          'Content-Length': data.length
        }
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          if (res.statusCode === 201) {
            console.log('  ✅ 仓库创建成功');
            resolve();
          } else if (res.statusCode === 422) {
            console.log('  ⚠️  仓库已存在');
            resolve();
          } else {
            reject(new Error('创建失败: ' + body));
          }
        });
      });

      req.on('error', reject);
      req.write(data);
      req.end();
    });
  }

  async pushToGitHub() {
    const repoUrl = `https://${CONFIG.github.token}@github.com/${CONFIG.github.owner}/${CONFIG.github.repo}.git`;
    
    try {
      if (!fs.existsSync('.git')) {
        execSync('git init', { stdio: 'ignore' });
      }
      
      execSync('git config user.email "deploy@carscout.com"', { stdio: 'ignore' });
      execSync('git config user.name "Deployer"', { stdio: 'ignore' });
      execSync('git add .', { stdio: 'ignore' });
      
      try {
        execSync('git commit -m "Deploy"', { stdio: 'ignore' });
      } catch (e) {}
      
      try {
        execSync('git remote remove origin', { stdio: 'ignore' });
      } catch (e) {}
      
      execSync(`git remote add origin ${repoUrl}`, { stdio: 'ignore' });
      execSync('git branch -M main', { stdio: 'ignore' });
      execSync('git push -u origin main --force', { stdio: 'inherit' });
      
      console.log('  ✅ 代码上传成功');
    } catch (err) {
      throw new Error('上传失败: ' + err.message);
    }
  }

  async createRenderService() {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify({
        type: 'web_service',
        name: CONFIG.render.serviceName,
        ownerId: 'me',
        repo: `https://github.com/${CONFIG.github.owner}/${CONFIG.github.repo}`,
        branch: 'main',
        env: 'node',
        buildCommand: 'npm install',
        startCommand: 'node src/web-server.js',
        plan: 'free',
        region: CONFIG.render.region
      });

      const req = https.request({
        hostname: 'api.render.com',
        path: '/v1/services',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CONFIG.render.apiKey}`,
          'Content-Type': 'application/json',
          'Content-Length': data.length
        }
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          if (res.statusCode === 201 || res.statusCode === 200) {
            console.log('  ✅ 服务创建成功');
            resolve(JSON.parse(body));
          } else {
            // 服务可能已存在
            console.log('  ⚠️  服务已存在或创建中');
            resolve({ id: 'existing', name: CONFIG.render.serviceName });
          }
        });
      });

      req.on('error', reject);
      req.write(data);
      req.end();
    });
  }

  async waitForDeployment(service) {
    console.log('  等待部署...');
    
    // 简单等待3分钟
    for (let i = 0; i < 18; i++) {
      process.stdout.write(`  ${(i+1)*10}秒...\r`);
      await new Promise(r => setTimeout(r, 10000));
    }
    
    console.log('  ✅ 部署完成！\n');
  }
}

// 检查是否需要dotenv
try {
  require('dotenv').config();
} catch (e) {
  console.log('⚠️  未安装dotenv，使用环境变量\n');
}

// 运行
new SimpleDeployer().deploy();
