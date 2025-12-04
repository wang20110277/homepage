# ADFS 单点登录部署指南

本文档描述如何将应用从外网环境迁移到内网，并配置 ADFS 单点登录。

## 一、已完成的代码修改

### 1.1 环境变量配置 (.env)

已修改以下配置：

```env
# OIDC Provider Selection
OIDC_PROVIDER=adfs
NEXT_PUBLIC_OIDC_PROVIDER=adfs

# Authentication - Better Auth / App URLs
BETTER_AUTH_URL=https://platform.largeModel.bobcfc.local
NEXT_PUBLIC_APP_URL=https://platform.largeModel.bobcfc.local

# ADFS Configuration
ADFS_CLIENT_ID=99d969ff-5444-46f5-ab9b-d7c88a857be5
ADFS_CLIENT_SECRET=CJZbsxTTfWbBOxe8SMgmbcatbjrC6oi_RAyY3E4w
ADFS_ISSUER=https://adfstest.bobcfc.local/adfs
ADFS_AUTHORIZATION_URL=https://adfstest.bobcfc.local/adfs/oauth2/authorize
ADFS_TOKEN_URL=https://adfstest.bobcfc.local/adfs/oauth2/token
ADFS_USERINFO_URL=https://adfstest.bobcfc.local/adfs/userinfo
ADFS_JWKS_URL=https://adfstest.bobcfc.local/adfs/discovery/keys
```

### 1.2 代码修改

- **src/lib/auth.ts**: 添加了 `getAdfsProviderConfig()` 函数和 ADFS OAuth2 provider 配置
- **src/lib/auth-client.ts**: 添加了动态 provider 选择逻辑，根据 `NEXT_PUBLIC_OIDC_PROVIDER` 环境变量自动切换
- **src/lib/auth-utils.ts**: 已包含 `mapAdfsClaims()` 函数，支持 ADFS 用户信息映射

## 二、内网部署前置条件

### 2.1 服务器要求

- 操作系统: Ubuntu 或其他 Linux 发行版
- Node.js: 20.x 或更高版本（使用 conda 环境管理）
- pnpm: 包管理器
- PostgreSQL: 数据库服务器

### 2.2 网络配置

#### DNS 配置

内网服务器需要能够解析以下域名：

1. **ADFS 服务器域名**: `adfstest.bobcfc.local` → `10.162.4.37`
2. **应用域名**: `platform.largeModel.bobcfc.local` → `10.162.5.210`

配置方式（任选一种）：

**方法 1: 修改 /etc/hosts 文件**

```bash
sudo nano /etc/hosts
```

添加以下行：

```
10.162.4.37    adfstest.bobcfc.local
10.162.5.210   platform.largeModel.bobcfc.local
```

**方法 2: 配置内网 DNS 服务器**

在网络配置中指向内网 DNS 服务器 `10.162.4.37`。

#### 防火墙配置

确保以下端口开放：

- **3000**: Next.js 应用端口（开发环境）
- **443**: HTTPS（生产环境）
- **5432**: PostgreSQL 数据库（如果数据库在其他服务器）

### 2.3 SSL/TLS 证书

由于 ADFS 使用 HTTPS，应用也需要配置 HTTPS。

#### 选项 1: 使用内网 CA 证书

1. 从内网 CA 申请证书，包含域名：`platform.largeModel.bobcfc.local`
2. 将证书文件放置在服务器上（例如：`/etc/ssl/certs/`）
3. 配置 Node.js 信任内网 CA 根证书

```bash
# 安装内网 CA 根证书
sudo cp internal-ca.crt /usr/local/share/ca-certificates/
sudo update-ca-certificates

# 设置 Node.js 环境变量
export NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt
```

#### 选项 2: 使用 Nginx 反向代理（推荐）

**推荐使用 Nginx 作为反向代理，处理 SSL/TLS 终止。项目已包含完整的 Nginx 配置文件和自动部署脚本。**

**快速部署 Nginx（推荐）：**

```bash
# 使用自动部署脚本（推荐）
cd <项目路径>
sudo bash nginx/deploy-nginx.sh
```

自动部署脚本会完成以下操作：
- ✅ 安装 Nginx（如果未安装）
- ✅ 检查并配置 SSL 证书
- ✅ 部署 Nginx 配置文件
- ✅ 测试配置语法
- ✅ 配置防火墙规则
- ✅ 启动 Nginx 服务

**手动部署 Nginx：**

如果您希望手动控制每个步骤，请参考：

1. **完整的 Nginx 安装和配置指南**: `nginx/NGINX_SETUP.md`
2. **Nginx 配置文件**: `nginx/platform.conf`
3. **快速参考**: `nginx/README.md`

**Nginx 配置特性：**

项目提供的 Nginx 配置（`nginx/platform.conf`）包含：
- HTTP 到 HTTPS 自动重定向
- 反向代理到 Next.js (localhost:3000)
- WebSocket 支持（用于热重载）
- 静态资源缓存优化（`_next/static/` 缓存 1 年）
- Gzip 压缩
- 安全头配置
- SSL/TLS 优化（TLS 1.2/1.3，强加密套件）
- 日志分离

**SSL 证书准备：**

生产环境使用内网 CA 证书：
```bash
# 将证书文件复制到指定位置
sudo cp your-cert.crt /etc/ssl/certs/platform.largeModel.bobcfc.local.crt
sudo cp your-key.key /etc/ssl/private/platform.largeModel.bobcfc.local.key
sudo chmod 644 /etc/ssl/certs/platform.largeModel.bobcfc.local.crt
sudo chmod 600 /etc/ssl/private/platform.largeModel.bobcfc.local.key
```

测试环境可以生成自签名证书：
```bash
sudo bash nginx/generate-ssl-cert.sh
```

**详细文档：**

完整的 Nginx 配置、故障排查和优化指南，请查看：
- **nginx/NGINX_SETUP.md** - 11 个章节的详细配置指南
- **nginx/README.md** - 快速参考和常用命令

## 三、部署步骤

### 3.1 环境准备（在内网服务器上）

#### 使用 conda 环境

```bash
# 创建 conda 环境（如果还没有）
conda create -n homepage python=3.11 nodejs=20 -y
conda activate homepage

# 安装 pnpm、pm2、nginx（使用 conda）
conda install -c conda-forge pnpm pm2 nginx -y

# 验证安装
node --version
pnpm --version
pm2 --version
nginx -v
```

### 3.2 代码迁移

将修改后的代码从外网服务器传输到内网服务器：

```bash
# 方法 1: 使用 scp（如果内外网可以临时打通）
scp -r <项目路径>/ user@10.162.5.210:<目标路径>/

# 方法 2: 使用 U 盘或内部文件传输系统
# 将整个 homepage 目录打包
tar -czf homepage.tar.gz <项目路径>/
# 传输后在内网服务器解压
tar -xzf homepage.tar.gz -C /home/user/
```

### 3.3 配置环境变量

在内网服务器上编辑 `.env` 文件：

```bash
cd /home/user/homepage
nano .env
```

**必须修改的配置项**：

1. **数据库连接**（如果使用内网数据库）:

```env
POSTGRES_URL=postgresql://username:password@内网数据库IP:5432/dbname?sslmode=require
```

2. **验证 ADFS 配置**（已配置好，确认无误即可）:

```env
OIDC_PROVIDER=adfs
NEXT_PUBLIC_OIDC_PROVIDER=adfs
BETTER_AUTH_URL=https://platform.largeModel.bobcfc.local
NEXT_PUBLIC_APP_URL=https://platform.largeModel.bobcfc.local
ADFS_CLIENT_ID=99d969ff-5444-46f5-ab9b-d7c88a857be5
ADFS_CLIENT_SECRET=CJZbsxTTfWbBOxe8SMgmbcatbjrC6oi_RAyY3E4w
```

3. **其他服务地址**（如果有内网替代服务）:

```env
# 如果内网有自己的 Open WebUI 实例
OPEN_WEBUI_BASE_URL=http://内网IP:端口
```

### 3.4 安装依赖

```bash
# 激活 conda 环境
conda activate homepage

# 安装项目依赖
pnpm install
```

### 3.5 数据库迁移

```bash
# 运行数据库迁移
pnpm run db:migrate

# 如果是全新数据库，可以运行 seed（可选）
# pnpm run db:seed
```

### 3.6 构建应用

```bash
# 构建生产版本
pnpm run build
```

### 3.7 启动应用

#### 开发环境（测试用）

```bash
pnpm run dev
```

#### 生产环境

使用 PM2 管理进程：

```bash
# 使用 conda 安装 PM2
conda install -c conda-forge pm2 -y

# 启动应用
pm2 start npm --name "homepage" -- start

# 设置开机自启动
pm2 startup
pm2 save

# 查看日志
pm2 logs homepage

# 查看状态
pm2 status
```

## 四、测试验证

### 4.1 网络连通性测试

```bash
# 测试 ADFS 服务器连通性
ping adfstest.bobcfc.local
curl -I https://adfstest.bobcfc.local/adfs/oauth2/authorize

# 测试应用域名解析
ping platform.largeModel.bobcfc.local
```

### 4.2 ADFS 登录测试

1. 在内网浏览器访问：`https://platform.largeModel.bobcfc.local`
2. 点击 "Sign in" 按钮
3. 应该会重定向到 ADFS 登录页面：`https://adfstest.bobcfc.local/adfs/oauth2/authorize`
4. 使用 bobcfc.local 域账号登录
5. 登录成功后应重定向回应用的 `/dashboard` 页面

### 4.3 用户信息验证

登录后，检查以下内容：

- 用户名是否正确显示（来自 ADFS 的 `unique_name` 字段）
- 用户邮箱是否正确
- 用户角色是否正确分配

可以查看数据库中的用户表：

```bash
pnpm run db:studio
```

## 五、常见问题排查

### 5.1 ADFS 连接失败

**症状**: 点击登录后无响应或报错 "Network Error"

**排查步骤**:

1. 检查 DNS 配置：

```bash
nslookup adfstest.bobcfc.local
# 应该返回 10.162.4.37
```

2. 检查 ADFS 服务器连通性：

```bash
curl -v https://adfstest.bobcfc.local/adfs/oauth2/authorize
```

3. 检查证书信任问题：

```bash
# 查看应用日志，看是否有 SSL 证书错误
pm2 logs homepage --lines 100

# 如果是证书问题，确保已安装内网 CA 根证书
sudo update-ca-certificates --fresh
```

### 5.2 重定向 URI 不匹配

**症状**: ADFS 返回错误 "The redirect URI is not valid"

**解决方案**:

1. 确认 `.env` 中的 `BETTER_AUTH_URL` 和 `NEXT_PUBLIC_APP_URL` 正确
2. 确认 ADFS 中注册的重定向 URI 为：
   ```
   https://platform.largeModel.bobcfc.local/api/auth/callback/adfs
   ```
3. 注意：Better Auth 的回调路径格式为 `/api/auth/callback/{provider}`

### 5.3 用户信息获取失败

**症状**: 登录成功，但用户名或邮箱为空

**排查步骤**:

1. 检查 ADFS 返回的 claims：

在 `src/lib/auth.ts` 的 `profile` 函数中添加日志：

```typescript
async profile(profile: Record<string, unknown>) {
  console.log('ADFS Profile Claims:', JSON.stringify(profile, null, 2));
  // ...
}
```

2. 确认 `src/lib/auth-utils.ts` 中的 `mapAdfsClaims` 函数正确映射字段：
   - `unique_name` → username
   - `email` → email
   - `name` → name

3. 如果字段名不匹配，修改 `mapAdfsClaims` 函数

### 5.4 数据库连接失败

**症状**: 应用启动失败，报 "Database connection error"

**解决方案**:

1. 检查 `.env` 中的 `POSTGRES_URL` 是否正确
2. 确认数据库服务器允许来自应用服务器 IP 的连接
3. 测试数据库连接：

```bash
psql "postgresql://username:password@数据库IP:5432/dbname"
```

### 5.5 HTTPS 证书问题

**症状**: 浏览器显示 "Your connection is not private"

**解决方案**:

1. 确保使用有效的内网 CA 签发的证书
2. 在客户端浏览器导入内网 CA 根证书
3. 或使用 Nginx/Caddy 配置正确的证书路径

## 六、环境差异对比

| 配置项 | 外网环境 | 内网环境 |
|--------|---------|---------|
| 认证方式 | Azure Entra ID | ADFS |
| 应用 URL | http://localhost:3000 | https://platform.largeModel.bobcfc.local |
| 数据库 | neon.tech (云端) | 内网 PostgreSQL |
| OIDC_PROVIDER | entra | adfs |
| SSL/TLS | 开发环境不需要 | 必须配置 HTTPS |

## 七、回滚方案

如果 ADFS 登录遇到问题，可以临时切换回本地账号登录：

1. 修改 `.env`:

```env
# 启用本地管理员账号
LOCAL_ADMIN_EMAIL=admin@local.dev
LOCAL_ADMIN_PASSWORD=ChangeMe123!
```

2. 使用邮箱密码登录方式：

应用已经启用了 `emailAndPassword` 认证方式（在 `src/lib/auth.ts:167-170`），可以直接使用本地账号登录。

3. 创建本地管理员账号（如果还没有）:

访问 `/api/auth/sign-up` 或使用数据库直接插入用户记录。

## 八、性能优化建议

### 8.1 启用缓存

在 Nginx 配置中启用静态资源缓存：

```nginx
location /_next/static/ {
    proxy_pass http://localhost:3000;
    proxy_cache_valid 200 30d;
    add_header Cache-Control "public, max-age=2592000, immutable";
}
```

### 8.2 开启压缩

在 Nginx 中启用 gzip 压缩：

```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
gzip_min_length 1000;
```

### 8.3 数据库连接池

确保 `.env` 中的数据库连接字符串包含连接池配置：

```env
POSTGRES_URL=postgresql://user:pass@host:5432/db?pool_max=20&pool_min=5
```

## 九、安全检查清单

- [ ] HTTPS 已正确配置
- [ ] 数据库连接使用 SSL/TLS (`sslmode=require`)
- [ ] `BETTER_AUTH_SECRET` 使用强随机字符串（至少 32 字符）
- [ ] ADFS Client Secret 妥善保管，不提交到代码仓库
- [ ] 防火墙规则已配置，仅开放必要端口
- [ ] 定期备份数据库
- [ ] 应用日志已配置（使用 PM2 或系统日志）
- [ ] 错误监控已启用（可选：Sentry 等）

## 十、联系支持

如果遇到无法解决的问题，请检查：

1. **应用日志**: `pm2 logs homepage`
2. **Nginx 日志**: `/var/log/nginx/error.log`
3. **系统日志**: `journalctl -u nginx -n 100`
4. **数据库日志**: PostgreSQL 日志文件

记录详细的错误信息，包括：
- 错误时间
- 用户操作步骤
- 完整的错误堆栈信息
- 相关日志片段

---

**文档版本**: 1.0
**最后更新**: 2025-11-26
**适用环境**: Ubuntu + ADFS + PostgreSQL
