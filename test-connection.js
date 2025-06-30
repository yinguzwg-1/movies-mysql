const mysql = require('mysql2/promise');

async function testConnection() {
  const config = {
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'qq123456',
    database: 'nest_db',
    charset: 'utf8mb4'
  };

  console.log('🔍 测试数据库连接...');
  console.log(`   主机: ${config.host}:${config.port}`);
  console.log(`   用户: ${config.user}`);
  console.log(`   数据库: ${config.database}`);

  try {
    const connection = await mysql.createConnection(config);
    console.log('✅ 连接成功！');
    
    // 测试查询
    const [rows] = await connection.execute('SELECT 1 as test');
    console.log('✅ 查询测试成功:', rows);
    
    await connection.end();
  } catch (error) {
    console.error('❌ 连接失败:', error.message);
    console.error('错误代码:', error.code);
    console.error('错误号:', error.errno);
  }
}

testConnection(); 