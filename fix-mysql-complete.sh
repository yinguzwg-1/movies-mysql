#!/bin/bash

echo "🔧 完整MySQL修复脚本"
echo "===================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查MySQL服务状态
echo -e "${YELLOW}1. 检查MySQL服务状态...${NC}"
if systemctl is-active --quiet mysql; then
    echo -e "${GREEN}✅ MySQL服务正在运行${NC}"
else
    echo -e "${RED}❌ MySQL服务未运行，正在启动...${NC}"
    sudo systemctl start mysql
    sleep 3
fi

# 检查MySQL是否正在运行
if ! systemctl is-active --quiet mysql; then
    echo -e "${RED}❌ 无法启动MySQL服务${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}2. 备份当前MySQL用户配置...${NC}"
sudo mysqldump --all-databases --user=root --password > mysql_backup_$(date +%Y%m%d_%H%M%S).sql 2>/dev/null || echo "备份失败，继续执行..."

echo ""
echo -e "${YELLOW}3. 修复MySQL用户权限...${NC}"
echo "请复制以下SQL命令并在MySQL中执行："
echo ""

cat << 'EOF'
-- 登录MySQL（如果无法登录，使用以下命令重置root密码）
-- sudo mysql -u root

-- 1. 查看当前用户状态
SELECT User, Host, plugin, authentication_string FROM mysql.user WHERE User = 'root';

-- 2. 删除可能存在的冲突用户
DROP USER IF EXISTS 'root'@'localhost';
DROP USER IF EXISTS 'root'@'%';

-- 3. 重新创建root用户（使用mysql_native_password认证）
CREATE USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'Zhengwenguo0503.';
CREATE USER 'root'@'%' IDENTIFIED WITH mysql_native_password BY 'Zhengwenguo0503.';

-- 4. 授予所有权限
GRANT ALL PRIVILEGES ON *.* TO 'root'@'localhost' WITH GRANT OPTION;
GRANT ALL PRIVILEGES ON *.* TO 'root'@'%' WITH GRANT OPTION;

-- 5. 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS nest_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 6. 刷新权限
FLUSH PRIVILEGES;

-- 7. 验证用户配置
SELECT User, Host, plugin FROM mysql.user WHERE User = 'root';
SHOW GRANTS FOR 'root'@'localhost';
SHOW GRANTS FOR 'root'@'%';
EOF

echo ""
echo -e "${YELLOW}4. 如果无法登录MySQL，使用以下命令重置root密码：${NC}"
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

echo ""
echo -e "${YELLOW}5. 检查MySQL配置文件...${NC}"
echo "检查 /etc/mysql/mysql.conf.d/mysqld.cnf 中的配置："
echo "bind-address = 0.0.0.0  # 允许所有IP连接"
echo "或"
echo "bind-address = 127.0.0.1  # 只允许本地连接"

echo ""
echo -e "${YELLOW}6. 重启MySQL服务...${NC}"
echo "sudo systemctl restart mysql"

echo ""
echo -e "${YELLOW}7. 测试连接...${NC}"
echo "mysql -u root -p -h localhost"
echo "或"
echo "mysql -u root -p -h 127.0.0.1"

echo ""
echo -e "${GREEN}完成以上步骤后，再次运行增量部署脚本。${NC}" 