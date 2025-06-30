# 📦 本地生成 SQL 文件指南

## 快速开始

### 方法一：使用一键脚本（推荐）

#### Windows
```bash
regenerate-db.bat
```

#### Linux/Mac
```bash
chmod +x regenerate-db.sh
./regenerate-db.sh
```

### 方法二：手动执行

#### 1. 安装依赖
```bash
npm install
```

#### 2. 配置数据库连接
确保 `.env` 文件配置正确：
```env
LOCAL_DB_HOST=localhost
LOCAL_DB_PORT=3306
LOCAL_DB_USER=root
LOCAL_DB_PASSWORD=Zhengwenguo0503.
LOCAL_DB_NAME=nest_db
```

#### 3. 执行导出
```bash
# 导出到 nest_db 数据库（默认）
npm run export

# 或者指定数据库名称
node src/export.js export -d nest_db

# 或者指定输出文件
node src/export.js export -d nest_db -o my_database.sql
```

## 导出选项

### 基本导出
```bash
npm run export
```
- 从本地 `nest_db` 数据库导出
- 生成 `database.sql` 文件
- 目标数据库：`nest_db`

### 自定义导出
```bash
# 指定目标数据库
node src/export.js export -d my_database

# 指定输出文件
node src/export.js export -o exports/my_db.sql

# 同时指定数据库和文件
node src/export.js export -d my_database -o exports/my_db.sql
```

## 生成的 SQL 文件内容

导出的 `database.sql` 文件会包含：

```sql
-- 数据库导出
-- 创建时间: 2025-01-XX...
-- 数据库: nest_db

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";

-- 创建数据库
-- --------------------------------------------------------
CREATE DATABASE IF NOT EXISTS `nest_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `nest_db`;

-- 数据库结构
-- --------------------------------------------------------
CREATE TABLE `media` (
  -- 表结构...
);

-- 数据库数据
-- --------------------------------------------------------
INSERT INTO `media` (...) VALUES (...);

COMMIT;
SET FOREIGN_KEY_CHECKS = 1;
```

## 验证导出结果

### 1. 检查文件
```bash
# 查看文件大小
ls -lh database.sql

# 查看文件开头
head -20 database.sql

# 查看文件结尾
tail -10 database.sql
```

### 2. 检查内容
确保文件包含：
- ✅ `CREATE DATABASE IF NOT EXISTS \`nest_db\``
- ✅ `USE \`nest_db\`;`
- ✅ 表结构（CREATE TABLE）
- ✅ 数据（INSERT INTO）

## 常见问题

### 1. 连接失败
```
❌ 导出失败: 请设置 LOCAL_DB_PASSWORD 环境变量
```
**解决方案**：检查 `.env` 文件配置

### 2. 数据库不存在
```
❌ 导出失败: ER_BAD_DB_ERROR: Unknown database 'xxx'
```
**解决方案**：确保本地数据库存在，或修改 `.env` 中的 `LOCAL_DB_NAME`

### 3. 权限不足
```
❌ 导出失败: ER_ACCESS_DENIED_ERROR
```
**解决方案**：检查数据库用户名和密码

## 下一步

导出成功后：
1. 检查 `database.sql` 文件
2. 提交到 Git：`git add database.sql`
3. 推送到 GitHub：`git push`
4. GitHub Actions 自动部署到阿里云 