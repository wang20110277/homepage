#!/bin/bash

#############################################################
# SSL 证书生成脚本 - 仅用于开发和测试环境
# 生产环境请使用内网 CA 签发的证书
#############################################################

set -e

# 配置变量
DOMAIN="platform.largeModel.bobcfc.local"
CERT_DIR="/etc/ssl/certs"
KEY_DIR="/etc/ssl/private"
DAYS_VALID=365

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}  SSL 自签名证书生成脚本${NC}"
echo -e "${YELLOW}  域名: ${DOMAIN}${NC}"
echo -e "${YELLOW}  警告: 此证书仅用于测试环境！${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 检查是否以 root 运行
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}错误: 请使用 sudo 运行此脚本${NC}"
  echo "使用方法: sudo bash generate-ssl-cert.sh"
  exit 1
fi

# 创建目录
echo -e "${GREEN}[1/5] 创建证书目录...${NC}"
mkdir -p ${CERT_DIR}
mkdir -p ${KEY_DIR}

# 生成私钥
echo -e "${GREEN}[2/5] 生成 RSA 私钥...${NC}"
openssl genrsa -out ${KEY_DIR}/${DOMAIN}.key 2048

# 创建证书签名请求配置文件
echo -e "${GREEN}[3/5] 创建证书配置文件...${NC}"
cat > /tmp/${DOMAIN}.cnf <<EOF
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
req_extensions = v3_req

[dn]
C = CN
ST = Beijing
L = Beijing
O = BobCFC
OU = IT Department
CN = ${DOMAIN}

[v3_req]
keyUsage = critical, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = ${DOMAIN}
DNS.2 = *.bobcfc.local

[v3_ca]
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid:always,issuer
basicConstraints = critical, CA:true
keyUsage = critical, digitalSignature, cRLSign, keyCertSign
EOF

# 生成证书签名请求 (CSR)
echo -e "${GREEN}[4/5] 生成证书签名请求 (CSR)...${NC}"
openssl req -new -key ${KEY_DIR}/${DOMAIN}.key \
  -out /tmp/${DOMAIN}.csr \
  -config /tmp/${DOMAIN}.cnf

# 生成自签名证书
echo -e "${GREEN}[5/5] 生成自签名证书 (有效期 ${DAYS_VALID} 天)...${NC}"
openssl x509 -req -days ${DAYS_VALID} \
  -in /tmp/${DOMAIN}.csr \
  -signkey ${KEY_DIR}/${DOMAIN}.key \
  -out ${CERT_DIR}/${DOMAIN}.crt \
  -extfile /tmp/${DOMAIN}.cnf \
  -extensions v3_req

# 设置正确的权限
echo -e "${GREEN}设置文件权限...${NC}"
chmod 644 ${CERT_DIR}/${DOMAIN}.crt
chmod 600 ${KEY_DIR}/${DOMAIN}.key

# 清理临时文件
rm -f /tmp/${DOMAIN}.csr /tmp/${DOMAIN}.cnf

# 验证证书
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}证书生成成功！${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "证书文件位置:"
echo "  证书: ${CERT_DIR}/${DOMAIN}.crt"
echo "  私钥: ${KEY_DIR}/${DOMAIN}.key"
echo ""
echo "证书详情:"
openssl x509 -in ${CERT_DIR}/${DOMAIN}.crt -noout -subject -issuer -dates
echo ""

# 验证证书和私钥匹配
echo -e "${YELLOW}验证证书和私钥匹配...${NC}"
CERT_MD5=$(openssl x509 -noout -modulus -in ${CERT_DIR}/${DOMAIN}.crt | openssl md5 | cut -d' ' -f2)
KEY_MD5=$(openssl rsa -noout -modulus -in ${KEY_DIR}/${DOMAIN}.key | openssl md5 | cut -d' ' -f2)

if [ "$CERT_MD5" == "$KEY_MD5" ]; then
  echo -e "${GREEN}✓ 证书和私钥匹配${NC}"
else
  echo -e "${RED}✗ 错误: 证书和私钥不匹配${NC}"
  exit 1
fi

echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}下一步操作:${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "证书配置:"
echo "   证书路径: ${CERT_DIR}/${DOMAIN}.crt"
echo "   私钥路径: ${KEY_DIR}/${DOMAIN}.key"
echo ""
echo "启动 Nginx (会自动使用此证书):"
echo "   bash nginx/start-conda-nginx.sh start"
echo ""
echo "在客户端浏览器导入证书:"
echo "   将 ${CERT_DIR}/${DOMAIN}.crt 导入到浏览器的"受信任的根证书颁发机构""
echo ""
echo -e "${RED}警告: 此证书为自签名证书，仅适用于开发和测试环境！${NC}"
echo -e "${RED}生产环境请使用内网 CA 签发的正式证书。${NC}"
echo ""
