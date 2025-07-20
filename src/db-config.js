// 加载环境变量
require('dotenv').config();

// 数据库配置文件
const configs = {
  development: {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nest_db',
    charset: 'utf8mb4',
    port: process.env.DB_PORT || 3306
  },
  production: {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nest_db',
    charset: 'utf8mb4',
    port: process.env.DB_PORT || 3306
  },
  staging: {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nest_db',
    charset: 'utf8mb4',
    port: process.env.DB_PORT || 3306
  }
};

// 获取配置
function getConfig(environment = 'development') {
  const config = configs[environment];
  if (!config) {
    throw new Error(`未知的环境: ${environment}`);
  }
  return config;
}

// 获取所有可用的环境
function getAvailableEnvironments() {
  return Object.keys(configs);
}

// 验证配置
function validateConfig(config) {
  const required = ['host', 'user', 'database'];
  for (const field of required) {
    if (!config[field]) {
      throw new Error(`缺少必需的配置字段: ${field}`);
    }
  }
  // 密码可以为空（云服务器无密码）
  return true;
}

module.exports = {
  getConfig,
  getAvailableEnvironments,
  validateConfig,
  configs
}; 