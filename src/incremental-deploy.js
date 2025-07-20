// 加载环境变量
require('dotenv').config();

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
const { getConfig, getAvailableEnvironments, validateConfig } = require('./db-config');

// 从 SQL 文件中提取 INSERT 语句
async function extractInsertStatements(sqlFilePath) {
  try {
    const sqlContent = await fs.readFile(sqlFilePath, 'utf8');
    const insertStatements = [];
    
    // 分割 SQL 语句
    const statements = sqlContent.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      const trimmedStmt = statement.trim();
      
      if (trimmedStmt.startsWith('INSERT INTO')) {
        // 提取表名和 ID
        const tableMatch = trimmedStmt.match(/INSERT INTO `?(\w+)`?/i);
        const idMatch = trimmedStmt.match(/VALUES\s*\((\d+)/);
        
        if (tableMatch && idMatch) {
          insertStatements.push({
            table: tableMatch[1],
            id: parseInt(idMatch[1]),
            statement: trimmedStmt
          });
        }
      }
    }
    
    return insertStatements;
  } catch (error) {
    console.error('❌ 解析 SQL 文件时出错:', error);
    throw error;
  }
}

// 获取数据库中已存在的记录 ID
async function getExistingIds(targetConnection) {
  try {
    const [tables] = await targetConnection.execute('SHOW TABLES');
    const existingIds = {};
    
    for (const tableRow of tables) {
      const tableName = Object.values(tableRow)[0];
      
      try {
        // 检查表是否有 id 字段
        const [columns] = await targetConnection.execute(`DESCRIBE \`${tableName}\``);
        const hasIdColumn = columns.some(col => col.Field.toLowerCase() === 'id');
        
        if (hasIdColumn) {
          const [rows] = await targetConnection.execute(`SELECT id FROM \`${tableName}\``);
          existingIds[tableName] = new Set(rows.map(row => row.id));
        } else {
          existingIds[tableName] = new Set();
        }
      } catch (error) {
        console.warn(`⚠️ 无法获取表 ${tableName} 的数据:`, error.message);
        existingIds[tableName] = new Set();
      }
    }
    
    return existingIds;
  } catch (error) {
    console.error('❌ 获取数据库记录时出错:', error);
    throw error;
  }
}

// 生成增量 SQL
async function generateIncrementalSQL(sqlFilePath, targetConnection) {
  try {
    console.log('📖 解析 SQL 文件...');
    const insertStatements = await extractInsertStatements(sqlFilePath);
    
    console.log('🔍 获取数据库现有记录...');
    const existingIds = await getExistingIds(targetConnection);
    
    // 找出缺失的记录
    const missingStatements = [];
    
    for (const insert of insertStatements) {
      const existingIdsForTable = existingIds[insert.table] || new Set();
      
      if (!existingIdsForTable.has(insert.id)) {
        missingStatements.push(insert);
        console.log(`📝 发现缺失记录: 表 ${insert.table}, ID ${insert.id}`);
      }
    }
    
    console.log(`\n📊 统计信息:`);
    console.log(`SQL 文件中的记录数: ${insertStatements.length}`);
    console.log(`数据库中缺失的记录数: ${missingStatements.length}`);
    
    if (missingStatements.length === 0) {
      console.log('✅ 数据库已是最新状态，无需更新！');
      return '';
    }
    
    // 生成增量 SQL
    const incrementalSQL = missingStatements.map(insert => 
      `-- 新增数据到表 ${insert.table} (ID: ${insert.id})\n${insert.statement}`
    ).join(';\n\n') + ';';
    
    return incrementalSQL;
  } catch (error) {
    console.error('❌ 生成增量 SQL 时出错:', error);
    throw error;
  }
}

// 执行增量部署
async function executeIncrementalDeploy(sqlContent, targetConnection) {
  try {
    if (!sqlContent.trim()) {
      console.log('✅ 无需执行增量部署');
      return;
    }
    
    console.log('🚀 开始执行增量部署...');
    
    // 分割SQL语句
    const statements = sqlContent.split(';').filter(stmt => stmt.trim());
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (statement && !statement.startsWith('--')) {
        console.log(`📝 执行SQL语句 ${i + 1}/${statements.length}...`);
        await targetConnection.execute(statement);
      }
    }
    
    console.log('✅ 增量部署完成！');
  } catch (error) {
    console.error('❌ 执行增量部署时出错:', error);
    throw error;
  }
}

// 主函数
async function incrementalDeploy(targetEnv, sqlFilePath = 'database.sql', outputFile = null, autoExecute = false) {
  let targetConnection;
  
  try {
    // 获取目标数据库配置
    const targetConfig = getConfig(targetEnv);

    // 检查 SQL 文件是否存在
    if (!await fs.access(sqlFilePath).then(() => true).catch(() => false)) {
      throw new Error(`SQL 文件不存在: ${sqlFilePath}`);
    }

    console.log(`🔍 连接目标数据库 (${targetEnv})...`);
    console.log(`   主机: ${targetConfig.host}:${targetConfig.port}`);
    console.log(`   数据库: ${targetConfig.database}`);
    console.log(`   用户: "${targetConfig.user}"`);
    
    targetConnection = await mysql.createConnection(targetConfig);
    
    console.log('🔍 生成增量 SQL...');
    const incrementalSQL = await generateIncrementalSQL(sqlFilePath, targetConnection);
    
    if (outputFile && incrementalSQL) {
      console.log(`💾 保存增量SQL到文件: ${outputFile}`);
      await fs.writeFile(outputFile, incrementalSQL, 'utf8');
    }
    
    // 执行部署
    if (autoExecute) {
      await executeIncrementalDeploy(incrementalSQL, targetConnection);
    } else if (incrementalSQL) {
      console.log('\n❓ 是否要执行增量部署？(y/N)');
      console.log('使用 --execute 参数可以自动执行部署');
      console.log('\n生成的增量 SQL:');
      console.log(incrementalSQL);
    }
    
  } catch (error) {
    console.error('❌ 增量部署失败:', error);
    throw error;
  } finally {
    if (targetConnection) await targetConnection.end();
  }
}

// 命令行接口
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
    console.log('🔄 增量部署工具');
    console.log('');
    console.log('用法:');
    console.log('  node incremental-deploy.js <target-env> [sql-file] [选项]');
    console.log('');
    console.log('参数:');
    console.log('  <target-env>    目标环境 (development, staging, production)');
    console.log('  [sql-file]      SQL 文件路径 (默认: database.sql)');
    console.log('');
    console.log('选项:');
    console.log('  -o, --output <file>    保存增量SQL到文件');
    console.log('  -e, --execute          自动执行部署');
    console.log('  -h, --help             显示帮助信息');
    console.log('');
    console.log('示例:');
    console.log('  node incremental-deploy.js production');
    console.log('  node incremental-deploy.js production database.sql -o incremental.sql');
    console.log('  node incremental-deploy.js production --execute');
    process.exit(1);
  }
  
  // 解析参数和选项
  const targetEnv = args[0];
  const sqlFilePath = args[1] || 'database.sql';
  let outputFile = null;
  let autoExecute = false;
  
  for (let i = 2; i < args.length; i++) {
    const arg = args[i];
    if (arg === '-o' || arg === '--output') {
      outputFile = args[++i];
    } else if (arg === '-e' || arg === '--execute') {
      autoExecute = true;
    }
  }
  
  // 验证环境参数
  const availableEnvs = getAvailableEnvironments();
  if (!targetEnv) {
    console.error('❌ 错误: 必须指定目标环境');
    console.log(`可用环境: ${availableEnvs.join(', ')}`);
    process.exit(1);
  }
  
  if (!availableEnvs.includes(targetEnv)) {
    console.error(`❌ 错误: 未知的目标环境 "${targetEnv}"`);
    console.log(`可用环境: ${availableEnvs.join(', ')}`);
    process.exit(1);
  }
  
  incrementalDeploy(targetEnv, sqlFilePath, outputFile, autoExecute)
    .then(() => {
      console.log('✅ 增量部署完成！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 增量部署失败:', error);
      process.exit(1);
    });
}

module.exports = {
  incrementalDeploy,
  generateIncrementalSQL
}; 