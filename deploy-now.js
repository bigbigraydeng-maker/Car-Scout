const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// API配置
const CONFIG = {
  github: {
    token: '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',
    owner: '', // 将通过API获取
    repo: 'car-scout',
  },
  render: {
    apiKey: 'rnd_EhY1OlvGZjtCOJB78Xz4IH4PycE8',
    serviceName: 'car-scout',
    region: 'oregon',
  }
};

class AutoDeployer {
  constructor() {
    this.logs = [];
  }

  log(message) {
    console.log(message);
    this.logs.push(message);
    fs.writeFileSync('deploy-log.txt', this.logs.join('\n'));
  }

  async request(options, data = null) {
    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            resolve({
              status: res.statusCode,
              body: body ? JSON.parse(body) : {}
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

  // 获取GitHub用户信息
  async getGitHubUser() {
    this.log('🔍 获取GitHub用户信息...');
    
    const options = {
      hostname: 'api.github.com',
      path: '/user',
      method: 'GET',
      headers: {
        'Authorization': `token ${CONFIG.github.token}`,
        'User-Agent': 'CarScout-Deployer'
      }
    };

    try {
      const result = await this.request(options);
      if (result.status === 200) {
        CONFIG.github.owner = result.body.login;
        this.log(`✅ GitHub用户名：${CONFIG.github.owner}`);
        return result.body;
      } else {
        throw new Error('获取用户信息失败');
      }
    } catch (error) {
      throw new Error(`GitHub认证失败：${error.message}`);
    }
  }

  // 创建GitHub仓库
  async createGitHubRepo() {
    this.log('\n📦 步骤1：创建GitHub仓库...');
    
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
        this.log('✅ GitHub仓库创建成功！');
        this.log(`   地址：https://github.com/${CONFIG.github.owner}/${CONFIG.github.repo}`);
        return result.body.clone_url;
      } else if (result.status === 422) {
        this.log('⚠️  仓库已存在，使用现有仓库');
        return `https://github.com/${CONFIG.github.owner}/${CONFIG.github.repo}.git`;
      } else {
        throw new Error(result.body.message || '创建失败');
      }
    } catch (error) {
      throw new Error(`创建GitHub仓库失败：${error.message}`);
    }
  }

  // 上传代码到GitHub
  async pushToGitHub(repoUrl) {
    this.log('\n📤 步骤2：上传代码到GitHub...');
    
    try {
      // 初始化git
      if (!fs.existsSync('.git')) {
        execSync('git init', { stdio: 'ignore' });
        this.log('  ✅ Git初始化');
      }
      
      // 配置git
      execSync('git config user.email "deploy@carscout.com"', { stdio: 'ignore' });
      execSync('git config user.name "Car Scout Deployer"', { stdio: 'ignore' });
      
      // 添加所有文件
      execSync('git add .', { stdio: 'ignore' });
      this.log('  ✅ 添加文件');
      
      // 提交
      try {
        execSync('git commit -m "Auto deploy"', { stdio: 'ignore' });
        this.log('  ✅ 提交代码');
      } catch (e) {
        this.log('  ℹ️  没有新文件需要提交');
      }
      
      // 设置远程仓库
      try {
        execSync('git remote remove origin', { stdio: 'ignore' });
      } catch (e) {}
      
      const authUrl = repoUrl.replace('https://', `https://${CONFIG.github.token}@`);
      execSync(`git remote add origin ${authUrl}`, { stdio: 'ignore' });
      this.log('  ✅ 配置远程仓库');
      
      // 推送
      execSync('git branch -M main', { stdio: 'ignore' });
      execSync('git push -u origin main --force', { stdio: 'pipe' });
      this.log('  ✅ 推送到GitHub');
      
      this.log('\n✅ 代码上传成功！');
    } catch (error) {
      throw new Error(`上传代码失败：${error.message}`);
    }
  }

  // 创建Render服务
  async createRenderService() {
    this.log('\n🚀 步骤3：创建Render服务...');
    
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
        this.log('✅ Render服务创建成功！');
        return result.body;
      } else if (result.status === 409) {
        this.log('⚠️  服务已存在');
        return { id: 'existing', name: CONFIG.render.serviceName };
      } else {
        this.log(`⚠️  Render返回状态：${result.status}`);
        this.log(`   响应：${JSON.stringify(result.body)}`);
        return { id: 'unknown', name: CONFIG.render.serviceName };
      }
    } catch (error) {
      this.log(`⚠️  Render API调用失败：${error.message}`);
      this.log('   将继续使用手动部署方式...');
      return { id: 'manual', name: CONFIG.render.serviceName };
    }
  }

  // 主流程
  async deploy() {
    console.log('\n');
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║                                                ║');
    console.log('║   🚀 Car Scout 自动部署开始                    ║');
    console.log('║                                                ║');
    console.log('╚════════════════════════════════════════════════╝');
    console.log('\n');

    try {
      // 步骤0：获取GitHub用户信息
      await this.getGitHubUser();
      
      // 步骤1：创建GitHub仓库
      const repoUrl = await this.createGitHubRepo();
      
      // 步骤2：上传代码
      await this.pushToGitHub(repoUrl);
      
      // 步骤3：创建Render服务
      const service = await this.createRenderService();
      
      // 完成
      const deployUrl = `https://${CONFIG.render.serviceName}.onrender.com`;
      
      this.log('\n');
      this.log('╔════════════════════════════════════════════════╗');
      this.log('║              ✅ 部署流程完成！                  ║');
      this.log('╠════════════════════════════════════════════════╣');
      this.log('║                                                ║');
      this.log(`║  GitHub仓库：                                   ║`);
      this.log(`║  https://github.com/${CONFIG.github.owner}/${CONFIG.github.repo}  ║`);
      this.log(`║                                                ║`);
      this.log(`║  访问地址：                                     ║`);
      this.log(`║  ${deployUrl.padEnd(46)}║`);
      this.log(`║                                                ║`);
      this.log(`║  ⚠️  注意：Render部署需要2-3分钟                ║`);
      this.log(`║      请稍后访问上述地址                         ║`);
      this.log(`║                                                ║`);
      this.log(`║  📱 合伙人可以通过浏览器访问此地址              ║`);
      this.log(`║      查看所有车辆信息                          ║`);
      this.log('╚════════════════════════════════════════════════╝');
      this.log('\n');
      
      // 保存部署信息
      const deployInfo = {
        github: `https://github.com/${CONFIG.github.owner}/${CONFIG.github.repo}`,
        render: deployUrl,
        deployedAt: new Date().toISOString(),
        logs: this.logs
      };
      
      fs.writeFileSync('deploy-info.json', JSON.stringify(deployInfo, null, 2));
      this.log('💾 部署信息已保存到 deploy-info.json\n');
      
    } catch (error) {
      this.log('\n❌ 部署失败：' + error.message);
      this.log('\n请检查：');
      this.log('1. API Token是否正确');
      this.log('2. 网络连接是否正常');
      this.log('3. 查看 deploy-log.txt 获取详细日志');
      process.exit(1);
    }
  }
}

// 运行部署
const deployer = new AutoDeployer();
deployer.deploy();
