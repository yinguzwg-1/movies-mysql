# GitHub Secrets 配置说明

## 概述

本项目的GitHub Actions工作流需要配置以下Secrets才能正常运行。这些Secrets对应你的`.env`文件中的配置。

## 需要配置的Secrets

### 1. 阿里云服务器配置

| Secret名称 | 说明 | 示例值 |
|-----------|------|--------|
| `ALIYUN_HOST` | 阿里云服务器IP地址 | `223.4.248.176` |
| `ALIYUN_USERNAME` | SSH登录用户名 | `root` |
| `ALIYUN_SSH_KEY` | SSH私钥内容 | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `ALIYUN_PORT` | SSH端口（可选，默认22） | `22` |

### 2. 数据库配置（可选）

如果你的数据库已经配置好并且可以正常连接，这些Secrets是可选的。GitHub Actions会使用项目中的`.env`文件配置。

| Secret名称 | 说明 | 对应.env字段 | 示例值 |
|-----------|------|-------------|--------|
| `DB_HOST` | 数据库主机地址 | `DB_HOST` | `223.4.248.176` |
| `DB_USER` | 数据库用户名 | `DB_USER` | `root` |
| `DB_PASSWORD` | 数据库密码 | `DB_PASSWORD` | `(空字符串表示无密码)` |
| `DB_NAME` | 数据库名称 | `DB_NAME` | `nest_db` |
| `DB_PORT` | 数据库端口 | `DB_PORT` | `3306` |

## 配置步骤

### 1. 进入GitHub仓库设置

1. 打开你的GitHub仓库
2. 点击 `Settings` 标签
3. 在左侧菜单中点击 `Secrets and variables` → `Actions`

### 2. 添加Secrets

点击 `New repository secret` 按钮，逐个添加以下Secrets：

#### 阿里云服务器配置

```bash
# ALIYUN_HOST
223.4.248.176

# ALIYUN_USERNAME  
root

# ALIYUN_SSH_KEY
-----BEGIN OPENSSH PRIVATE KEY-----
你的SSH私钥内容
-----END OPENSSH PRIVATE KEY-----

# ALIYUN_PORT (可选)
22
```

#### 数据库配置（可选）

如果你的数据库已经配置好，这些Secrets是可选的：

```bash
# DB_HOST (可选)
223.4.248.176

# DB_USER (可选)
root

# DB_PASSWORD (可选)
(留空，表示无密码)

# DB_NAME (可选)
nest_db

# DB_PORT (可选)
3306
```

### 3. 验证配置

配置完成后，你可以：

1. 手动触发工作流：
   - 进入 `Actions` 标签
   - 选择 `🚀 数据库增量部署到阿里云` 工作流
   - 点击 `Run workflow`
   - 选择分支和参数
   - 点击 `Run workflow`

2. 或者推送代码到 `main` 分支触发自动部署

## 注意事项

### SSH密钥配置

1. **生成SSH密钥对**（如果还没有）：
   ```bash
   ssh-keygen -t rsa -b 4096 -C "your_email@example.com"
   ```

2. **将公钥添加到阿里云服务器**：
   ```bash
   # 复制公钥内容
   cat ~/.ssh/id_rsa.pub
   
   # 在阿里云服务器上添加到authorized_keys
   echo "你的公钥内容" >> ~/.ssh/authorized_keys
   ```

3. **将私钥添加到GitHub Secrets**：
   - 复制私钥的完整内容（包括BEGIN和END行）
   - 添加到 `ALIYUN_SSH_KEY` Secret

### 数据库权限

如果你的数据库已经配置好并且可以正常连接（如 `npm run test` 成功），则不需要额外配置。

如果需要配置，确保阿里云服务器上的MySQL允许远程连接：

```sql
-- 允许root用户从任意IP连接（无密码）
ALTER USER 'root'@'%' IDENTIFIED WITH mysql_native_password BY '';
GRANT ALL PRIVILEGES ON *.* TO 'root'@'%' WITH GRANT OPTION;
FLUSH PRIVILEGES;
```

### 防火墙设置

确保阿里云安全组开放了以下端口：
- `22` (SSH)
- `3306` (MySQL)

## 故障排除

### 常见错误

1. **SSH连接失败**
   - 检查 `ALIYUN_HOST` 和 `ALIYUN_PORT` 是否正确
   - 验证SSH密钥是否正确配置
   - 确认服务器防火墙设置

2. **数据库连接失败**
   - 检查数据库配置是否正确
   - 确认MySQL服务正在运行
   - 验证数据库用户权限

3. **权限错误**
   - 确保数据库用户有足够权限
   - 检查MySQL的远程访问设置

### 调试方法

1. 查看GitHub Actions日志
2. 在服务器上手动测试连接
3. 检查环境变量是否正确传递

## 安全建议

1. **定期轮换SSH密钥**
2. **使用强密码**（如果设置密码）
3. **限制数据库用户权限**
4. **定期更新服务器和依赖** 