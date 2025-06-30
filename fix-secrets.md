# 🚀 快速修复 GitHub Secrets

## 问题
数据库名称显示为 `***`，说明 GitHub Secrets 配置有问题。

## 快速修复步骤

### 1. 进入 GitHub 仓库设置
1. 打开你的 GitHub 仓库
2. 点击 `Settings` 标签
3. 点击左侧菜单 `Secrets and variables` → `Actions`

### 2. 删除有问题的 Secret
1. 找到 `DB_NAME` Secret
2. 点击旁边的垃圾桶图标 🗑️
3. 确认删除

### 3. 重新创建 DB_NAME Secret
1. 点击 `New repository secret`
2. Name: `DB_NAME`
3. Value: `nest_db` （不要加引号，不要加空格）
4. 点击 `Add secret`

### 4. 验证其他 Secrets
确保以下 Secrets 都存在且正确：

| Secret | 值 |
|--------|-----|
| `DB_NAME` | `nest_db` |
| `DB_USER` | `root` |
| `DB_PASSWORD` | `qq123456` |
| `ALIYUN_HOST` | 你的服务器IP |
| `ALIYUN_USERNAME` | `root` |
| `ALIYUN_SSH_KEY` | 你的SSH私钥 |

### 5. 重新生成数据库文件

#### Windows
```bash
regenerate-db.bat
```

#### Linux/Mac
```bash
chmod +x regenerate-db.sh
./regenerate-db.sh
```

### 6. 推送代码
```bash
git add database.sql
git commit -m "重新生成数据库文件"
git push
```

## 预期结果

修复后，GitHub Actions 日志应该显示：
```
数据库名称: 'nest_db'
✅ 数据库 'nest_db' 已存在
📥 方法1：先切换到数据库 'nest_db'，再导入...
✅ 数据库导入成功！
```

## 如果还有问题

1. **检查 Secrets 权限** - 确保仓库有 Actions 权限
2. **重新创建所有 Secrets** - 删除并重新创建所有相关 Secrets
3. **检查仓库设置** - 确保 Actions 功能已启用 