#!/usr/bin/env node

// 加载环境变量
require('dotenv').config();

// 运行增量部署
const { incrementalDeploy } = require('./src/incremental-deploy');

console.log('🚀 启动增量部署...');

incrementalDeploy('development', 'development', null, false)
  .then(() => {
    console.log('✅ 部署完成！');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 部署失败:', error);
    process.exit(1);
  }); 