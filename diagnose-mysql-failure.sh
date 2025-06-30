#!/bin/bash

echo "🔍 诊断MySQL启动失败问题"
echo "========================"

# 检查MySQL错误日志
echo "1. 检查MySQL错误日志..."
if [ -f /var/log/mysql/error.log ]; then
    echo "📋 MySQL错误日志 (最后20行):"
    tail -n 20 /var/log/mysql/error.log
else
    echo "❌ MySQL错误日志文件不存在"
fi

echo ""
echo "2. 检查MySQL数据目录权限..."
if [ -d /var/lib/mysql ]; then
    echo "📁 数据目录权限:"
    ls -la /var/lib/mysql | head -10
    echo ""
    echo "📁 数据目录所有者:"
    ls -ld /var/lib/mysql
else
    echo "❌ MySQL数据目录不存在"
fi

echo ""
echo "3. 检查MySQL socket目录..."
if [ -d /var/run/mysqld ]; then
    echo "📁 Socket目录权限:"
    ls -la /var/run/mysqld
else
    echo "❌ MySQL socket目录不存在"
fi

echo ""
echo "4. 检查MySQL配置文件..."
if [ -f /etc/mysql/mysql.conf.d/mysqld.cnf ]; then
    echo "📋 MySQL配置文件存在"
    echo "📋 关键配置项:"
    grep -E "^(datadir|socket|bind-address|port)" /etc/mysql/mysql.conf.d/mysqld.cnf || echo "未找到相关配置"
else
    echo "❌ MySQL配置文件不存在"
fi

echo ""
echo "5. 检查系统资源..."
echo "💾 磁盘空间:"
df -h /var/lib/mysql
echo ""
echo "🧠 内存使用:"
free -h
echo ""
echo "📊 进程状态:"
ps aux | grep mysql | grep -v grep || echo "没有MySQL进程运行"

echo ""
echo "6. 尝试修复MySQL..."
echo "请根据上面的诊断结果，执行以下修复步骤："

cat << 'EOF'

修复步骤：

1. 如果数据目录权限有问题：
   sudo chown -R mysql:mysql /var/lib/mysql
   sudo chmod -R 755 /var/lib/mysql

2. 如果socket目录权限有问题：
   sudo mkdir -p /var/run/mysqld
   sudo chown mysql:mysql /var/run/mysqld
   sudo chmod 755 /var/run/mysqld

3. 如果配置文件有问题，重置配置：
   sudo cp /etc/mysql/mysql.conf.d/mysqld.cnf /etc/mysql/mysql.conf.d/mysqld.cnf.backup
   sudo mysql_install_db --user=mysql --datadir=/var/lib/mysql

4. 重新初始化MySQL：
   sudo mysqld --initialize --user=mysql

5. 启动MySQL服务：
   sudo systemctl start mysql

6. 如果还是失败，查看详细错误：
   sudo journalctl -u mysql.service -n 50
EOF

echo ""
echo "7. 查看详细的systemd日志..."
echo "执行以下命令查看详细错误信息："
echo "sudo journalctl -u mysql.service -n 50" 