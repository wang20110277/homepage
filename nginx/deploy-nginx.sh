#!/bin/bash

#############################################################
# Nginx 快速部署脚本
# 自动配置 Nginx 用于 Next.js 应用 + ADFS 单点登录
#############################################################

set -e

# 获取脚本所在的目录（项目根目录/nginx）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# 项目根目录是脚本所在目录的上一级
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# 配置变量
DOMAIN="platform.largeModel.bobcfc.local"
NGINX_CONFIG_SOURCE="${PROJECT_DIR}/nginx/platform.conf"
CERT_PATH="/etc/ssl/certs/${DOMAIN}.crt"
KEY_PATH="/etc/ssl/private/${DOMAIN}.key"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 打印标题
print_header() {
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}  $1${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
}

# 打印步骤
print_step() {
  echo -e "${GREEN}[✓] $1${NC}"
}

# 打印警告
print_warning() {
  echo -e "${YELLOW}[!] $1${NC}"
}

# 打印错误
print_error() {
  echo -e "${RED}[✗] $1${NC}"
}

# 检查是否以 root 运行
check_root() {
  if [ "$EUID" -ne 0 ]; then
    print_error "请使用 sudo 运行此脚本"
    echo "使用方法: sudo bash deploy-nginx.sh"
    exit 1
  fi
}

# 检测操作系统
detect_os() {
  if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
    VER=$VERSION_ID
  else
    print_error "无法检测操作系统"
    exit 1
  fi
  print_step "检测到操作系统: $OS $VER"
}

# 安装 Nginx
install_nginx() {
  print_header "步骤 1: 安装 Nginx"

  if command -v nginx &> /dev/null; then
    print_warning "Nginx 已安装，跳过安装步骤"
    nginx -v
  else
    if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
      apt update
      apt install -y nginx
    elif [ "$OS" = "centos" ] || [ "$OS" = "rhel" ]; then
      yum install -y epel-release
      yum install -y nginx
    else
      print_error "不支持的操作系统: $OS"
      exit 1
    fi
    print_step "Nginx 安装完成"
  fi
}

# 检查证书
check_certificates() {
  print_header "步骤 2: 检查 SSL 证书"

  if [ -f "$CERT_PATH" ] && [ -f "$KEY_PATH" ]; then
    print_step "找到 SSL 证书"
    echo "  证书: $CERT_PATH"
    echo "  私钥: $KEY_PATH"

    # 验证证书有效性
    if openssl x509 -in "$CERT_PATH" -noout -checkend 86400 > /dev/null 2>&1; then
      print_step "证书有效"
      openssl x509 -in "$CERT_PATH" -noout -subject -dates
    else
      print_warning "证书即将过期或已过期"
    fi
  else
    print_warning "未找到 SSL 证书"
    echo ""
    echo "请选择以下选项之一:"
    echo "1. 使用内网 CA 证书（推荐用于生产环境）"
    echo "2. 生成自签名证书（仅用于测试）"
    echo "3. 稍后手动配置"
    echo ""
    read -p "请选择 (1/2/3): " choice

    case $choice in
      1)
        print_warning "请从内网 CA 获取证书后，将文件放置在:"
        echo "  证书: $CERT_PATH"
        echo "  私钥: $KEY_PATH"
        echo ""
        read -p "证书已准备好？(y/n) " ready
        if [ "$ready" != "y" ]; then
          print_error "部署已取消"
          exit 1
        fi
        ;;
      2)
        if [ -f "${PROJECT_DIR}/nginx/generate-ssl-cert.sh" ]; then
          bash "${PROJECT_DIR}/nginx/generate-ssl-cert.sh"
        else
          print_error "未找到证书生成脚本"
          exit 1
        fi
        ;;
      3)
        print_warning "跳过证书配置，请稍后手动配置"
        ;;
      *)
        print_error "无效的选择"
        exit 1
        ;;
    esac
  fi
}

# 部署 Nginx 配置
deploy_nginx_config() {
  print_header "步骤 3: 部署 Nginx 配置"

  if [ ! -f "$NGINX_CONFIG_SOURCE" ]; then
    print_error "未找到 Nginx 配置文件: $NGINX_CONFIG_SOURCE"
    exit 1
  fi

  # 检测 Nginx 配置目录结构
  if [ -d "/etc/nginx/sites-available" ]; then
    # Ubuntu/Debian 风格
    CONFIG_DEST="/etc/nginx/sites-available/platform.conf"
    ENABLED_LINK="/etc/nginx/sites-enabled/platform.conf"

    cp "$NGINX_CONFIG_SOURCE" "$CONFIG_DEST"
    print_step "配置文件已复制到 $CONFIG_DEST"

    # 创建符号链接
    if [ -L "$ENABLED_LINK" ]; then
      print_warning "符号链接已存在，跳过"
    else
      ln -s "$CONFIG_DEST" "$ENABLED_LINK"
      print_step "已创建符号链接"
    fi

    # 询问是否删除默认站点
    if [ -L "/etc/nginx/sites-enabled/default" ]; then
      read -p "是否删除默认站点配置？(y/n) " remove_default
      if [ "$remove_default" = "y" ]; then
        rm -f /etc/nginx/sites-enabled/default
        print_step "已删除默认站点配置"
      fi
    fi
  else
    # CentOS/RHEL 风格
    CONFIG_DEST="/etc/nginx/conf.d/platform.conf"
    cp "$NGINX_CONFIG_SOURCE" "$CONFIG_DEST"
    print_step "配置文件已复制到 $CONFIG_DEST"
  fi
}

# 测试 Nginx 配置
test_nginx_config() {
  print_header "步骤 4: 测试 Nginx 配置"

  if nginx -t; then
    print_step "Nginx 配置测试通过"
  else
    print_error "Nginx 配置测试失败"
    echo ""
    echo "请检查配置文件并修复错误"
    exit 1
  fi
}

# 配置防火墙
configure_firewall() {
  print_header "步骤 5: 配置防火墙"

  if command -v ufw &> /dev/null && ufw status | grep -q "Status: active"; then
    # Ubuntu UFW
    ufw allow 'Nginx Full' || ufw allow 80/tcp && ufw allow 443/tcp
    print_step "UFW 防火墙规则已配置"
  elif command -v firewall-cmd &> /dev/null && systemctl is-active firewalld &> /dev/null; then
    # CentOS/RHEL firewalld
    firewall-cmd --permanent --add-service=http
    firewall-cmd --permanent --add-service=https
    firewall-cmd --reload
    print_step "Firewalld 防火墙规则已配置"
  else
    print_warning "未检测到防火墙或防火墙未启用"
    echo "请手动开放端口 80 和 443"
  fi
}

# 启动 Nginx
start_nginx() {
  print_header "步骤 6: 启动 Nginx"

  # 启用 Nginx 开机自启动
  systemctl enable nginx
  print_step "已设置 Nginx 开机自启动"

  # 重新加载配置
  if systemctl is-active --quiet nginx; then
    systemctl reload nginx
    print_step "Nginx 配置已重新加载"
  else
    systemctl start nginx
    print_step "Nginx 已启动"
  fi

  # 检查状态
  if systemctl is-active --quiet nginx; then
    print_step "Nginx 运行正常"
  else
    print_error "Nginx 启动失败"
    systemctl status nginx
    exit 1
  fi
}

# 测试访问
test_access() {
  print_header "步骤 7: 测试访问"

  echo "测试 HTTP 重定向..."
  if curl -s -o /dev/null -w "%{http_code}" http://localhost | grep -q "301"; then
    print_step "HTTP 重定向正常 (301)"
  else
    print_warning "HTTP 重定向可能有问题"
  fi

  echo ""
  echo "测试 HTTPS 访问..."
  if curl -k -s -o /dev/null -w "%{http_code}" https://localhost | grep -q "200"; then
    print_step "HTTPS 访问正常 (200)"
  else
    print_warning "HTTPS 访问可能有问题"
  fi
}

# 显示摘要
show_summary() {
  print_header "部署完成"

  echo -e "${GREEN}Nginx 已成功配置！${NC}"
  echo ""
  echo "配置摘要:"
  echo "  域名: $DOMAIN"
  echo "  HTTP 端口: 80 (重定向到 HTTPS)"
  echo "  HTTPS 端口: 443"
  echo "  后端: Next.js (localhost:3000)"
  echo ""
  echo "访问地址:"
  echo "  内网: https://$DOMAIN"
  echo "  本地: https://localhost"
  echo ""
  echo "日志文件:"
  echo "  访问日志: /var/log/nginx/platform_https_access.log"
  echo "  错误日志: /var/log/nginx/platform_https_error.log"
  echo ""
  echo "常用命令:"
  echo "  测试配置: sudo nginx -t"
  echo "  重新加载: sudo systemctl reload nginx"
  echo "  重启服务: sudo systemctl restart nginx"
  echo "  查看状态: sudo systemctl status nginx"
  echo "  查看日志: sudo tail -f /var/log/nginx/platform_https_access.log"
  echo ""
  print_warning "下一步:"
  echo "1. 确保 Next.js 应用正在运行 (pm2 status)"
  echo "2. 在客户端浏览器访问: https://$DOMAIN"
  echo "3. 如果使用自签名证书，需要在浏览器导入证书"
  echo ""
}

# 主函数
main() {
  print_header "Nginx 自动部署脚本"
  echo "域名: $DOMAIN"
  echo "项目目录: $PROJECT_DIR"
  echo ""

  check_root
  detect_os
  install_nginx
  check_certificates
  deploy_nginx_config
  test_nginx_config
  configure_firewall
  start_nginx
  test_access
  show_summary

  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${GREEN}部署成功完成！${NC}"
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# 运行主函数
main
