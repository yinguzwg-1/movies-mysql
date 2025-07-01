#!/usr/bin/env node

const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setup() {
  console.log('🚀 数据库配置设置向导');
  console.log('========================\n');
  
  try {
    // 检查是否已存在.env文件
    if (fs.existsSync('.env')) {
      const overwrite = await question('⚠️  .env文件已存在，是否覆盖？(y/N): ');
      if (overwrite.toLowerCase() !== 'y') {
        console.log('❌ 设置已取消');
        rl.close();
        return;
      }
    }
    
    // 获取配置信息
    const host = await question('🌐 云服务器IP地址 (默认: localhost): ') || 'localhost';
    const user = await question('👤 数据库用户名 (默认: root): ') || 'root';
    const password = await question('🔑 数据库密码 (直接回车表示无密码): ') || '';
    const database = await question('🗄️  数据库名称 (默认: nest_db): ') || 'nest_db';
    const port = await question('🔌 数据库端口 (默认: 3306): ') || '3306';
    
    // 生成.env文件内容
    const envContent = `# 数据库配置 - 云服务器
DB_HOST=${host}
DB_USER=${user}
DB_PASSWORD=${password}
DB_NAME=${database}
DB_PORT=${port}
`;
    
    // 写入.env文件
    fs.writeFileSync('.env', envContent);
    
    console.log('\n✅ 配置已保存到 .env 文件');
    console.log('\n📋 配置信息:');
    console.log(`   主机: ${host}:${port}`);
    console.log(`   用户: ${user}`);
    console.log(`   密码: ${password || '(无密码)'}`);
    console.log(`   数据库: ${database}`);
    
    console.log('\n🔍 是否要测试连接？(y/N): ');
    const testConnection = await question('');
    
    if (testConnection.toLowerCase() === 'y') {
      console.log('\n🔌 测试数据库连接...');
      // 这里可以调用测试连接脚本
      console.log('💡 运行 npm run test 来测试连接');
    }
    
    console.log('\n🎉 设置完成！');
    console.log('💡 运行 npm run quick-start 开始部署');
    
  } catch (error) {
    console.error('❌ 设置失败:', error.message);
  } finally {
    rl.close();
  }
}

setup(); 