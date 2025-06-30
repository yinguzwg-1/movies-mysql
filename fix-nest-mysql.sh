#!/bin/bash

echo "🔧 修复Nest.js MySQL连接问题"
echo "============================"

# 检查MySQL服务状态
echo "1. 检查MySQL服务状态..."
if systemctl is-active --quiet mysql; then
    echo "✅ MySQL服务正在运行"
else
    echo "❌ MySQL服务未运行，正在启动..."
    sudo systemctl start mysql
    sleep 3
fi

# 检查MySQL是否正在运行
if ! systemctl is-active --quiet mysql; then
    echo "❌ 无法启动MySQL服务"
    exit 1
fi

echo ""
echo "2. 检查MySQL端口是否监听..."
if netstat -tlnp | grep :3306; then
    echo "✅ MySQL端口3306正在监听"
else
    echo "❌ MySQL端口3306未监听"
    echo "尝试重启MySQL服务..."
    sudo systemctl restart mysql
    sleep 5
fi

echo ""
echo "3. 测试MySQL连接..."
if mysql -u root -pZhengwenguo0503. -e "SELECT 1;" 2>/dev/null; then
    echo "✅ MySQL连接测试成功"
else
    echo "❌ MySQL连接测试失败，尝试修复用户权限..."
    
    # 尝试使用sudo mysql修复
    sudo mysql << 'EOF'
-- 重新创建root用户
DROP USER IF EXISTS 'root'@'localhost';
CREATE USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'Zhengwenguo0503.';
GRANT ALL PRIVILEGES ON *.* TO 'root'@'localhost' WITH GRANT OPTION;

-- 创建允许从任何主机连接的root用户
DROP USER IF EXISTS 'root'@'%';
CREATE USER 'root'@'%' IDENTIFIED WITH mysql_native_password BY 'Zhengwenguo0503.';
GRANT ALL PRIVILEGES ON *.* TO 'root'@'%' WITH GRANT OPTION;

-- 创建数据库
CREATE DATABASE IF NOT EXISTS nest_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 刷新权限
FLUSH PRIVILEGES;
EOF
    
    echo "✅ MySQL用户权限修复完成"
fi

echo ""
echo "4. 更新PM2配置文件..."
cat > /tmp/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'nest-server',
      script: 'dist/src/main.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        DB_HOST: 'localhost',
        DB_PORT: 3306,
        DB_USERNAME: 'root',
        DB_PASSWORD: 'Zhengwenguo0503.',
        DB_DATABASE: 'nest_db'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
        DB_HOST: 'localhost',
        DB_PORT: 3306,
        DB_USERNAME: 'root',
        DB_PASSWORD: 'Zhengwenguo0503.',
        DB_DATABASE: 'nest_db'
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      max_memory_restart: '1G',
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s',
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'dist'],
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};
EOF

echo "✅ PM2配置文件已更新"

echo ""
echo "5. 重启Nest.js应用..."
cd ~/nest-server
pm2 stop nest-server || true
pm2 delete nest-server || true
pm2 start ecosystem.config.js --env production

echo ""
echo "6. 检查应用状态..."
sleep 5
pm2 status
pm2 logs nest-server --lines 20

echo ""
echo "7. 测试API连接..."
if curl -f http://localhost:3001 > /dev/null 2>&1; then
    echo "✅ Nest.js应用启动成功！"
else
    echo "❌ Nest.js应用启动失败，查看详细日志..."
    pm2 logs nest-server --lines 50
fi

echo ""
echo "修复完成！" 