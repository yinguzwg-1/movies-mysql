# GitHub Actions 修改总结

## 修改概述

已将GitHub Actions工作流简化为只支持增量部署，并根据`.env`文件字段配置了相应的Secrets。

## 主要修改

### 1. 简化工作流配置

**修改前**:
- 支持多种部署类型（incremental, full）
- 支持多环境配置（development, test, staging, production）
- 复杂的参数配置

**修改后**:
- 只支持增量部署
- 简化为单一环境
- 简化的参数配置

### 2. 更新触发条件

```yaml
on:
  push:
    branches: [ main, master ]
    paths:
      - 'src/**'
      - '.github/workflows/deploy-database.yml'
      - '.env'  # 新增：.env文件变更时触发
```

### 3. 简化输入参数

**修改前**:
```yaml
inputs:
  deploy_type: # 部署类型
  source_env:  # 源环境
  target_env:  # 目标环境
  database_file: # 数据库文件
```

**修改后**:
```yaml
inputs:
  auto_execute: # 是否自动执行
  output_file:  # 输出文件路径
```

### 4. 更新Secrets配置

#### 必需的Secrets（阿里云服务器配置）
- `ALIYUN_HOST`: 服务器IP地址
- `ALIYUN_USERNAME`: SSH用户名
- `ALIYUN_SSH_KEY`: SSH私钥
- `ALIYUN_PORT`: SSH端口（可选）

#### 可选的Secrets（数据库配置）
如果项目中的`.env`文件已经配置好数据库连接，这些Secrets是可选的：
- `DB_HOST`: 数据库主机
- `DB_USER`: 数据库用户
- `DB_PASSWORD`: 数据库密码
- `DB_NAME`: 数据库名称
- `DB_PORT`: 数据库端口

### 5. 简化部署脚本

**修改前**:
- 复杂的多环境配置生成
- 支持完整部署和增量部署
- 硬编码的配置

**修改后**:
- 使用简化的配置
- 只支持增量部署
- 使用Secrets中的配置

## 配置文件对应关系

### 主要配置（使用.env文件）
GitHub Actions会优先使用项目中的`.env`文件配置：

| .env字段 | 说明 |
|---------|------|
| `DB_HOST` | 数据库主机地址 |
| `DB_USER` | 数据库用户名 |
| `DB_PASSWORD` | 数据库密码 |
| `DB_NAME` | 数据库名称 |
| `DB_PORT` | 数据库端口 |

### 备用配置（GitHub Secrets）
如果`.env`文件不存在，会使用GitHub Secrets作为备用：

| .env字段 | GitHub Secret | 说明 |
|---------|---------------|------|
| `DB_HOST` | `DB_HOST` | 数据库主机地址 |
| `DB_USER` | `DB_USER` | 数据库用户名 |
| `DB_PASSWORD` | `DB_PASSWORD` | 数据库密码 |
| `DB_NAME` | `DB_NAME` | 数据库名称 |
| `DB_PORT` | `DB_PORT` | 数据库端口 |

## 使用方式

### 1. 自动触发
推送代码到 `main` 分支时自动触发部署。

### 2. 手动触发
1. 进入GitHub仓库的Actions页面
2. 选择 `🚀 数据库增量部署到阿里云` 工作流
3. 点击 `Run workflow`
4. 配置参数：
   - **自动执行**: 是否自动执行SQL变更
   - **输出文件**: 可选的SQL文件输出路径

## 部署流程

1. **检出代码**: 从GitHub仓库检出最新代码
2. **设置Node.js**: 安装Node.js 18
3. **安装依赖**: 运行 `npm install`
4. **准备服务器**: 在阿里云服务器上安装必要软件
5. **配置数据库**: 设置数据库用户和权限
6. **上传文件**: 将项目文件上传到服务器
7. **执行部署**: 运行增量部署脚本
8. **验证结果**: 检查部署是否成功
9. **重启应用**: 重启相关应用服务
10. **清理文件**: 清理临时文件

## 优势

1. **简化配置**: 移除了复杂的环境配置
2. **统一管理**: 使用Secrets统一管理敏感信息
3. **自动化**: 支持自动和手动触发
4. **安全性**: 敏感信息不暴露在代码中
5. **可维护性**: 配置更清晰，易于维护

## 注意事项

1. **Secrets配置**: 确保所有必要的Secrets都已正确配置
2. **服务器权限**: 确保SSH密钥和数据库权限配置正确
3. **网络连接**: 确保服务器网络连接正常
4. **防火墙设置**: 确保相关端口已开放

## 故障排除

如果部署失败，请检查：

1. **GitHub Secrets**: 是否所有Secrets都已正确配置
2. **SSH连接**: 服务器是否可以正常SSH连接
3. **数据库连接**: 数据库是否可以正常连接
4. **权限设置**: 数据库用户是否有足够权限
5. **日志信息**: 查看GitHub Actions的详细日志 