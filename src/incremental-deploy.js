// 加载环境变量
require('dotenv').config();

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
const { getConfig, getAvailableEnvironments, validateConfig } = require('./db-config');

// 比较两个数据库的差异
async function compareDatabases(sourceConnection, targetConnection) {
  const differences = {
    tables: {
      added: [],
      removed: [],
      modified: []
    },
    data: {
      added: [],
      modified: [],
      removed: []
    }
  };

  try {
    // 获取源数据库和目标数据库的表列表
    const [sourceTables] = await sourceConnection.execute('SHOW TABLES');
    const [targetTables] = await targetConnection.execute('SHOW TABLES');
    
    const sourceTableNames = sourceTables.map(row => Object.values(row)[0]);
    const targetTableNames = targetTables.map(row => Object.values(row)[0]);

    // 找出新增和删除的表
    differences.tables.added = sourceTableNames.filter(name => !targetTableNames.includes(name));
    differences.tables.removed = targetTableNames.filter(name => !sourceTableNames.includes(name));

    // 比较共同表的结构和数据
    const commonTables = sourceTableNames.filter(name => targetTableNames.includes(name));
    
    for (const tableName of commonTables) {
      // 比较表结构
      const [sourceStructure] = await sourceConnection.execute(`DESCRIBE \`${tableName}\``);
      const [targetStructure] = await targetConnection.execute(`DESCRIBE \`${tableName}\``);
      
      if (JSON.stringify(sourceStructure) !== JSON.stringify(targetStructure)) {
        differences.tables.modified.push(tableName);
      }

      // 比较数据
      const [sourceData] = await sourceConnection.execute(`SELECT * FROM \`${tableName}\` ORDER BY id`);
      const [targetData] = await targetConnection.execute(`SELECT * FROM \`${tableName}\` ORDER BY id`);
      
      const sourceDataMap = new Map(sourceData.map(row => [row.id, row]));
      const targetDataMap = new Map(targetData.map(row => [row.id, row]));

      // 找出新增、修改和删除的数据
      for (const [id, sourceRow] of sourceDataMap) {
        if (!targetDataMap.has(id)) {
          differences.data.added.push({ table: tableName, id, data: sourceRow });
        } else {
          const targetRow = targetDataMap.get(id);
          if (JSON.stringify(sourceRow) !== JSON.stringify(targetRow)) {
            differences.data.modified.push({ table: tableName, id, sourceData: sourceRow, targetData: targetRow });
          }
        }
      }

      for (const [id, targetRow] of targetDataMap) {
        if (!sourceDataMap.has(id)) {
          differences.data.removed.push({ table: tableName, id, data: targetRow });
        }
      }
    }

    return differences;
  } catch (error) {
    console.error('❌ 比较数据库时出错:', error);
    throw error;
  }
}

// 生成增量更新SQL
async function generateIncrementalSQL(differences, sourceConnection) {
  const sqlStatements = [];
  
  try {
    // 处理新增的表
    for (const tableName of differences.tables.added) {
      console.log(`📝 生成新增表 ${tableName} 的SQL...`);
      
      // 获取表结构
      const [createTableResult] = await sourceConnection.execute(`SHOW CREATE TABLE \`${tableName}\``);
      const createTableSQL = createTableResult[0]['Create Table'];
      sqlStatements.push(`-- 新增表 ${tableName}`);
      sqlStatements.push(createTableSQL + ';');
      
      // 获取表数据
      const [tableData] = await sourceConnection.execute(`SELECT * FROM \`${tableName}\``);
      if (tableData.length > 0) {
        const [columns] = await sourceConnection.execute(`DESCRIBE \`${tableName}\``);
        const columnNames = columns.map(col => col.Field);
        
        sqlStatements.push(`-- 插入表 ${tableName} 的数据`);
        sqlStatements.push(`INSERT INTO \`${tableName}\` (\`${columnNames.join('`, `')}\`) VALUES`);
        
        const values = tableData.map(row => {
          const rowValues = columnNames.map(col => {
            const value = row[col];
            if (value === null || value === undefined) {
              return 'NULL';
            } else if (typeof value === 'string') {
              return `'${value.replace(/'/g, "''")}'`;
            } else {
              return value;
            }
          });
          return `(${rowValues.join(', ')})`;
        });
        
        sqlStatements.push(values.join(',\n') + ';');
      }
    }

    // 处理删除的表
    for (const tableName of differences.tables.removed) {
      console.log(`📝 生成删除表 ${tableName} 的SQL...`);
      sqlStatements.push(`-- 删除表 ${tableName}`);
      sqlStatements.push(`DROP TABLE IF EXISTS \`${tableName}\`;`);
    }

    // 处理修改的表结构
    for (const tableName of differences.tables.modified) {
      console.log(`📝 生成修改表 ${tableName} 结构的SQL...`);
      sqlStatements.push(`-- 修改表 ${tableName} 结构`);
      sqlStatements.push(`-- 注意：需要手动处理表结构变更`);
      sqlStatements.push(`-- ALTER TABLE \`${tableName}\` ...;`);
    }

    // 处理数据变更
    for (const change of differences.data.added) {
      console.log(`📝 生成新增数据 SQL (表: ${change.table}, ID: ${change.id})...`);
      const columnNames = Object.keys(change.data);
      const values = columnNames.map(col => {
        const value = change.data[col];
        if (value === null || value === undefined) {
          return 'NULL';
        } else if (typeof value === 'string') {
          return `'${value.replace(/'/g, "''")}'`;
        } else {
          return value;
        }
      });
      
      sqlStatements.push(`-- 新增数据到表 ${change.table}`);
      sqlStatements.push(`INSERT INTO \`${change.table}\` (\`${columnNames.join('`, `')}\`) VALUES (${values.join(', ')});`);
    }

    for (const change of differences.data.modified) {
      console.log(`📝 生成修改数据 SQL (表: ${change.table}, ID: ${change.id})...`);
      const updates = Object.keys(change.sourceData).map(col => {
        const value = change.sourceData[col];
        if (value === null || value === undefined) {
          return `\`${col}\` = NULL`;
        } else if (typeof value === 'string') {
          return `\`${col}\` = '${value.replace(/'/g, "''")}'`;
        } else {
          return `\`${col}\` = ${value}`;
        }
      });
      
      sqlStatements.push(`-- 修改表 ${change.table} 的数据 (ID: ${change.id})`);
      sqlStatements.push(`UPDATE \`${change.table}\` SET ${updates.join(', ')} WHERE id = ${change.id};`);
    }

    for (const change of differences.data.removed) {
      console.log(`📝 生成删除数据 SQL (表: ${change.table}, ID: ${change.id})...`);
      sqlStatements.push(`-- 删除表 ${change.table} 的数据 (ID: ${change.id})`);
      sqlStatements.push(`DELETE FROM \`${change.table}\` WHERE id = ${change.id};`);
    }

    return sqlStatements.join('\n\n');
  } catch (error) {
    console.error('❌ 生成增量SQL时出错:', error);
    throw error;
  }
}

// 执行增量部署
async function executeIncrementalDeploy(sqlContent, targetConnection) {
  try {
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
async function incrementalDeploy(sourceEnv, targetEnv, outputFile = null, autoExecute = false) {
  let sourceConnection, targetConnection;
  
  try {
    // 获取配置（简化版：所有环境使用相同配置）
    const sourceConfig = getConfig();
    const targetConfig = getConfig();

    // 调试信息：显示环境变量和最终配置
    console.log(`🔍 环境变量检查:`);
    console.log(`   DB_HOST: "${process.env.DB_HOST}"`);
    console.log(`   DB_USER: "${process.env.DB_USER}"`);
    console.log(`   DB_PASSWORD: "${process.env.DB_PASSWORD || '(无密码)'}"`);
    console.log(`   DB_NAME: "${process.env.DB_NAME}"`);
    console.log(`   DB_PORT: "${process.env.DB_PORT}"`);
    
    console.log(`🔍 连接数据库...`);
    console.log(`   主机: ${sourceConfig.host}:${sourceConfig.port}`);
    console.log(`   数据库: ${sourceConfig.database}`);
    console.log(`   用户: "${sourceConfig.user}" (长度: ${sourceConfig.user.length})`);
    console.log(`   密码: ${sourceConfig.password || '(无密码)'}`);
    
    sourceConnection = await mysql.createConnection(sourceConfig);
    
    // 简化版：源数据库和目标数据库是同一个
    targetConnection = sourceConnection;
    
    console.log('🔍 比较数据库差异...');
    const differences = await compareDatabases(sourceConnection, targetConnection);
    
    // 输出差异报告
    console.log('\n📊 差异报告:');
    console.log(`新增表: ${differences.tables.added.length}`);
    console.log(`删除表: ${differences.tables.removed.length}`);
    console.log(`修改表: ${differences.tables.modified.length}`);
    console.log(`新增数据: ${differences.data.added.length}`);
    console.log(`修改数据: ${differences.data.modified.length}`);
    console.log(`删除数据: ${differences.data.removed.length}`);
    
    if (differences.tables.added.length === 0 && 
        differences.tables.removed.length === 0 && 
        differences.tables.modified.length === 0 &&
        differences.data.added.length === 0 && 
        differences.data.modified.length === 0 && 
        differences.data.removed.length === 0) {
      console.log('✅ 数据库已是最新状态，无需更新！');
      return;
    }
    
    console.log('\n📝 生成增量SQL...');
    const incrementalSQL = await generateIncrementalSQL(differences, sourceConnection);
    
    if (outputFile) {
      console.log(`💾 保存增量SQL到文件: ${outputFile}`);
      await fs.writeFile(outputFile, incrementalSQL, 'utf8');
    }
    
    // 执行部署
    if (autoExecute) {
      await executeIncrementalDeploy(incrementalSQL, targetConnection);
    } else {
      console.log('\n❓ 是否要执行增量部署？(y/N)');
      console.log('使用 --execute 参数可以自动执行部署');
    }
    
  } catch (error) {
    console.error('❌ 增量部署失败:', error);
    throw error;
  } finally {
    if (sourceConnection) await sourceConnection.end();
    if (targetConnection) await targetConnection.end();
  }
}

// 命令行接口
if (require.main === module) {
  const args = process.argv.slice(2);
  
  // 简化版：不需要指定源环境和目标环境
  if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
    console.log('🔄 执行增量部署: 开发环境');
    console.log('');
    console.log('选项:');
    console.log('  -o, --output <file>    保存增量SQL到文件');
    console.log('  -e, --execute          自动执行部署');
    console.log('  -h, --help             显示帮助信息');
    console.log('');
    console.log('示例:');
    console.log('  node incremental-deploy.js');
    console.log('  node incremental-deploy.js -o incremental.sql');
    console.log('  node incremental-deploy.js --execute');
    process.exit(1);
  }
  
  // 解析选项
  let outputFile = null;
  let autoExecute = false;
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '-o' || arg === '--output') {
      outputFile = args[++i];
    } else if (arg === '-e' || arg === '--execute') {
      autoExecute = true;
    }
  }
  
  // 简化版：使用默认环境
  incrementalDeploy('development', 'development', outputFile, autoExecute)
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
  compareDatabases,
  generateIncrementalSQL
}; 