#!/bin/bash

echo "🔍 只测试MySQL连接（不修改任何配置）"
echo "=================================="

# 检查MySQL服务状态
echo "1. 检查MySQL服务状态..."
if systemctl is-active --quiet mysql; then
    echo "✅ MySQL服务正在运行"
else
    echo "❌ MySQL服务未运行"
    exit 1
fi

echo ""
echo "2. 测试MySQL连接..."
echo "尝试连接MySQL..."

if mysql -u root -pZhengwenguo0503. -e "SELECT 1;" 2>/dev/null; then
    echo "✅ MySQL连接成功！"
    
    echo ""
    echo "3. 测试数据库连接..."
    if mysql -u root -pZhengwenguo0503. -e "USE nest_db; SELECT 1;" 2>/dev/null; then
        echo "✅ nest_db数据库连接成功！"
    else
        echo "❌ nest_db数据库连接失败"
        echo "数据库可能不存在，请手动创建："
        echo "mysql -u root -pZhengwenguo0503. -e \"CREATE DATABASE IF NOT EXISTS nest_db;\""
    fi
    
    echo ""
    echo "4. 显示当前用户信息..."
    mysql -u root -pZhengwenguo0503. -e "SELECT User, Host, plugin FROM mysql.user WHERE User = 'root';" 2>/dev/null
    
    echo ""
    echo "5. 显示数据库列表..."
    mysql -u root -pZhengwenguo0503. -e "SHOW DATABASES;" 2>/dev/null
    
    echo ""
    echo "✅ MySQL连接测试完成，一切正常！"
    echo "现在可以运行增量部署脚本："
    echo "node src/incremental-deploy.js development production --execute"
    
else
    echo "❌ MySQL连接失败"
    echo "错误信息："
    mysql -u root -pZhengwenguo0503. -e "SELECT 1;" 2>&1
fi 