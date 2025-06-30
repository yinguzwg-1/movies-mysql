@echo off
chcp 65001 >nul

echo 🎬 Movies MySQL 数据库导出工具
echo ================================
echo.

:: 检查 Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js 未安装，请先安装 Node.js
    pause
    exit /b 1
)

:: 检查依赖
if not exist "node_modules" (
    echo [INFO] 安装依赖...
    call npm install
    if errorlevel 1 (
        echo [ERROR] 依赖安装失败
        pause
        exit /b 1
    )
)

:: 检查配置文件
if not exist ".env" (
    echo [INFO] 创建配置文件...
    if exist "env.example" (
        copy env.example .env >nul
        echo [SUCCESS] 配置文件已创建 (.env)
        echo [INFO] 请编辑 .env 文件配置数据库连接信息
        pause
        exit /b 0
    ) else (
        echo [ERROR] env.example 文件不存在
        pause
        exit /b 1
    )
)

:: 导出数据库
echo [INFO] 开始导出数据库...
call npm run export

if errorlevel 1 (
    echo [ERROR] 导出失败
    pause
    exit /b 1
) else (
    echo.
    echo [SUCCESS] 数据库导出完成！
    echo [INFO] 文件位置: database.sql
    echo.
    echo 下一步操作：
    echo 1. 检查 database.sql 文件
    echo 2. 提交到 Git: git add database.sql
    echo 3. 推送到 GitHub: git push
    echo 4. GitHub Actions 将自动部署到阿里云
    echo.
)

pause 