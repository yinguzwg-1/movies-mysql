# 数据库部署工具 - 简化版

这是一个简化的数据库部署工具，专门用于连接云服务器数据库进行增量部署。

## 特性

- ✅ 简化为单一开发环境
- ✅ 支持无密码的云服务器数据库连接
- ✅ 自动检测数据库差异
- ✅ 生成增量SQL脚本
- ✅ 支持自动执行部署

## 快速开始

### 1. 配置环境变量

#### 方式一：使用设置向导（推荐）
```bash
npm run setup
```

#### 方式二：手动配置
复制环境变量示例文件：

```bash
cp env.example .env
```

编辑 `.env` 文件，配置你的云服务器数据库信息：

```env
# 数据库配置 - 云服务器
DB_HOST=your-cloud-server-ip
DB_USER=root
DB_PASSWORD=
DB_NAME=nest_db
DB_PORT=3306
```

**注意**: 如果你的数据库已经配置好并且可以正常连接，这个步骤是可选的。

### 2. 安装依赖

```bash
npm install
```

### 3. 测试连接

```bash
npm run test
```

### 4. 运行部署

#### 方式一：使用快速启动脚本
```bash
npm run quick-start
```

#### 方式二：使用增量部署脚本
```bash
# 生成增量SQL文件
npm run deploy:output

# 自动执行部署
npm run deploy:execute

# 查看差异但不执行
npm run deploy
```

#### 方式三：直接运行
```bash
# 生成SQL文件
node src/incremental-deploy.js -o incremental.sql

# 自动执行
node src/incremental-deploy.js --execute

# 查看帮助
node src/incremental-deploy.js --help
```

## 配置说明

### 数据库配置

- `DB_HOST`: 云服务器IP地址
- `DB_USER`: 数据库用户名（通常是 `root`）
- `DB_PASSWORD`: 数据库密码（云服务器通常为空）
- `DB_NAME`: 数据库名称
- `DB_PORT`: 数据库端口（通常是 `3306`）

### 环境简化

本工具已简化为只支持开发环境，所有环境配置都使用相同的数据库连接信息。

## 故障排除

### 连接被拒绝错误

如果遇到 `Access denied for user` 错误：

1. 检查云服务器防火墙是否开放了3306端口
2. 确认数据库用户权限设置
3. 验证IP地址是否正确

### 无密码连接

如果云服务器数据库设置了密码，请在 `.env` 文件中设置 `DB_PASSWORD` 值。

## 脚本说明

- `start.js`: 快速启动脚本，自动加载环境变量
- `src/incremental-deploy.js`: 主要的增量部署脚本
- `src/db-config.js`: 数据库配置文件（已简化）

## GitHub Actions 自动部署

本项目支持通过GitHub Actions自动部署到阿里云服务器。

### 配置步骤

1. **配置GitHub Secrets**
   - 参考 [GitHub Secrets 配置说明](./GITHUB_SECRETS_SETUP.md)
   - 主要需要配置阿里云服务器的SSH连接信息
   - 数据库配置是可选的（如果.env文件已配置）

2. **触发部署**
   - 推送代码到 `main` 分支自动触发
   - 或手动触发：Actions → 选择工作流 → Run workflow

### 部署选项

- **自动执行**: 是否自动执行SQL变更
- **输出文件**: 可选的SQL文件输出路径

## 注意事项

- 确保云服务器数据库服务正在运行
- 确保网络连接正常
- 建议在部署前备份数据库
- 确保GitHub Secrets配置正确 