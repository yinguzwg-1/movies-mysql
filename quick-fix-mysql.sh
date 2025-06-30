#!/bin/bash

echo "🔧 快速修复MySQL连接问题"
echo "========================"

# 检查MySQL服务状态
echo "1. 检查MySQL服务状态..."
if systemctl is-active --quiet mysql; then
    echo "✅ MySQL服务正在运行"
else
    echo "❌ MySQL服务未运行，正在启动..."
    sudo systemctl start mysql
    sleep 3
fi

echo ""
echo "2. 尝试使用sudo mysql登录..."
if sudo mysql -e "SELECT 1;" 2>/dev/null; then
    echo "✅ 可以使用sudo mysql登录"
    
    echo ""
    echo "3. 修复root用户权限..."
    sudo mysql << 'EOF'
-- 查看当前用户状态
SELECT User, Host, plugin FROM mysql.user WHERE User = 'root';

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

-- 验证配置
SELECT User, Host, plugin FROM mysql.user WHERE User = 'root';
EOF
    
    echo "✅ MySQL用户权限修复完成"
    
else
    echo "❌ 无法使用sudo mysql登录，尝试其他方法..."
    
    echo ""
    echo "4. 尝试重置MySQL root密码..."
    echo "请手动执行以下步骤："
    echo "sudo systemctl stop mysql"
    echo "sudo mysqld_safe --skip-grant-tables --skip-networking &"
    echo "sudo mysql -u root"
    echo ""
    echo "然后在MySQL中执行："
    echo "USE mysql;"
    echo "UPDATE user SET authentication_string=PASSWORD('Zhengwenguo0503.') WHERE User='root';"
    echo "FLUSH PRIVILEGES;"
    echo "EXIT;"
    echo ""
    echo "sudo systemctl stop mysql"
    echo "sudo systemctl start mysql"
fi

echo ""
echo "5. 重启MySQL服务..."
sudo systemctl restart mysql
sleep 3

echo ""
echo "6. 测试连接..."
if mysql -u root -pqq123456 -e "SELECT 1;" 2>/dev/null; then
    echo "✅ MySQL连接测试成功！"
    echo ""
    echo "7. 测试数据库连接..."
    if mysql -u root -pqq123456 -e "USE nest_db; SELECT 1;" 2>/dev/null; then
        echo "✅ 数据库连接测试成功！"
    else
        echo "❌ 数据库连接失败"
    fi
else
    echo "❌ MySQL连接测试失败"
fi

echo ""
echo "修复完成！现在可以尝试运行增量部署脚本。" 