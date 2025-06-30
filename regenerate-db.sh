#!/bin/bash

# 设置颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🎬 重新生成数据库文件${NC}"
echo "========================"
echo

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}[ERROR] Node.js 未安装，请先安装 Node.js${NC}"
    exit 1
fi

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}[INFO] 安装依赖...${NC}"
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}[ERROR] 依赖安装失败${NC}"
        exit 1
    fi
fi

# 检查配置文件
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}[INFO] 创建配置文件...${NC}"
    if [ -f "env.example" ]; then
        cp env.example .env
        echo -e "${GREEN}[SUCCESS] 配置文件已创建 (.env)${NC}"
        echo -e "${YELLOW}[INFO] 请编辑 .env 文件配置数据库连接信息${NC}"
        exit 0
    else
        echo -e "${RED}[ERROR] env.example 文件不存在${NC}"
        exit 1
    fi
fi

# 删除旧的数据库文件
if [ -f "database.sql" ]; then
    echo -e "${YELLOW}[INFO] 删除旧的数据库文件...${NC}"
    rm -f database.sql
fi

# 重新导出数据库
echo -e "${YELLOW}[INFO] 重新导出数据库...${NC}"
npm run export

if [ $? -ne 0 ]; then
    echo -e "${RED}[ERROR] 导出失败${NC}"
    exit 1
else
    echo
    echo -e "${GREEN}[SUCCESS] 数据库重新导出完成！${NC}"
    echo -e "${BLUE}[INFO] 文件位置: database.sql${NC}"
    echo -e "${BLUE}[INFO] 目标数据库: nest_db${NC}"
    
    # 显示文件信息
    if [ -f "database.sql" ]; then
        echo -e "${BLUE}[INFO] 文件大小: $(ls -lh database.sql | awk '{print $5}')${NC}"
    fi
    
    echo
    echo "下一步操作："
    echo "1. 检查 database.sql 文件内容"
    echo "2. 提交到 Git: git add database.sql"
    echo "3. 推送到 GitHub: git push"
    echo "4. GitHub Actions 将自动部署到阿里云"
    echo
fi 