# ADFS 部署快速检查清单

## 代码迁移前（外网服务器）

- [x] 修改 `.env` 文件，配置 ADFS 环境变量
- [x] 修改 `src/lib/auth.ts`，添加 ADFS provider
- [x] 修改 `src/lib/auth-client.ts`，支持动态 provider
- [x] 运行 `pnpm run lint` - 通过 ✓
- [x] 运行 `pnpm run typecheck` - 通过 ✓
- [ ] 打包代码：`tar -czf homepage.tar.gz ~/homepage`

## 内网服务器准备

### 网络配置

- [ ] 配置 DNS 或 /etc/hosts:
  ```bash
  echo "10.162.4.37    adfstest.bobcfc.local" | sudo tee -a /etc/hosts
  echo "10.162.5.210   platform.largeModel.bobcfc.local" | sudo tee -a /etc/hosts
  ```

- [ ] 测试 ADFS 连通性:
  ```bash
  ping adfstest.bobcfc.local
  curl -I https://adfstest.bobcfc.local/adfs/oauth2/authorize
  ```

### SSL 证书配置

- [ ] 安装内网 CA 根证书:
  ```bash
  sudo cp internal-ca.crt /usr/local/share/ca-certificates/
  sudo update-ca-certificates
  ```

- [ ] 配置 Nginx 反向代理（推荐）或直接配置应用 HTTPS

### Conda 环境

- [ ] 创建并激活 conda 环境:
  ```bash
  conda create -n homepage python=3.11 nodejs=20 -y
  conda activate homepage
  conda install -c conda-forge pnpm pm2 nginx -y
  ```

### Nginx 配置

**方案 A: 使用 Conda Nginx（推荐用于内网无系统 Nginx 的环境）**

- [ ] Nginx 已通过 conda 安装（在上一步已完成）
- [ ] 配置 SSL 证书:
  ```bash
  # 选项 1: 使用内网 CA 证书（生产环境）
  sudo cp your-cert.crt /etc/ssl/certs/platform.largeModel.bobcfc.local.crt
  sudo cp your-key.key /etc/ssl/private/platform.largeModel.bobcfc.local.key
  sudo chmod 644 /etc/ssl/certs/platform.largeModel.bobcfc.local.crt
  sudo chmod 600 /etc/ssl/private/platform.largeModel.bobcfc.local.key

  # 选项 2: 生成自签名证书（仅测试）
  sudo bash nginx/generate-ssl-cert.sh
  ```

- [ ] 启动 Conda Nginx:
  ```bash
  bash nginx/start-conda-nginx.sh start
  ```

- [ ] 验证 Conda Nginx:
  ```bash
  bash nginx/start-conda-nginx.sh status
  curl -k -I https://platform.largeModel.bobcfc.local
  ```

**方案 B: 使用系统 Nginx（如果系统已安装 Nginx）**

- [ ] 安装 Nginx:
  ```bash
  # 自动部署（推荐）
  sudo bash nginx/deploy-nginx.sh

  # 或手动安装
  sudo apt install nginx -y  # Ubuntu/Debian
  # sudo yum install nginx -y  # CentOS/RHEL
  ```

- [ ] 配置 SSL 证书:
  ```bash
  # 选项 1: 使用内网 CA 证书（生产环境）
  sudo cp your-cert.crt /etc/ssl/certs/platform.largeModel.bobcfc.local.crt
  sudo cp your-key.key /etc/ssl/private/platform.largeModel.bobcfc.local.key
  sudo chmod 644 /etc/ssl/certs/platform.largeModel.bobcfc.local.crt
  sudo chmod 600 /etc/ssl/private/platform.largeModel.bobcfc.local.key

  # 选项 2: 生成自签名证书（仅测试）
  sudo bash nginx/generate-ssl-cert.sh
  ```

- [ ] 部署 Nginx 配置:
  ```bash
  # Ubuntu/Debian
  sudo cp nginx/platform.conf /etc/nginx/sites-available/
  sudo ln -s /etc/nginx/sites-available/platform.conf /etc/nginx/sites-enabled/
  sudo rm -f /etc/nginx/sites-enabled/default  # 可选

  # CentOS/RHEL
  sudo cp nginx/platform.conf /etc/nginx/conf.d/
  ```

- [ ] 测试并启动 Nginx:
  ```bash
  sudo nginx -t
  sudo systemctl start nginx
  sudo systemctl enable nginx
  sudo systemctl status nginx
  ```

- [ ] 验证 Nginx 配置:
  ```bash
  # 检查端口监听
  sudo ss -tlnp | grep nginx

  # 测试 HTTP 重定向
  curl -I http://platform.largeModel.bobcfc.local

  # 测试 HTTPS 访问
  curl -k -I https://platform.largeModel.bobcfc.local
  ```

## 应用部署

### 1. 代码传输与解压

- [ ] 传输代码到内网服务器
- [ ] 解压到目标目录：
  ```bash
  tar -xzf homepage.tar.gz -C /home/user/
  cd /home/user/homepage
  ```

### 2. 环境变量配置

- [ ] 编辑 `.env` 文件：
  ```bash
  nano .env
  ```

- [ ] 检查关键配置:
  - [ ] `OIDC_PROVIDER=adfs`
  - [ ] `NEXT_PUBLIC_OIDC_PROVIDER=adfs`
  - [ ] `BETTER_AUTH_URL=https://platform.largeModel.bobcfc.local`
  - [ ] `NEXT_PUBLIC_APP_URL=https://platform.largeModel.bobcfc.local`
  - [ ] `POSTGRES_URL=` (内网数据库地址)
  - [ ] ADFS 相关配置（Client ID, Secret, URLs）

### 3. 依赖安装与构建

- [ ] 激活 conda 环境：
  ```bash
  conda activate homepage
  ```

- [ ] 安装依赖：
  ```bash
  pnpm install
  ```

- [ ] 运行数据库迁移：
  ```bash
  pnpm run db:migrate
  ```

- [ ] 构建应用：
  ```bash
  pnpm run build
  ```

### 4. 启动应用

#### 测试启动（可选）

- [ ] 开发模式测试：
  ```bash
  pnpm run dev
  ```
  访问 `https://platform.largeModel.bobcfc.local` 测试

#### 生产启动

- [ ] 使用 PM2 启动：
  ```bash
  pm2 start npm --name "homepage" -- start
  pm2 startup
  pm2 save
  ```

- [ ] 检查状态：
  ```bash
  pm2 status
  pm2 logs homepage
  ```

## 功能测试

### 基础功能

- [ ] 访问首页：`https://platform.largeModel.bobcfc.local`
- [ ] 页面正常加载，无 SSL 证书错误

### ADFS 登录测试

- [ ] 点击 "Sign in" 按钮
- [ ] 重定向到 ADFS 登录页面：`https://adfstest.bobcfc.local/adfs/oauth2/authorize`
- [ ] 使用域账号登录（bobcfc.local）
- [ ] 成功重定向回应用 `/dashboard` 页面
- [ ] 用户信息正确显示（用户名、邮箱）

### 用户数据验证

- [ ] 检查数据库用户表：
  ```bash
  pnpm run db:studio
  ```
- [ ] 确认用户记录已创建
- [ ] 确认 `providerId` 和 `provider` 字段正确

### 会话持久性

- [ ] 刷新页面，会话保持
- [ ] 关闭浏览器重新打开，会话保持（如果配置了 remember me）
- [ ] 登出功能正常

## 故障排查

### 如果登录失败

1. **检查应用日志**:
   ```bash
   pm2 logs homepage --lines 50
   ```

2. **检查 ADFS 连通性**:
   ```bash
   curl -v https://adfstest.bobcfc.local/adfs/oauth2/authorize
   ```

3. **检查重定向 URI**:
   - 应用配置：`https://platform.largeModel.bobcfc.local`
   - ADFS 注册：`https://platform.largeModel.bobcfc.local/api/auth/callback/adfs`

4. **检查证书**:
   ```bash
   openssl s_client -connect adfstest.bobcfc.local:443 -showcerts
   ```

5. **启用调试日志**:
   在 `src/lib/auth.ts` 的 `profile` 函数中添加：
   ```typescript
   console.log('ADFS Profile:', JSON.stringify(profile, null, 2));
   ```

### 如果数据库连接失败

- [ ] 测试数据库连接：
  ```bash
  psql "$POSTGRES_URL"
  ```

- [ ] 检查数据库防火墙规则
- [ ] 确认数据库 SSL 配置

### 如果 HTTPS 证书错误

- [ ] 检查 Nginx 配置
- [ ] 检查证书文件路径和权限
- [ ] 在浏览器导入内网 CA 根证书

## 性能优化（可选）

- [ ] Nginx 启用 gzip 压缩
- [ ] Nginx 配置静态资源缓存
- [ ] 数据库连接池配置
- [ ] 启用 CDN（内网 CDN）

## 安全检查

- [ ] HTTPS 强制启用（HTTP 重定向到 HTTPS）
- [ ] 数据库连接使用 SSL
- [ ] `BETTER_AUTH_SECRET` 是强随机字符串
- [ ] 敏感环境变量不提交到代码仓库
- [ ] 防火墙规则已配置
- [ ] 定期数据库备份计划

## 监控与维护

- [ ] 配置日志轮转（PM2 或 logrotate）
- [ ] 设置错误告警（可选）
- [ ] 定期检查应用更新
- [ ] 定期检查依赖安全漏洞：`pnpm audit`

---

## 关键配置快速参考

**ADFS 端点**:
- Authorization: `https://adfstest.bobcfc.local/adfs/oauth2/authorize`
- Token: `https://adfstest.bobcfc.local/adfs/oauth2/token`
- UserInfo: `https://adfstest.bobcfc.local/adfs/userinfo`

**应用配置**:
- Client ID: `99d969ff-5444-46f5-ab9b-d7c88a857be5`
- Client Secret: `CJZbsxTTfWbBOxe8SMgmbcatbjrC6oi_RAyY3E4w`
- Callback URL: `https://platform.largeModel.bobcfc.local/api/auth/callback/adfs`

**DNS 配置**:
- ADFS Server: `adfstest.bobcfc.local` → `10.162.4.37`
- Application: `platform.largeModel.bobcfc.local` → `10.162.5.210`

---

**检查清单版本**: 1.0
**最后更新**: 2025-11-26
