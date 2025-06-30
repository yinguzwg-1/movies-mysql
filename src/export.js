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
  .action(async (options) => {
    try {
      await exportDatabase(options.output);
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
async function exportDatabase(outputFile = 'database.sql') {
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
    const sqlContent = generateSqlContent(structure, data, config.database);
    
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
    structure.push(createTable[0]['Create Table'] + ';');
    
    // 获取索引
    const [indexes] = await connection.execute(`SHOW INDEX FROM \`${tableName}\``);
    for (const index of indexes) {
      if (index.Key_name !== 'PRIMARY') {
        structure.push(`CREATE INDEX \`${index.Key_name}\` ON \`${tableName}\` (\`${index.Column_name}\`);`);
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
      // 获取列名
      const [columns] = await connection.execute(`DESCRIBE \`${tableName}\``);
      const columnNames = columns.map(col => col.Field);
      
      // 生成INSERT语句
      data.push(`-- 表 ${tableName} 的数据`);
      data.push(`INSERT INTO \`${tableName}\` (\`${columnNames.join('`, `')}\`) VALUES`);
      
      const values = rows.map(row => {
        const rowValues = columnNames.map(col => {
          const value = row[col];
          if (value === null) return 'NULL';
          if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
          return value;
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