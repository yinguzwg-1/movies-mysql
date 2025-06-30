# 🎬 Movies MySQL 简单数据库导出工具

一个简单的数据库导出工具，可以读取本地数据库并生成 SQL 文件，然后通过 GitHub Actions 部署到阿里云服务器。

## ✨ 功能特性

- 📦 **简单导出** - 一键导出本地数据库到 SQL 文件
- 🚀 **自动部署** - 通过 GitHub Actions 自动部署到阿里云
- 🔧 **配置简单** - 只需配置本地数据库连接信息
- 📋 **完整备份** - 包含数据库结构和数据

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置数据库连接

复制 `env.example` 为 `.env` 并配置：

```env
# 本地数据库配置
LOCAL_DB_HOST=localhost
LOCAL_DB_PORT=3306
LOCAL_DB_USER=root
LOCAL_DB_PASSWORD=your_password
LOCAL_DB_NAME=your_database
```

### 3. 导出数据库

```bash
# 导出到默认文件 database.sql
npm run export

# 或者指定输出文件
node src/export.js export -o my_database.sql
```

### 4. 部署到阿里云

1. 将生成的 `database.sql` 文件提交到 GitHub
2. 在 GitHub 仓库设置中添加以下 Secrets：
   - `ALIYUN_HOST` - 阿里云服务器IP
   - `ALIYUN_USERNAME` - 服务器用户名
   - `ALIYUN_SSH_KEY` - SSH 私钥
   - `ALIYUN_PORT` - SSH 端口（可选，默认22）
   - `DB_USER` - 数据库用户名
   - `DB_PASSWORD` - 数据库密码
   - `DB_NAME` - 数据库名称
   - `RESTART_APP` - 是否重启应用（可选，true/false）

3. 推送代码或手动触发 GitHub Actions

## 📖 使用说明

### 导出数据库

```bash
# 基本导出
npm run export

# 指定输出文件
node src/export.js export -o exports/my_database.sql

# 查看帮助
node src/export.js --help
```

### GitHub Actions 部署

工作流会在以下情况触发：
- 推送 `database.sql` 文件到 main/master 分支
- 手动触发 Actions

部署流程：
1. 检查数据库文件是否存在
2. 连接到阿里云服务器
3. 安装/配置 MySQL（如果需要）
4. 备份现有数据库
5. 上传并导入新的数据库文件
6. 验证导入结果
7. 重启应用（如果配置了）

## ⚙️ 配置说明

### 本地配置 (.env)

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `LOCAL_DB_HOST` | 本地数据库主机 | localhost |
| `LOCAL_DB_PORT` | 本地数据库端口 | 3306 |
| `LOCAL_DB_USER` | 本地数据库用户名 | root |
| `LOCAL_DB_PASSWORD` | 本地数据库密码 | - |
| `LOCAL_DB_NAME` | 本地数据库名称 | - |

### GitHub Secrets

| Secret | 说明 |
|--------|------|
| `ALIYUN_HOST` | 阿里云服务器IP地址 |
| `ALIYUN_USERNAME` | 服务器用户名（通常是 root） |
| `ALIYUN_SSH_KEY` | SSH 私钥内容 |
| `ALIYUN_PORT` | SSH 端口（可选） |
| `DB_USER` | 数据库用户名 |
| `DB_PASSWORD` | 数据库密码 |
| `DB_NAME` | 数据库名称 |
| `RESTART_APP` | 是否重启应用（true/false） |

## 🔧 高级功能

### 自定义导出

```bash
# 导出特定表
# 修改 src/export.js 中的 getDatabaseData 函数

# 导出时排除某些表
# 在 getDatabaseData 函数中添加过滤逻辑
```

### 定时导出

```bash
# 添加到 crontab
0 2 * * * cd /path/to/movies-mysql && npm run export && git add database.sql && git commit -m "Auto export database" && git push
```

## 🛠️ 故障排除

### 导出失败

1. **连接失败**：检查数据库服务是否运行
2. **权限不足**：确保数据库用户有足够权限
3. **配置错误**：检查 `.env` 文件配置

### 部署失败

1. **SSH 连接失败**：检查服务器IP、用户名、SSH密钥
2. **数据库导入失败**：检查数据库用户权限
3. **文件上传失败**：检查服务器磁盘空间

### 常见错误

```
❌ 导出失败: 请设置 LOCAL_DB_PASSWORD 环境变量
```
**解决方案**：在 `.env` 文件中设置 `LOCAL_DB_PASSWORD`

```
❌ 导出失败: ER_ACCESS_DENIED_ERROR
```
**解决方案**：检查数据库用户名和密码

## 📁 项目结构

```
movies-mysql/
├── src/
│   └── export.js          # 导出工具
├── .github/workflows/
│   └── deploy-database.yml # GitHub Actions 工作流
├── package.json           # 项目配置
├── env.example            # 环境变量示例
├── database.sql           # 导出的数据库文件
└── README.md              # 说明文档
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## �� 许可证

MIT License 