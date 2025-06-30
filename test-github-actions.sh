#!/bin/bash

# 测试GitHub Actions路径修复的脚本

echo "🧪 测试GitHub Actions路径修复..."

# 检查当前目录
echo "📁 当前目录: $(pwd)"
echo "📋 目录内容:"
ls -la

# 检查movies-mysql目录是否存在
if [ -d "movies-mysql" ]; then
    echo "✅ movies-mysql 目录存在"
    echo "📋 movies-mysql 目录内容:"
    ls -la movies-mysql/
else
    echo "❌ movies-mysql 目录不存在"
    echo "📋 当前目录内容:"
    ls -la
fi

# 检查关键文件是否存在
echo "🔍 检查关键文件..."

# 检查package.json
if [ -f "package.json" ]; then
    echo "✅ package.json 存在"
elif [ -f "movies-mysql/package.json" ]; then
    echo "✅ movies-mysql/package.json 存在"
else
    echo "❌ package.json 不存在"
fi

# 检查src目录
if [ -d "src" ]; then
    echo "✅ src 目录存在"
elif [ -d "movies-mysql/src" ]; then
    echo "✅ movies-mysql/src 目录存在"
else
    echo "❌ src 目录不存在"
fi

# 检查database.sql
if [ -f "database.sql" ]; then
    echo "✅ database.sql 存在"
elif [ -f "movies-mysql/database.sql" ]; then
    echo "✅ movies-mysql/database.sql 存在"
else
    echo "❌ database.sql 不存在"
fi

# 检查GitHub Actions工作流
if [ -f ".github/workflows/deploy-database.yml" ]; then
    echo "✅ .github/workflows/deploy-database.yml 存在"
elif [ -f "movies-mysql/.github/workflows/deploy-database.yml" ]; then
    echo "✅ movies-mysql/.github/workflows/deploy-database.yml 存在"
else
    echo "❌ deploy-database.yml 不存在"
fi

echo "🎉 测试完成！" 