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

推送代码到 `main` 分支或手动触发Actions。 