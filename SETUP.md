# 快速设置指南

## GitHub Secrets 配置

在GitHub仓库中配置以下Secrets：

### 1. 阿里云服务器配置

| Secret名称 | 值 |
|-----------|-----|
| `ALIYUN_HOST` | `223.4.248.176` |
| `ALIYUN_USERNAME` | `root` |
| `ALIYUN_SSH_KEY` | 你的SSH私钥内容 |
| `ALIYUN_PORT` | `22` |

### 2. 数据库配置

| Secret名称 | 值 |
|-----------|-----|
| `DB_HOST` | `223.4.248.176` |
| `DB_USER` | `root` |
| `DB_PASSWORD` | `(空字符串)` |
| `DB_NAME` | `nest_db` |
| `DB_PORT` | `3306` |

## 配置步骤

1. 进入GitHub仓库 → Settings → Secrets and variables → Actions
2. 点击 "New repository secret"
3. 逐个添加上述Secrets

## 测试连接

本地测试：
```bash
npm run test
```

## 触发部署

### 自动触发
推送代码到 `main` 分支自动触发增量部署。

### 手动触发
1. 进入GitHub仓库 → Actions
2. 选择 "🚀 数据库部署" 工作流
3. 点击 "Run workflow"
4. 选择部署类型：
   - **incremental**: 增量部署（比较差异）
   - **full**: 完整部署（执行database.sql）

### 首次部署建议
如果是首次部署到空数据库，建议选择 **full** 部署类型。 