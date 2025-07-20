// 加载环境变量
require('dotenv').config();

const fs = require('fs').promises;
const path = require('path');

// 处理 SQL 文件，添加 IF NOT EXISTS 和 IGNORE 选项
async function processSQLFile(inputFile, outputFile) {
  try {
    console.log(`📖 读取 SQL 文件: ${inputFile}`);
    const sqlContent = await fs.readFile(inputFile, 'utf8');
    
    console.log('🔧 处理 SQL 文件...');
    
    // 分割 SQL 语句（更精确的分割）
    const statements = [];
    const lines = sqlContent.split('\n');
    let currentStatement = '';
    let inStatement = false;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // 跳过注释行
      if (trimmedLine.startsWith('--') || trimmedLine === '') {
        continue;
      }
      
      // 检查是否是新语句的开始
      if (trimmedLine.startsWith('CREATE TABLE') || 
          trimmedLine.startsWith('INSERT INTO') || 
          trimmedLine.startsWith('DROP TABLE') ||
          trimmedLine.startsWith('ALTER TABLE') ||
          trimmedLine.startsWith('UPDATE') ||
          trimmedLine.startsWith('DELETE FROM') ||
          trimmedLine.startsWith('CREATE DATABASE') ||
          trimmedLine.startsWith('USE ') ||
          trimmedLine.startsWith('SET ')) {
        
        // 如果当前有未完成的语句，先保存它
        if (currentStatement.trim()) {
          statements.push(currentStatement.trim());
        }
        
        // 开始新语句
        currentStatement = line + '\n';
        inStatement = true;
      } else {
        // 继续当前语句
        currentStatement += line + '\n';
      }
      
      // 检查语句是否结束
      if (inStatement && trimmedLine.endsWith(';')) {
        statements.push(currentStatement.trim());
        currentStatement = '';
        inStatement = false;
      }
    }
    
    // 添加最后一个语句（如果有的话）
    if (currentStatement.trim()) {
      statements.push(currentStatement.trim());
    }
    
    // 过滤空语句
    const filteredStatements = statements.filter(stmt => stmt.trim());
    const processedStatements = [];
    
    for (const statement of filteredStatements) {
      const trimmedStmt = statement.trim();
      
      if (trimmedStmt.startsWith('CREATE TABLE')) {
        // 处理 CREATE TABLE 语句
        let processedStmt = trimmedStmt;
        
        // 如果还没有 IF NOT EXISTS，则添加
        if (!trimmedStmt.includes('IF NOT EXISTS')) {
          // 更精确的正则表达式，匹配 CREATE TABLE `table_name` 格式
          processedStmt = trimmedStmt.replace(
            /CREATE TABLE\s+`([^`]+)`/i,
            'CREATE TABLE IF NOT EXISTS `$1`'
          );
        }
        
        processedStatements.push(processedStmt);
        console.log(`📝 处理 CREATE TABLE 语句: ${processedStmt.substring(0, 50)}...`);
        
      } else if (trimmedStmt.startsWith('INSERT INTO')) {
        // 处理 INSERT INTO 语句
        let processedStmt = trimmedStmt;
        
        // 如果还没有 IGNORE，则添加
        if (!trimmedStmt.includes('IGNORE')) {
          processedStmt = trimmedStmt.replace(
            /INSERT INTO `?([^`\s]+)`?/i,
            'INSERT IGNORE INTO `$1`'
          );
        }
        
        processedStatements.push(processedStmt);
        console.log(`📝 处理 INSERT INTO 语句: ${processedStmt.substring(0, 50)}...`);
        
      } else if (trimmedStmt.startsWith('DROP TABLE')) {
        // 处理 DROP TABLE 语句，添加 IF EXISTS
        let processedStmt = trimmedStmt;
        
        if (!trimmedStmt.includes('IF EXISTS')) {
          processedStmt = trimmedStmt.replace(
            /DROP TABLE `?([^`\s]+)`?/i,
            'DROP TABLE IF EXISTS `$1`'
          );
        }
        
        processedStatements.push(processedStmt);
        console.log(`📝 处理 DROP TABLE 语句: ${processedStmt.substring(0, 50)}...`);
        
      } else {
        // 其他语句保持不变
        processedStatements.push(trimmedStmt);
      }
    }
    
    // 重新组合 SQL 语句
    const processedSQL = processedStatements.join(';\n') + ';';
    
    // 写入输出文件
    await fs.writeFile(outputFile, processedSQL, 'utf8');
    
    console.log(`✅ SQL 文件处理完成: ${outputFile}`);
    console.log(`📊 处理统计:`);
    console.log(`   - 总语句数: ${statements.length}`);
    console.log(`   - CREATE TABLE 语句: ${statements.filter(s => s.trim().startsWith('CREATE TABLE')).length}`);
    console.log(`   - INSERT INTO 语句: ${statements.filter(s => s.trim().startsWith('INSERT INTO')).length}`);
    console.log(`   - DROP TABLE 语句: ${statements.filter(s => s.trim().startsWith('DROP TABLE')).length}`);
    
    return outputFile;
  } catch (error) {
    console.error('❌ 处理 SQL 文件时出错:', error);
    throw error;
  }
}

// 命令行接口
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
    console.log('🔧 SQL 文件处理工具');
    console.log('');
    console.log('用法:');
    console.log('  node process-sql.js <input-file> [output-file]');
    console.log('');
    console.log('参数:');
    console.log('  <input-file>    输入 SQL 文件路径');
    console.log('  [output-file]   输出 SQL 文件路径 (默认: input_processed.sql)');
    console.log('');
    console.log('功能:');
    console.log('  - 为 CREATE TABLE 语句添加 IF NOT EXISTS');
    console.log('  - 为 INSERT INTO 语句添加 IGNORE');
    console.log('  - 为 DROP TABLE 语句添加 IF EXISTS');
    console.log('');
    console.log('示例:');
    console.log('  node process-sql.js database.sql');
    console.log('  node process-sql.js database.sql database_safe.sql');
    process.exit(1);
  }
  
  const inputFile = args[0];
  const outputFile = args[1] || inputFile.replace('.sql', '_processed.sql');
  
  if (!inputFile) {
    console.error('❌ 错误: 必须指定输入文件');
    process.exit(1);
  }
  
  processSQLFile(inputFile, outputFile)
    .then(() => {
      console.log('✅ SQL 文件处理完成！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ SQL 文件处理失败:', error);
      process.exit(1);
    });
}

module.exports = {
  processSQLFile
}; 