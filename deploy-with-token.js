const https = require('https');
const { execSync } = require('child_process');
const fs = require('fs');

// 用户提供的API Token
const CONFIG = {
  github: {
    token: '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',
    owner: 'bigbigraydeng-maker',
    repo: 'car-scout'
  },
  render: {
    apiKey: 'rnd_EhY1OlvGZjtCOJB78Xz4IH4PycE8',
    serviceName: 'car-scout'
  }
};

console.log('\n🚀 Car Scout 自动部署\n');

// 步骤1：创建GitHub仓库
console.log('📦 步骤1：创建GitHub仓库...\n');

const createRepo = () => {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      name: CONFIG.github.repo,
      description: 'Car Scout - 智能二手车抓取与管理系统',
      private: false,
      auto_init: true
    });

    const options = {
      hostname: 'api.github.com',
      path: '/user/repos',
      method: 'POST',
      headers: {
        'Authorization': `token ${CONFIG.github.token}`,
        'User-Agent': 'CarScout-Deployer',
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 201) {
          console.log('✅ GitHub仓库创建成功！');
          resolve();
        } else if (res.statusCode === 422) {
          console.log('⚠️  仓库已存在，使用现有仓库');
          resolve();
        } else {
          console.log('⚠️  GitHub API返回：', res.statusCode);
          console.log('   继续尝试推送代码...');
          resolve();
        }
      });
    });

    req.on('error', (err) => {
      console.log('⚠️  GitHub API错误：', err.message);
      console.log('   继续尝试推送代码...');
      resolve();
    });

    req.write(data);
    req.end();
  });
};

// 步骤2：推送代码
const pushCode = () => {
  console.log('\n📤 步骤2：推送代码到GitHub...\n');
  
  try {
    execSync('git config user.email "deploy@carscout.com"', { stdio: 'ignore' });
    execSync('git config user.name "Deployer"', { stdio: 'ignore' });
    
    // 确保分支名正确
    try {
      execSync('git branch -m main', { stdio: 'ignore' });
    } catch(e) {}
    
    // 添加远程仓库
    try {
      execSync('git remote remove origin', { stdio: 'ignore' });
    } catch(e) {}
    
    const remoteUrl = `https://${CONFIG.github.token}@github.com/${CONFIG.github.owner}/${CONFIG.github.repo}.git`;
    execSync(`git remote add origin ${remoteUrl}`, { stdio: 'ignore' });
    
    // 推送
    console.log('   正在推送代码...');
    execSync('git push -u origin main --force', { stdio: 'inherit' });
    
    console.log('\n✅ 代码推送成功！');
    return true;
  } catch (error) {
    console.error('\n❌ 推送失败：', error.message);
    return false;
  }
};

// 步骤3：创建Render服务
const createRenderService = () => {
  console.log('\n🚀 步骤3：创建Render服务...\n');
  
  return new Promise((resolve) => {
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
      region: 'oregon',
      autoDeploy: 'yes'
    });

    const options = {
      hostname: 'api.render.com',
      path: '/v1/services',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CONFIG.render.apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 201 || res.statusCode === 200) {
          console.log('✅ Render服务创建成功！');
          resolve(true);
        } else {
          console.log(`⚠️  Render API返回：${res.statusCode}`);
          console.log('   请手动在Render Dashboard中创建服务');
          resolve(false);
        }
      });
    });

    req.on('error', (err) => {
      console.log('⚠️  Render API错误：', err.message);
      console.log('   请手动在Render Dashboard中创建服务');
      resolve(false);
    });

    req.write(data);
    req.end();
  });
};

// 主流程
const main = async () => {
  try {
    await createRepo();
    const pushSuccess = pushCode();
    
    if (pushSuccess) {
      await createRenderService();
      
      console.log('\n');
      console.log('╔════════════════════════════════════════════════╗');
      console.log('║              ✅ 部署流程完成！                  ║');
      console.log('╠════════════════════════════════════════════════╣');
      console.log('║                                                ║');
      console.log('║  📂 GitHub仓库：                                ║');
      console.log(`║  https://github.com/${CONFIG.github.owner}/${CONFIG.github.repo}  ║`);
      console.log('║                                                ║');
      console.log('║  📱 访问地址（部署后）：                         ║');
      console.log('║  https://car-scout-xxx.onrender.com           ║');
      console.log('║                                                ║');
      console.log('║  ⚠️  如果Render服务未自动创建，请手动创建：      ║');
      console.log('║  https://dashboard.render.com                  ║');
      console.log('║                                                ║');
      console.log('╚════════════════════════════════════════════════╝');
      console.log('\n');
      
      // 保存部署信息
      fs.writeFileSync('deploy-info.json', JSON.stringify({
        github: `https://github.com/${CONFIG.github.owner}/${CONFIG.github.repo}`,
        render: 'https://car-scout-xxx.onrender.com',
        deployedAt: new Date().toISOString()
      }, null, 2));
      
      console.log('💾 部署信息已保存到 deploy-info.json\n');
      console.log('🎉 请将Render生成的URL分享给合伙人！\n');
    }
  } catch (error) {
    console.error('\n❌ 部署出错：', error.message);
  }
};

main();
