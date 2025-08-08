#!/usr/bin/env node

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const { Command } = require('commander');
const chalk = require('chalk');
const ora = require('ora');

// 创建命令行程序
const program = new Command();

program
  .name('movies-mysql-export')
  .description('简单的数据库导出工具')
  .version('1.0.0');

// 导出命令
program
  .command('export')
  .description('导出数据库到 SQL 文件')
  .option('-o, --output <file>', '输出文件名', 'database.sql')
  .option('-d, --database <name>', '目标数据库名称', 'nest_db')
  .option('-s, --structure-only', '只导出表结构，不导出数据', false)
  .action(async (options) => {
    try {
      await exportDatabase(options.output, options.database, options.structureOnly);
    } catch (error) {
      console.error(chalk.red('❌ 导出失败:'), error.message);
      process.exit(1);
    }
  });

// 对比命令
program
  .command('compare')
  .description('对比两个数据库的表字段差异')
  .option('-s, --source <database>', '源数据库名称', 'nest_db')
  .option('-t, --target <database>', '目标数据库名称', 'nest_db_new')
  .option('-o, --output <file>', '输出文件名', 'update.sql')
  .option('-f, --file <sqlfile>', '本地SQL文件路径', 'database.sql')
  .action(async (options) => {
    try {
      if (options.file && options.file !== 'database.sql') {
        // 如果指定了SQL文件，则比较SQL文件与目标数据库
        await compareSqlFileWithDatabase(options.file, options.target, options.output);
      } else {
        // 否则比较两个数据库
        await compareDatabases(options.source, options.target, options.output);
      }
    } catch (error) {
      console.error(chalk.red('❌ 对比失败:'), error.message);
      process.exit(1);
    }
  });

// 如果没有提供命令，默认执行导出
if (!process.argv.slice(2).length) {
  program.parse(['node', 'export']);
} else {
  program.parse();
}

// 导出数据库
async function exportDatabase(outputFile = 'database.sql', targetDatabase = 'nest_db', structureOnly = false) {
  const spinner = ora('正在导出数据库...').start();
  
  try {
    // 加载环境变量
    require('dotenv').config();
    
    // 获取配置
    const config = {
      host: process.env.LOCAL_DB_HOST || 'localhost',
      port: parseInt(process.env.LOCAL_DB_PORT) || 3306,
      user: process.env.LOCAL_DB_USER || 'root',
      password: process.env.LOCAL_DB_PASSWORD,
      database: process.env.LOCAL_DB_NAME
    };
    
    // 验证配置
    if (!config.password) {
      throw new Error('请设置 LOCAL_DB_PASSWORD 环境变量');
    }
    if (!config.database) {
      throw new Error('请设置 LOCAL_DB_NAME 环境变量');
    }
    
    console.log(chalk.blue(`📊 从数据库: ${config.database}`));
    console.log(chalk.blue(`📊 导出到数据库: ${targetDatabase}`));
    
    // 连接数据库
    spinner.text = '正在连接数据库...';
    const connection = await mysql.createConnection(config);
    
    // 获取数据库结构
    spinner.text = '正在导出数据库结构...';
    const structure = await getDatabaseStructure(connection);
    
    // 获取数据（如果不需要只导出结构）
    let data = [];
    if (!structureOnly) {
      spinner.text = '正在导出数据...';
      data = await getDatabaseData(connection);
    }
    
    // 关闭连接
    await connection.end();
    
    // 生成 SQL 文件
    spinner.text = '正在生成 SQL 文件...';
    const sqlContent = generateSqlContent(structure, data, targetDatabase, structureOnly);
    
    // 确保输出目录存在
    const outputDir = path.dirname(outputFile);
    if (outputDir && !fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // 写入文件
    fs.writeFileSync(outputFile, sqlContent, 'utf8');
    
    const exportType = structureOnly ? '表结构' : '完整数据库';
    spinner.succeed(chalk.green(`✅ ${exportType}导出成功！`));
    console.log(chalk.blue(`📁 文件位置: ${path.resolve(outputFile)}`));
    
    // 显示文件信息
    const stats = fs.statSync(outputFile);
    const fileSize = (stats.size / 1024).toFixed(2);
    console.log(chalk.blue(`📊 文件大小: ${fileSize} KB`));
    console.log(chalk.blue(`🎯 目标数据库: ${targetDatabase}`));
    if (structureOnly) {
      console.log(chalk.yellow(`📋 导出类型: 仅表结构`));
    }
    
  } catch (error) {
    spinner.fail(chalk.red('❌ 导出失败'));
    throw error;
  }
}

// 获取数据库结构
async function getDatabaseStructure(connection) {
  const structure = [];
  
  // 获取所有表
  const [tables] = await connection.execute('SHOW TABLES');
  
  for (const table of tables) {
    const tableName = Object.values(table)[0];
    
    // 获取建表语句
    const [createTable] = await connection.execute(`SHOW CREATE TABLE \`${tableName}\``);
    const createTableSql = createTable[0]['Create Table'] + ';';
    structure.push(createTableSql);
    
    // 从CREATE TABLE语句中提取已定义的索引名称
    const definedIndexes = new Set();
    const indexMatches = createTableSql.match(/KEY\s+`([^`]+)`\s*\([^)]+\)/g);
    if (indexMatches) {
      indexMatches.forEach(match => {
        const indexNameMatch = match.match(/KEY\s+`([^`]+)`/);
        if (indexNameMatch) {
          definedIndexes.add(indexNameMatch[1]);
        }
      });
    }
    
    // 获取索引信息，避免重复
    const [indexes] = await connection.execute(`SHOW INDEX FROM \`${tableName}\``);
    const processedIndexes = new Set(); // 用于跟踪已处理的索引
    
    for (const index of indexes) {
      if (index.Key_name !== 'PRIMARY' && !definedIndexes.has(index.Key_name)) {
        const indexKey = `${tableName}.${index.Key_name}`;
        
        // 如果这个索引还没有处理过
        if (!processedIndexes.has(indexKey)) {
          processedIndexes.add(indexKey);
          
          // 获取这个索引的所有列
          const indexColumns = indexes
            .filter(idx => idx.Key_name === index.Key_name && idx.Table === tableName)
            .sort((a, b) => a.Seq_in_index - b.Seq_in_index)
            .map(idx => `\`${idx.Column_name}\``)
            .join(', ');
          
          // 生成正确的索引创建语句
          structure.push(`CREATE INDEX \`${index.Key_name}\` ON \`${tableName}\` (${indexColumns});`);
        }
      }
    }
  }
  
  return structure;
}

// 获取数据库数据
async function getDatabaseData(connection) {
  const data = [];
  
  // 获取所有表
  const [tables] = await connection.execute('SHOW TABLES');
  
  for (const table of tables) {
    const tableName = Object.values(table)[0];
    
    // 获取表数据
    const [rows] = await connection.execute(`SELECT * FROM \`${tableName}\``);
    
    if (rows.length > 0) {
      // 获取列名和列类型
      const [columns] = await connection.execute(`DESCRIBE \`${tableName}\``);
      const columnNames = columns.map(col => col.Field);
      const columnTypes = columns.map(col => col.Type);
      
      // 生成INSERT语句
      data.push(`-- 表 ${tableName} 的数据`);
      data.push(`INSERT INTO \`${tableName}\` (\`${columnNames.join('`, `')}\`) VALUES`);
      
      const values = rows.map(row => {
        const rowValues = columnNames.map((col, index) => {
          const value = row[col];
          const columnType = columnTypes[index];
          
          if (value === null) return 'NULL';
          
          // 处理JSON类型
          if (columnType && columnType.toLowerCase().includes('json')) {
            if (typeof value === 'object' && value !== null) {
              // 如果是对象，转换为JSON字符串
              return `'${JSON.stringify(value).replace(/'/g, "''").replace(/\\/g, "\\\\")}'`;
            } else if (typeof value === 'string') {
              // 如果已经是字符串，检查是否是有效的JSON
              try {
                JSON.parse(value);
                return `'${value.replace(/'/g, "''").replace(/\\/g, "\\\\")}'`;
              } catch (e) {
                // 如果不是有效JSON，直接返回字符串
                return `'${value.replace(/'/g, "''").replace(/\\/g, "\\\\")}'`;
              }
            } else {
              // 其他类型转换为JSON字符串
              return `'${JSON.stringify(value).replace(/'/g, "''").replace(/\\/g, "\\\\")}'`;
            }
          }
          
          // 处理日期时间类型
          if (value instanceof Date) {
            return `'${value.toISOString().slice(0, 19).replace('T', ' ')}'`;
          }
          
          // 处理字符串类型的日期时间
          if (typeof value === 'string') {
            // 检查是否是日期时间格式
            if (value.match(/^\w{3}\s+\w{3}\s+\d{1,2}\s+\d{4}\s+\d{2}:\d{2}:\d{2}\s+GMT\+\d{4}/)) {
              try {
                const date = new Date(value);
                if (!isNaN(date.getTime())) {
                  return `'${date.toISOString().slice(0, 19).replace('T', ' ')}'`;
                }
              } catch (e) {
                // 如果解析失败，使用原始值
              }
            }
            
            // 处理普通字符串，转义单引号和其他特殊字符
            return `'${value.replace(/'/g, "''").replace(/\\/g, "\\\\")}'`;
          }
          
          // 处理数字类型
          if (typeof value === 'number') {
            return value.toString();
          }
          
          // 处理布尔类型
          if (typeof value === 'boolean') {
            return value ? '1' : '0';
          }
          
          // 处理其他类型，转换为字符串并转义
          return `'${String(value).replace(/'/g, "''").replace(/\\/g, "\\\\")}'`;
        });
        return `(${rowValues.join(', ')})`;
      });
      
      data.push(values.join(',\n') + ';');
      data.push('');
    }
  }
  
  return data;
}

// 生成 SQL 内容
function generateSqlContent(structure, data, databaseName, structureOnly = false) {
  const timestamp = new Date().toISOString();
  
  return [
    `-- 数据库导出`,
    `-- 创建时间: ${timestamp}`,
    `-- 数据库: ${databaseName}`,
    '',
    'SET FOREIGN_KEY_CHECKS = 0;',
    'SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";',
    'SET AUTOCOMMIT = 0;',
    'START TRANSACTION;',
    'SET time_zone = "+00:00";',
    '',
    '-- 创建数据库',
    '-- --------------------------------------------------------',
    '',
    `CREATE DATABASE IF NOT EXISTS \`${databaseName}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`,
    `USE \`${databaseName}\`;`,
    '',
    '-- 数据库结构',
    '-- --------------------------------------------------------',
    '',
    ...structure,
    '',
    '-- 数据库数据',
    '-- --------------------------------------------------------',
    '',
    ...(structureOnly ? ['-- 仅导出表结构，跳过数据导出'] : data),
    '',
    'COMMIT;',
    'SET FOREIGN_KEY_CHECKS = 1;'
  ].join('\n');
}

// 对比SQL文件与数据库结构
async function compareSqlFileWithDatabase(sqlFile, targetDb, outputFile) {
  const spinner = ora('正在对比SQL文件与数据库字段差异...').start();
  
  try {
    // 检查SQL文件是否存在
    if (!fs.existsSync(sqlFile)) {
      throw new Error(`SQL文件不存在: ${sqlFile}`);
    }
    
    // 加载环境变量
    require('dotenv').config();
    
    // 获取配置
    const config = {
      host: process.env.LOCAL_DB_HOST || 'localhost',
      port: parseInt(process.env.LOCAL_DB_PORT) || 3306,
      user: process.env.LOCAL_DB_USER || 'root',
      password: process.env.LOCAL_DB_PASSWORD
    };
    
    if (!config.password) {
      throw new Error('请设置 LOCAL_DB_PASSWORD 环境变量');
    }
    
    console.log(chalk.blue(`📄 SQL文件: ${sqlFile}`));
    console.log(chalk.blue(`📊 目标数据库: ${targetDb}`));
    
    // 连接数据库
    spinner.text = '正在连接数据库...';
    const connection = await mysql.createConnection(config);
    
    // 获取目标数据库结构
    spinner.text = '正在获取目标数据库表结构...';
    await connection.execute(`USE \`${targetDb}\``);
    const targetStructure = await getDatabaseStructure(connection);
    
    // 关闭连接
    await connection.end();
    
    // 解析SQL文件结构
    spinner.text = '正在解析SQL文件结构...';
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');
    const sourceStructure = parseSqlFileStructure(sqlContent);
    
    // 生成更新脚本
    spinner.text = '正在生成字段更新脚本...';
    const updateScript = generateUpdateScript(sourceStructure, targetStructure, targetDb);
    
    // 确保输出目录存在
    const outputDir = path.dirname(outputFile);
    if (outputDir && !fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // 写入文件
    fs.writeFileSync(outputFile, updateScript, 'utf8');
    
    spinner.succeed(chalk.green('✅ SQL文件与数据库字段对比完成！'));
    console.log(chalk.blue(`📁 字段更新脚本位置: ${path.resolve(outputFile)}`));
    
    // 显示文件信息
    const stats = fs.statSync(outputFile);
    const fileSize = (stats.size / 1024).toFixed(2);
    console.log(chalk.blue(`📊 文件大小: ${fileSize} KB`));
    
  } catch (error) {
    spinner.fail(chalk.red('❌ 对比失败'));
    throw error;
  }
}

// 解析SQL文件结构
function parseSqlFileStructure(sqlContent) {
  const structure = [];
  const lines = sqlContent.split('\n');
  
  let inCreateTable = false;
  let currentTable = '';
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // 跳过注释和空行
    if (trimmedLine.startsWith('--') || trimmedLine === '') {
      continue;
    }
    
    // 检查是否是CREATE TABLE语句
    if (trimmedLine.toUpperCase().startsWith('CREATE TABLE')) {
      inCreateTable = true;
      currentTable = trimmedLine;
    } else if (inCreateTable) {
      currentTable += ' ' + trimmedLine;
      
      // 检查是否到达语句结束
      if (trimmedLine.endsWith(';')) {
        structure.push(currentTable);
        inCreateTable = false;
        currentTable = '';
      }
    }
  }
  
  return structure;
}

// 对比数据库结构
async function compareDatabases(sourceDb, targetDb, outputFile) {
  const spinner = ora('正在对比数据库字段差异...').start();
  
  try {
    // 加载环境变量
    require('dotenv').config();
    
    // 获取配置
    const config = {
      host: process.env.LOCAL_DB_HOST || 'localhost',
      port: parseInt(process.env.LOCAL_DB_PORT) || 3306,
      user: process.env.LOCAL_DB_USER || 'root',
      password: process.env.LOCAL_DB_PASSWORD
    };
    
    if (!config.password) {
      throw new Error('请设置 LOCAL_DB_PASSWORD 环境变量');
    }
    
    console.log(chalk.blue(`📊 源数据库: ${sourceDb}`));
    console.log(chalk.blue(`📊 目标数据库: ${targetDb}`));
    
    // 连接数据库
    spinner.text = '正在连接数据库...';
    const connection = await mysql.createConnection(config);
    
    // 获取源数据库结构
    spinner.text = '正在获取源数据库表结构...';
    await connection.execute(`USE \`${sourceDb}\``);
    const sourceStructure = await getDatabaseStructure(connection);
    
    // 获取目标数据库结构
    spinner.text = '正在获取目标数据库表结构...';
    await connection.execute(`USE \`${targetDb}\``);
    const targetStructure = await getDatabaseStructure(connection);
    
    // 关闭连接
    await connection.end();
    
    // 生成更新脚本
    spinner.text = '正在生成字段更新脚本...';
    const updateScript = generateUpdateScript(sourceStructure, targetStructure, targetDb);
    
    // 确保输出目录存在
    const outputDir = path.dirname(outputFile);
    if (outputDir && !fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // 写入文件
    fs.writeFileSync(outputFile, updateScript, 'utf8');
    
    spinner.succeed(chalk.green('✅ 数据库字段对比完成！'));
    console.log(chalk.blue(`📁 字段更新脚本位置: ${path.resolve(outputFile)}`));
    
    // 显示文件信息
    const stats = fs.statSync(outputFile);
    const fileSize = (stats.size / 1024).toFixed(2);
    console.log(chalk.blue(`📊 文件大小: ${fileSize} KB`));
    
  } catch (error) {
    spinner.fail(chalk.red('❌ 对比失败'));
    throw error;
  }
}

// 生成更新脚本
function generateUpdateScript(sourceStructure, targetStructure, targetDb) {
  const timestamp = new Date().toISOString();
  
  // 解析表结构
  const sourceTables = parseTableStructures(sourceStructure);
  const targetTables = parseTableStructures(targetStructure);
  
  const updates = [];
  let hasChanges = false;
  
  // 只对比两个数据库中都存在的表的字段差异
  for (const [tableName, sourceTable] of Object.entries(sourceTables)) {
    if (targetTables[tableName]) {
      // 表在两个数据库中都存在，对比字段
      const targetTable = targetTables[tableName];
      const fieldUpdates = compareTableFields(tableName, sourceTable, targetTable);
      if (fieldUpdates.length > 0) {
        updates.push(`-- 更新表 ${tableName} 的字段`);
        updates.push(...fieldUpdates);
        updates.push('');
        hasChanges = true;
      }
    } else {
      // 源数据库中有但目标数据库中没有的表
      updates.push(`-- 表 ${tableName} 在目标数据库中不存在，跳过字段对比`);
      updates.push('');
    }
  }
  
  // 检查目标数据库中有但源数据库中没有的表
  for (const tableName of Object.keys(targetTables)) {
    if (!sourceTables[tableName]) {
      updates.push(`-- 表 ${tableName} 在源数据库中不存在，跳过字段对比`);
      updates.push('');
    }
  }
  
  if (!hasChanges) {
    updates.push('-- 没有发现字段差异');
  }
  
  return [
    `-- 数据库字段对比更新脚本`,
    `-- 创建时间: ${timestamp}`,
    `-- 源数据库: ${targetDb}`,
    `-- 目标数据库: ${targetDb}`,
    `-- 注意: 此脚本只处理字段差异，不创建或删除表`,
    '',
    'SET FOREIGN_KEY_CHECKS = 0;',
    'SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";',
    'SET AUTOCOMMIT = 0;',
    'START TRANSACTION;',
    'SET time_zone = "+00:00";',
    '',
    '-- 字段更新',
    '-- --------------------------------------------------------',
    '',
    ...updates,
    '',
    'COMMIT;',
    'SET FOREIGN_KEY_CHECKS = 1;'
  ].join('\n');
}

// 解析表结构
function parseTableStructures(structure) {
  const tables = {};
  let currentTable = null;
  
  for (const line of structure) {
    if (line.startsWith('CREATE TABLE')) {
      // 提取表名
      const tableNameMatch = line.match(/CREATE TABLE `([^`]+)`/);
      if (tableNameMatch) {
        const tableName = tableNameMatch[1];
        currentTable = {
          name: tableName,
          createTable: line,
          fields: []
        };
        tables[tableName] = currentTable;
        
        // 解析字段定义
        const fieldMatches = line.match(/`([^`]+)`\s+([^,\n]+)/g);
        if (fieldMatches) {
          fieldMatches.forEach(match => {
            const fieldMatch = match.match(/`([^`]+)`\s+([^,\n]+)/);
            if (fieldMatch) {
              currentTable.fields.push({
                name: fieldMatch[1],
                definition: fieldMatch[2].trim()
              });
            }
          });
        }
      }
    }
  }
  
  return tables;
}

// 对比表字段
function compareTableFields(tableName, sourceTable, targetTable) {
  const updates = [];
  const sourceFields = new Map(sourceTable.fields.map(f => [f.name, f]));
  const targetFields = new Map(targetTable.fields.map(f => [f.name, f]));
  
  // 检查需要添加的字段
  for (const [fieldName, sourceField] of sourceFields) {
    if (!targetFields.has(fieldName)) {
      updates.push(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${fieldName}\` ${sourceField.definition};`);
    } else {
      // 字段存在，检查定义是否相同
      const targetField = targetFields.get(fieldName);
      if (sourceField.definition !== targetField.definition) {
        updates.push(`ALTER TABLE \`${tableName}\` MODIFY COLUMN \`${fieldName}\` ${sourceField.definition};`);
      }
    }
  }
  
  // 检查需要删除的字段
  for (const [fieldName, targetField] of targetFields) {
    if (!sourceFields.has(fieldName)) {
      updates.push(`ALTER TABLE \`${tableName}\` DROP COLUMN \`${fieldName}\`;`);
    }
  }
  
  return updates;
}

// 解析命令行参数
const args = process.argv.slice(2);
const command = args[0];

// 默认输出文件名
const defaultOutputFile = 'database.sql';

if (command === 'export') {
  const outputIndex = args.indexOf('-o');
  const outputFile = outputIndex !== -1 ? args[outputIndex + 1] : defaultOutputFile;
  
  console.log('🚀 开始导出数据库...');
  exportDatabase(outputFile);
} else if (command === 'import') {
  const inputIndex = args.indexOf('-i');
  const inputFile = inputIndex !== -1 ? args[inputIndex + 1] : defaultOutputFile;
  
  console.log('🚀 开始导入数据库...');
  importDatabase(inputFile);
} else {
  console.log('❌ 无效的命令');
  console.log('用法:');
  console.log('  node export.js export [-o output_file]');
  console.log('  node export.js import [-i input_file]');
  process.exit(1);
} 