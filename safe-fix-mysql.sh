#!/bin/bash

echo "🔧 安全修复MySQL连接问题（不重启服务）"
echo "====================================="

# 检查MySQL是否正在运行
echo "1. 检查MySQL服务状态..."
if systemctl is-active --quiet mysql; then
    echo "✅ MySQL服务正在运行"
else
    echo "❌ MySQL服务未运行，但不会自动启动（避免破坏现有配置）"
    echo "请手动启动MySQL服务：sudo systemctl start mysql"
    exit 1
fi

echo ""
echo "2. 测试当前MySQL连接..."
if mysql -u root -pZhengwenguo0503. -e "SELECT 1;" 2>/dev/null; then
    echo "✅ MySQL连接正常，无需修复"
    echo ""
    echo "3. 检查数据库是否存在..."
    if mysql -u root -pZhengwenguo0503. -e "USE nest_db; SELECT 1;" 2>/dev/null; then
        echo "✅ nest_db数据库存在"
    else
        echo "❌ nest_db数据库不存在，创建它..."
        mysql -u root -pZhengwenguo0503. -e "CREATE DATABASE IF NOT EXISTS nest_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
        echo "✅ nest_db数据库已创建"
    fi
    
    echo ""
    echo "4. 检查用户权限..."
    mysql -u root -pZhengwenguo0503. -e "SHOW GRANTS FOR 'root'@'localhost';" 2>/dev/null
    mysql -u root -pZhengwenguo0503. -e "SHOW GRANTS FOR 'root'@'%';" 2>/dev/null
    
    echo ""
    echo "✅ MySQL配置正常，无需修复"
    echo "现在可以测试增量部署脚本"
    
else
    echo "❌ MySQL连接失败，但不会自动修复（避免破坏服务）"
    echo ""
    echo "请手动执行以下SQL命令来修复用户权限："
    echo ""
    echo "mysql -u root -p"
    echo ""
    echo "然后在MySQL中执行："
    cat << 'EOF'
-- 检查当前用户
SELECT User, Host, plugin FROM mysql.user WHERE User = 'root';

-- 如果root@localhost不存在，创建它
CREATE USER IF NOT EXISTS 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'Zhengwenguo0503.';

-- 如果root@%不存在，创建它
CREATE USER IF NOT EXISTS 'root'@'%' IDENTIFIED WITH mysql_native_password BY 'Zhengwenguo0503.';

-- 授予权限
GRANT ALL PRIVILEGES ON *.* TO 'root'@'localhost' WITH GRANT OPTION;
GRANT ALL PRIVILEGES ON *.* TO 'root'@'%' WITH GRANT OPTION;

-- 创建数据库
CREATE DATABASE IF NOT EXISTS nest_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 刷新权限
FLUSH PRIVILEGES;
EOF
fi

echo ""
echo "5. 测试Nest.js应用连接..."
echo "请检查Nest.js应用的PM2配置是否正确设置了数据库环境变量"
echo ""
echo "6. 测试增量部署脚本..."
echo "node src/incremental-deploy.js development production --execute" 