# 🚀 快速开始

## 1. 安装依赖

```bash
npm install
```

## 2. 配置数据库

复制 `env.example` 为 `.env` 并编辑：

```env
LOCAL_DB_HOST=localhost
LOCAL_DB_PORT=3306
LOCAL_DB_USER=root
LOCAL_DB_PASSWORD=你的密码
LOCAL_DB_NAME=你的数据库名
```

## 3. 导出数据库

### Windows
```bash
export.bat
```

### Linux/Mac
```bash
chmod +x export.sh
./export.sh
```

### 手动导出
```bash
npm run export
```

## 4. 部署到阿里云

1. 提交 SQL 文件到 GitHub
2. 在 GitHub 仓库设置中添加 Secrets
3. 推送代码，GitHub Actions 自动部署

## 5. GitHub Secrets 配置

在 GitHub 仓库的 Settings > Secrets and variables > Actions 中添加：

- `ALIYUN_HOST` - 服务器IP
- `ALIYUN_USERNAME` - 用户名（通常是 root）
- `ALIYUN_SSH_KEY` - SSH 私钥内容
- `DB_USER` - 数据库用户名
- `DB_PASSWORD` - 数据库密码
- `DB_NAME` - 数据库名称

## 完成！

就是这么简单！🎉 