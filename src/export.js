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
  .action(async (options) => {
    try {
      await exportDatabase(options.output, options.database);
    } catch (error) {
      console.error(chalk.red('❌ 导出失败:'), error.message);
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
async function exportDatabase(outputFile = 'database.sql', targetDatabase = 'nest_db') {
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
    
    // 获取数据
    spinner.text = '正在导出数据...';
    const data = await getDatabaseData(connection);
    
    // 关闭连接
    await connection.end();
    
    // 生成 SQL 文件
    spinner.text = '正在生成 SQL 文件...';
    const sqlContent = generateSqlContent(structure, data, targetDatabase);
    
    // 确保输出目录存在
    const outputDir = path.dirname(outputFile);
    if (outputDir && !fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // 写入文件
    fs.writeFileSync(outputFile, sqlContent, 'utf8');
    
    spinner.succeed(chalk.green('✅ 数据库导出成功！'));
    console.log(chalk.blue(`📁 文件位置: ${path.resolve(outputFile)}`));
    
    // 显示文件信息
    const stats = fs.statSync(outputFile);
    const fileSize = (stats.size / 1024).toFixed(2);
    console.log(chalk.blue(`📊 文件大小: ${fileSize} KB`));
    console.log(chalk.blue(`🎯 目标数据库: ${targetDatabase}`));
    
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
function generateSqlContent(structure, data, databaseName) {
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
    ...data,
    '',
    'COMMIT;',
    'SET FOREIGN_KEY_CHECKS = 1;'
  ].join('\n');
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