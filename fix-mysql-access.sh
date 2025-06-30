#!/bin/bash

echo "🔧 MySQL访问权限修复脚本"
echo "=========================="

# 检查MySQL服务状态
echo "1. 检查MySQL服务状态..."
if systemctl is-active --quiet mysql; then
    echo "✅ MySQL服务正在运行"
else
    echo "❌ MySQL服务未运行，正在启动..."
    sudo systemctl start mysql
fi

echo ""
echo "2. 检查MySQL用户权限..."
echo "请使用以下命令登录MySQL并执行："
echo "sudo mysql -u root -p"
echo ""
echo "然后在MySQL中执行以下SQL命令："
echo ""

cat << 'EOF'
-- 1. 查看当前用户
SELECT User, Host, plugin FROM mysql.user WHERE User = 'root';

-- 2. 创建/更新root用户（支持localhost连接）
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'Zhengwenguo0503.';
-- 或者如果使用caching_sha2_password
-- ALTER USER 'root'@'localhost' IDENTIFIED WITH caching_sha2_password BY 'Zhengwenguo0503.';

-- 3. 确保root用户有所有权限
GRANT ALL PRIVILEGES ON *.* TO 'root'@'localhost' WITH GRANT OPTION;

-- 4. 创建允许从任何主机连接的root用户（如果需要）
CREATE USER IF NOT EXISTS 'root'@'%' IDENTIFIED BY 'Zhengwenguo0503.';
GRANT ALL PRIVILEGES ON *.* TO 'root'@'%' WITH GRANT OPTION;

-- 5. 刷新权限
FLUSH PRIVILEGES;

-- 6. 验证用户
SELECT User, Host, plugin FROM mysql.user WHERE User = 'root';
EOF

echo ""
echo "3. 检查MySQL配置文件..."
echo "检查 /etc/mysql/mysql.conf.d/mysqld.cnf 中的 bind-address 设置："
echo "bind-address = 0.0.0.0  # 允许所有IP连接"
echo "或"
echo "bind-address = 127.0.0.1  # 只允许本地连接"
echo ""

echo "4. 重启MySQL服务（修改配置后）："
echo "sudo systemctl restart mysql"
echo ""

echo "5. 测试连接："
echo "mysql -u root -p -h localhost"
echo ""

echo "完成以上步骤后，再次运行增量部署脚本。" 