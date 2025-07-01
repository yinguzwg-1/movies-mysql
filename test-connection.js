#!/usr/bin/env node

// 加载环境变量
require('dotenv').config();

const mysql = require('mysql2/promise');
const { getConfig } = require('./src/db-config');

async function testConnection() {
  console.log('🔍 测试数据库连接...');
  
  try {
    // 获取配置
    const config = getConfig();
    
    // 显示配置信息
    console.log('📋 配置信息:');
    console.log(`   主机: ${config.host}:${config.port}`);
    console.log(`   数据库: ${config.database}`);
    console.log(`   用户: ${config.user}`);
    console.log(`   密码: ${config.password || '(无密码)'}`);
    
    // 尝试连接
    console.log('\n🔌 尝试连接数据库...');
    const connection = await mysql.createConnection(config);
    
    console.log('✅ 数据库连接成功！');
    
    // 测试查询
    console.log('\n🔍 测试查询...');
    const [rows] = await connection.execute('SELECT 1 as test');
    console.log('✅ 查询测试成功:', rows[0]);
    
    // 获取数据库信息
    const [dbInfo] = await connection.execute('SELECT DATABASE() as current_db, VERSION() as version');
    console.log('📊 数据库信息:', dbInfo[0]);
    
    await connection.end();
    console.log('\n🎉 所有测试通过！');
    
  } catch (error) {
    console.error('❌ 连接失败:', error.message);
    console.error('错误代码:', error.code);
    console.error('错误号:', error.errno);
    
    if (error.code === 'ER_ACCESS_DENIED_NO_PASSWORD_ERROR') {
      console.log('\n💡 提示: 这是无密码认证错误，请检查:');
      console.log('   1. 数据库用户是否正确');
      console.log('   2. 是否允许无密码连接');
      console.log('   3. 云服务器防火墙设置');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 提示: 连接被拒绝，请检查:');
      console.log('   1. 数据库服务是否运行');
      console.log('   2. 端口是否正确');
      console.log('   3. 防火墙设置');
    }
    
    process.exit(1);
  }
}

testConnection(); 