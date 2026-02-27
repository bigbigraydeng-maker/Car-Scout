const https = require('https');
const { execSync } = require('child_process');

const TOKEN = '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';
const OWNER = 'bigbigraydeng-maker';
const REPO = 'car-scout';

console.log('\n🚀 Car Scout 部署助手\n');
console.log('========================================\n');

// 尝试多种方式创建仓库
const tryCreateRepo = async () => {
  console.log('📦 尝试创建GitHub仓库...\n');
  
  const postData = JSON.stringify({
    name: REPO,
    description: 'Car Scout - 智能二手车抓取与管理系统',
    private: false,
    auto_init: true,
    gitignore_template: 'Node'
  });

  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'api.github.com',
      path: '/user/repos',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'User-Agent': 'CarScout-Deployer',
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const response = JSON.parse(data);
        
        if (res.statusCode === 201) {
          console.log('✅ 仓库创建成功！');
          console.log(`   地址: ${response.html_url}\n`);
          resolve(true);
        } else if (res.statusCode === 422 && response.errors?.[0]?.message?.includes('already exists')) {
          console.log('⚠️  仓库已存在，使用现有仓库\n');
          resolve(true);
        } else {
          console.log(`❌ 创建失败 (HTTP ${res.statusCode})`);
          console.log(`   错误: ${response.message || 'Unknown error'}`);
          
          if (res.statusCode === 403 || res.statusCode === 401) {
            console.log('\n⚠️  Token权限不足，需要手动创建仓库');
            console.log('   请访问: https://github.com/new');
            console.log('   仓库名: car-scout');
            console.log('   选择: Public');
            console.log('   勾选: Add a README file\n');
          }
          resolve(false);
        }
      });
    });

    req.on('error', (err) => {
      console.log(`❌ 请求错误: ${err.message}`);
      resolve(false);
    });

    req.write(postData);
    req.end();
  });
};

// 推送代码
const pushCode = () => {
  console.log('📤 推送代码到GitHub...\n');
  
  try {
    // 配置git
    execSync('git config user.email "deploy@carscout.com"', { stdio: 'ignore' });
    execSync('git config user.name "Car Scout Deployer"', { stdio: 'ignore' });
    
    // 确保分支名正确
    try { execSync('git branch -m main', { stdio: 'ignore' }); } catch(e) {}
    
    // 设置远程
    try { execSync('git remote remove origin', { stdio: 'ignore' }); } catch(e) {}
    execSync(`git remote add origin https://${TOKEN}@github.com/${OWNER}/${REPO}.git`, { stdio: 'ignore' });
    
    // 推送
    console.log('   正在推送...');
    execSync('git push -u origin main --force', { stdio: 'inherit' });
    
    console.log('\n✅ 代码推送成功！');
    return true;
  } catch (error) {
    console.log('\n❌ 推送失败');
    console.log(`   错误: ${error.message}`);
    return false;
  }
};

// 主流程
const main = async () => {
  const repoCreated = await tryCreateRepo();
  
  if (repoCreated) {
    // 等待几秒让GitHub准备好
    console.log('⏳ 等待GitHub准备...');
    await new Promise(r => setTimeout(r, 3000));
    
    const pushed = pushCode();
    
    if (pushed) {
      console.log('\n========================================');
      console.log('🎉 部署成功！');
      console.log('========================================\n');
      console.log('📂 GitHub仓库:');
      console.log(`   https://github.com/${OWNER}/${REPO}\n`);
      console.log('🚀 下一步 - 部署到Render:');
      console.log('   1. 访问 https://dashboard.render.com');
      console.log('   2. 用GitHub登录');
      console.log('   3. New + → Web Service');
      console.log('   4. 选择 car-scout 仓库');
      console.log('   5. Build: npm install');
      console.log('   6. Start: node src/web-server.js');
      console.log('   7. 点击 Create Web Service\n');
      console.log('⏳ 等待2-3分钟，获得访问地址\n');
      
      // 打开Render Dashboard
      const { exec } = require('child_process');
      exec('start https://dashboard.render.com');
    }
  } else {
    console.log('\n========================================');
    console.log('⚠️  需要手动创建仓库');
    console.log('========================================\n');
    console.log('请按以下步骤操作：');
    console.log('1. 访问 https://github.com/new');
    console.log('2. Repository name: car-scout');
    console.log('3. 选择 Public');
    console.log('4. 勾选 "Add a README file"');
    console.log('5. 点击 Create repository\n');
    console.log('完成后重新运行此脚本\n');
  }
};

main().catch(console.error);
