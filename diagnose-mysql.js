const mysql = require('mysql2/promise');

async function diagnoseMySQL() {
  console.log('🔍 MySQL连接诊断');
  console.log('================');
  
  // 测试配置1：使用环境变量
  const config1 = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Zhengwenguo0503.',
    database: process.env.DB_NAME || 'nest_db',
    charset: 'utf8mb4'
  };
  
  console.log('📋 配置1 (环境变量):');
  console.log(`   主机: ${config1.host}:${config1.port}`);
  console.log(`   用户: ${config1.user}`);
  console.log(`   数据库: ${config1.database}`);
  console.log(`   密码: ${config1.password ? '***' : '未设置'}`);
  
  try {
    console.log('\n🔗 尝试连接配置1...');
    const connection1 = await mysql.createConnection(config1);
    console.log('✅ 配置1连接成功！');
    
    // 测试查询
    const [rows1] = await connection1.execute('SELECT VERSION() as version, USER() as user');
    console.log('📊 数据库信息:', rows1[0]);
    
    await connection1.end();
  } catch (error) {
    console.log('❌ 配置1连接失败:', error.message);
    console.log('   错误代码:', error.code);
    console.log('   错误号:', error.errno);
  }
  
  // 测试配置2：使用socket连接
  const config2 = {
    socketPath: '/var/run/mysqld/mysqld.sock',
    user: 'root',
    password: 'Zhengwenguo0503.',
    database: 'nest_db',
    charset: 'utf8mb4'
  };
  
  console.log('\n📋 配置2 (Socket连接):');
  console.log(`   Socket: ${config2.socketPath}`);
  console.log(`   用户: ${config2.user}`);
  console.log(`   数据库: ${config2.database}`);
  
  try {
    console.log('\n🔗 尝试连接配置2...');
    const connection2 = await mysql.createConnection(config2);
    console.log('✅ 配置2连接成功！');
    
    const [rows2] = await connection2.execute('SELECT VERSION() as version, USER() as user');
    console.log('📊 数据库信息:', rows2[0]);
    
    await connection2.end();
  } catch (error) {
    console.log('❌ 配置2连接失败:', error.message);
    console.log('   错误代码:', error.code);
    console.log('   错误号:', error.errno);
  }
  
  // 测试配置3：127.0.0.1
  const config3 = {
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: 'Zhengwenguo0503.',
    database: 'nest_db',
    charset: 'utf8mb4'
  };
  
  console.log('\n📋 配置3 (127.0.0.1):');
  console.log(`   主机: ${config3.host}:${config3.port}`);
  console.log(`   用户: ${config3.user}`);
  console.log(`   数据库: ${config3.database}`);
  
  try {
    console.log('\n🔗 尝试连接配置3...');
    const connection3 = await mysql.createConnection(config3);
    console.log('✅ 配置3连接成功！');
    
    const [rows3] = await connection3.execute('SELECT VERSION() as version, USER() as user');
    console.log('📊 数据库信息:', rows3[0]);
    
    await connection3.end();
  } catch (error) {
    console.log('❌ 配置3连接失败:', error.message);
    console.log('   错误代码:', error.code);
    console.log('   错误号:', error.errno);
  }
  
  console.log('\n💡 建议:');
  console.log('1. 如果所有连接都失败，请检查MySQL服务是否运行');
  console.log('2. 如果只有某些连接失败，请检查用户权限和认证插件');
  console.log('3. 运行 fix-mysql-access.sh 脚本来修复权限问题');
}

diagnoseMySQL().catch(console.error); 