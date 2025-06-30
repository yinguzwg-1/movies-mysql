# 🔧 修复 GitHub Secrets 配置问题

## 问题分析

从错误日志可以看出，主要问题是：

1. **数据库名称显示为 `***`** - GitHub Secrets 没有正确配置
2. **表删除逻辑没有正确执行** - 导致 "Table already exists" 错误
3. **重复索引错误** - 需要更好的错误处理

## 解决方案

### 1. 检查 GitHub Secrets 配置

请确保在 GitHub 仓库的 Settings > Secrets and variables > Actions 中设置了以下 secrets：

```
MYSQL_HOST=你的MySQL主机地址
MYSQL_PORT=3306
MYSQL_USER=你的MySQL用户名
MYSQL_PASSWORD=你的MySQL密码
MYSQL_DATABASE=你的数据库名称
ALIYUN_HOST=你的阿里云服务器IP
ALIYUN_USERNAME=你的阿里云服务器用户名
ALIYUN_SSH_KEY=你的SSH私钥
ALIYUN_PORT=22
```

### 2. 手动执行数据库重置

如果 GitHub Actions 持续失败，可以手动在服务器上执行以下命令：

```bash
# 连接到MySQL
mysql -u root -p

# 删除现有数据库
DROP DATABASE IF EXISTS your_database_name;

# 创建新数据库
CREATE DATABASE your_database_name;

# 退出MySQL
exit

# 导入数据
mysql -u your_username -p your_database_name < /path/to/database.sql
```

### 3. 修复重复索引问题

如果遇到重复索引错误，可以手动删除索引：

```sql
-- 连接到数据库
USE your_database_name;

-- 查看所有索引
SHOW INDEX FROM tracker_events;

-- 删除重复索引
DROP INDEX idx_event_user ON tracker_events;

-- 重新创建索引（如果需要）
CREATE INDEX idx_event_user ON tracker_events(user_id, event_type);
```

### 4. 验证数据库状态

```sql
-- 检查数据库是否存在
SHOW DATABASES;

-- 检查表是否存在
USE your_database_name;
SHOW TABLES;

-- 检查表结构
DESCRIBE media;
DESCRIBE tracker_events;
DESCRIBE translations;
```

## 常见错误及解决方案

### 错误1: Unknown database
```
ERROR 1049 (42000): Unknown database '`***`'
```
**解决方案**: 检查 `MYSQL_DATABASE` secret 是否正确设置

### 错误2: Table already exists
```
ERROR 1050 (42S01) at line 21: Table 'media' already exists
```
**解决方案**: 确保删除表的逻辑正确执行，或者手动删除表

### 错误3: Duplicate key name
```
ERROR 1061 (42000) at line 73: Duplicate key name 'idx_event_user'
```
**解决方案**: 删除重复索引或使用 `IF NOT EXISTS` 语法

## 测试步骤

1. 检查 GitHub Secrets 配置
2. 手动测试数据库连接
3. 清理现有数据库
4. 重新导入数据
5. 验证导入结果

## 联系支持

如果问题仍然存在，请提供：
- 完整的错误日志
- GitHub Secrets 配置截图（隐藏敏感信息）
- 数据库结构信息 