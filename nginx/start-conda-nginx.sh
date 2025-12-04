#!/bin/bash

#############################################################
# Conda Nginx 启动脚本
# 使用 conda 环境中的 Nginx，无需系统级安装
#############################################################

set -e

# 获取脚本所在的目录（项目根目录/nginx）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# 项目根目录是脚本所在目录的上一级
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# 获取真实用户的家目录（即使使用 sudo 也能正确获取）
if [ -n "$SUDO_USER" ]; then
    # 如果使用 sudo，获取真实用户的家目录
    REAL_USER="$SUDO_USER"
    REAL_HOME=$(eval echo ~$SUDO_USER)
else
    # 没有使用 sudo
    REAL_USER="$USER"
    REAL_HOME="$HOME"
fi

# 配置变量
ENV_NAME="homepage"
NGINX_CONF="${PROJECT_DIR}/nginx/platform.conf"
NGINX_PREFIX="${PROJECT_DIR}/nginx/runtime"
LOGS_DIR="${NGINX_PREFIX}/logs"
PID_FILE="${NGINX_PREFIX}/nginx.pid"

# 检测 conda 环境路径
if [ -d "$REAL_HOME/miniforge3/envs/${ENV_NAME}" ]; then
    CONDA_ENV_PATH="$REAL_HOME/miniforge3/envs/${ENV_NAME}"
elif [ -d "$REAL_HOME/anaconda3/envs/${ENV_NAME}" ]; then
    CONDA_ENV_PATH="$REAL_HOME/anaconda3/envs/${ENV_NAME}"
elif [ -d "$REAL_HOME/miniconda3/envs/${ENV_NAME}" ]; then
    CONDA_ENV_PATH="$REAL_HOME/miniconda3/envs/${ENV_NAME}"
else
    echo "错误: 未找到 conda 环境 ${ENV_NAME}"
    echo "检查的路径:"
    echo "  - $REAL_HOME/miniforge3/envs/${ENV_NAME}"
    echo "  - $REAL_HOME/anaconda3/envs/${ENV_NAME}"
    echo "  - $REAL_HOME/miniconda3/envs/${ENV_NAME}"
    echo "当前用户: $REAL_USER"
    echo "家目录: $REAL_HOME"
    exit 1
fi

NGINX_BIN="${CONDA_ENV_PATH}/bin/nginx"

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
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

# 检查 Nginx 是否已安装
check_nginx() {
    if [ ! -f "$NGINX_BIN" ]; then
        echo -e "${RED}错误: Nginx 未在 conda 环境中安装${NC}"
        echo ""
        echo "请运行以下命令安装:"
        echo "  conda install -n ${ENV_NAME} -c conda-forge nginx -y"
        exit 1
    fi

    # 显示使用的 Nginx 信息
    echo -e "${GREEN}找到 Conda Nginx:${NC}"
    echo "  路径: $NGINX_BIN"
    echo "  版本: $("$NGINX_BIN" -v 2>&1)"
    echo ""
}

# 创建必要的目录
setup_directories() {
    echo -e "${GREEN}创建必要的目录...${NC}"
    mkdir -p "$NGINX_PREFIX"
    mkdir -p "$LOGS_DIR"
    mkdir -p "${NGINX_PREFIX}/conf"
    mkdir -p "${NGINX_PREFIX}/html"
    mkdir -p "${NGINX_PREFIX}/tmp"
    mkdir -p "${NGINX_PREFIX}/tmp/client_body"
    mkdir -p "${NGINX_PREFIX}/tmp/proxy"
    mkdir -p "${NGINX_PREFIX}/tmp/fastcgi"
    mkdir -p "${NGINX_PREFIX}/tmp/uwsgi"
    mkdir -p "${NGINX_PREFIX}/tmp/scgi"

    # 如果使用 sudo 运行，需要修改目录所有权为真实用户
    if [ -n "$SUDO_USER" ]; then
        chown -R "$REAL_USER:$REAL_USER" "$NGINX_PREFIX"
        echo -e "${GREEN}已将目录所有权设置为: $REAL_USER${NC}"
    fi

    # 确保目录权限正确
    chmod -R 755 "$NGINX_PREFIX"
    chmod 755 "$LOGS_DIR"

    # 确认目录创建成功
    echo "  运行时目录: $NGINX_PREFIX"
    echo "  日志目录: $LOGS_DIR"
    echo ""
}

# 生成 Nginx 配置
generate_config() {
    # 检测 mime.types 文件位置
    MIME_TYPES=""
    if [ -f "${CONDA_ENV_PATH}/etc/nginx/mime.types" ]; then
        MIME_TYPES="${CONDA_ENV_PATH}/etc/nginx/mime.types"
    elif [ -f "${CONDA_ENV_PATH}/conf/mime.types" ]; then
        MIME_TYPES="${CONDA_ENV_PATH}/conf/mime.types"
    elif [ -f "/etc/nginx/mime.types" ]; then
        # 如果 conda nginx 没有，复制系统的到我们的目录
        echo -e "${YELLOW}从系统复制 mime.types 文件${NC}"
        cp /etc/nginx/mime.types "${NGINX_PREFIX}/conf/mime.types"
        MIME_TYPES="${NGINX_PREFIX}/conf/mime.types"
    else
        # 如果都没有，创建一个基本的 mime.types
        echo -e "${YELLOW}创建基本的 mime.types 文件${NC}"
        cat > "${NGINX_PREFIX}/conf/mime.types" << 'MIME_EOF'
types {
    text/html                             html htm shtml;
    text/css                              css;
    text/xml                              xml;
    image/gif                             gif;
    image/jpeg                            jpeg jpg;
    application/javascript                js;
    application/atom+xml                  atom;
    application/rss+xml                   rss;
    text/plain                            txt;
    image/png                             png;
    image/x-icon                          ico;
    image/svg+xml                         svg svgz;
    application/json                      json;
    application/pdf                       pdf;
    application/zip                       zip;
}
MIME_EOF
        MIME_TYPES="${NGINX_PREFIX}/conf/mime.types"
    fi

    echo -e "${GREEN}使用 mime.types: $MIME_TYPES${NC}"
    echo ""

    echo -e "${GREEN}生成站点配置文件...${NC}"
    echo "  原始配置: $NGINX_CONF"
    echo "  目标日志目录: $LOGS_DIR"
    echo "  目标HTML目录: ${NGINX_PREFIX}/html"
    echo ""

    # 复制原始配置并调整路径（使用双引号让变量展开）
    sed \
        -e "s|/var/log/nginx/|${LOGS_DIR}/|g" \
        -e "s|/var/www/html|${NGINX_PREFIX}/html|g" \
        "$NGINX_CONF" > "${NGINX_PREFIX}/conf/nginx.conf"

    echo "  站点配置文件: ${NGINX_PREFIX}/conf/nginx.conf"
    echo ""

    echo -e "${GREEN}生成主配置文件...${NC}"

    # 添加必要的全局配置
    cat > "${NGINX_PREFIX}/conf/nginx-main.conf" << EOF
# Nginx 主配置文件（由 Conda Nginx 使用）
# 自动生成，请勿手动编辑

# 用户配置 - 明确指定以当前用户运行，避免切换到 nobody
user ${REAL_USER} ${REAL_USER};

# 工作进程配置
worker_processes auto;

# PID 文件
pid ${PID_FILE};

# 错误日志
error_log ${LOGS_DIR}/error.log warn;

# 事件配置
events {
    worker_connections 1024;
    use epoll;
}

# HTTP 配置
http {
    include ${MIME_TYPES};
    default_type application/octet-stream;

    # 日志格式
    log_format main '\$remote_addr - \$remote_user [\$time_local] "\$request" '
                    '\$status \$body_bytes_sent "\$http_referer" '
                    '"\$http_user_agent" "\$http_x_forwarded_for"';

    # 基本设置
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    # 临时文件路径
    client_body_temp_path ${NGINX_PREFIX}/tmp/client_body;
    proxy_temp_path ${NGINX_PREFIX}/tmp/proxy;
    fastcgi_temp_path ${NGINX_PREFIX}/tmp/fastcgi;
    uwsgi_temp_path ${NGINX_PREFIX}/tmp/uwsgi;
    scgi_temp_path ${NGINX_PREFIX}/tmp/scgi;

    # 包含站点配置
    include ${NGINX_PREFIX}/conf/nginx.conf;
}
EOF

    # 如果使用 sudo 运行，修改配置文件所有权
    if [ -n "$SUDO_USER" ]; then
        chown "$REAL_USER:$REAL_USER" "${NGINX_PREFIX}/conf/nginx.conf"
        chown "$REAL_USER:$REAL_USER" "${NGINX_PREFIX}/conf/nginx-main.conf"
    fi

    # 确保配置文件可读
    chmod 644 "${NGINX_PREFIX}/conf/nginx.conf"
    chmod 644 "${NGINX_PREFIX}/conf/nginx-main.conf"

    echo "  主配置文件: ${NGINX_PREFIX}/conf/nginx-main.conf"
    echo "  站点配置文件: ${NGINX_PREFIX}/conf/nginx.conf"
    echo ""
}

# 检查证书
check_certificates() {
    CERT_PATH="/etc/ssl/certs/platform.largeModel.bobcfc.local.crt"
    KEY_PATH="/etc/ssl/private/platform.largeModel.bobcfc.local.key"

    if [ ! -f "$CERT_PATH" ] || [ ! -f "$KEY_PATH" ]; then
        echo -e "${YELLOW}警告: SSL 证书未找到${NC}"
        echo ""
        echo "请先配置 SSL 证书:"
        echo "  sudo cp your-cert.crt $CERT_PATH"
        echo "  sudo cp your-key.key $KEY_PATH"
        echo ""
        echo "或生成自签名证书:"
        echo "  sudo bash ${PROJECT_DIR}/nginx/generate-ssl-cert.sh"
        echo ""
        read -p "是否继续？(y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# 测试配置
test_config() {
    echo -e "${GREEN}测试 Nginx 配置...${NC}"
    echo "  使用二进制: $NGINX_BIN"
    echo "  配置文件: ${NGINX_PREFIX}/conf/nginx-main.conf"
    echo "  工作目录: $NGINX_PREFIX"
    echo ""

    # 设置错误日志环境变量，避免使用默认路径
    if "$NGINX_BIN" -t -c "${NGINX_PREFIX}/conf/nginx-main.conf" -p "$NGINX_PREFIX" -e "${LOGS_DIR}/error.log" 2>&1 | grep -v "could not open error log file"; then
        echo -e "${GREEN}✓ 配置测试通过${NC}"
    else
        echo -e "${RED}✗ 配置测试失败${NC}"
        echo ""
        echo "详细错误："
        "$NGINX_BIN" -t -c "${NGINX_PREFIX}/conf/nginx-main.conf" -p "$NGINX_PREFIX" -e "${LOGS_DIR}/error.log"
        exit 1
    fi
}

# 启动 Nginx
start_nginx() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if kill -0 "$PID" 2>/dev/null; then
            echo -e "${YELLOW}Nginx 已在运行 (PID: $PID)${NC}"
            echo "如需重启，请先运行: bash $0 stop"
            exit 0
        else
            rm -f "$PID_FILE"
        fi
    fi

    echo -e "${GREEN}启动 Nginx...${NC}"
    echo "  使用二进制: $NGINX_BIN"
    echo "  主配置文件: ${NGINX_PREFIX}/conf/nginx-main.conf"
    echo "  工作目录: $NGINX_PREFIX"
    echo "  错误日志: ${LOGS_DIR}/error.log"
    echo ""

    "$NGINX_BIN" -c "${NGINX_PREFIX}/conf/nginx-main.conf" -p "$NGINX_PREFIX" -e "${LOGS_DIR}/error.log"

    sleep 1

    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        echo -e "${GREEN}✓ Nginx 已启动 (PID: $PID)${NC}"
    else
        echo -e "${RED}✗ Nginx 启动失败${NC}"
        echo "请查看错误日志: ${LOGS_DIR}/error.log"
        exit 1
    fi
}

# 停止 Nginx
stop_nginx() {
    if [ ! -f "$PID_FILE" ]; then
        echo -e "${YELLOW}Nginx 未运行${NC}"
        exit 0
    fi

    PID=$(cat "$PID_FILE")
    echo -e "${GREEN}停止 Nginx (PID: $PID)...${NC}"

    if kill "$PID" 2>/dev/null; then
        # 等待进程停止
        for i in {1..10}; do
            if ! kill -0 "$PID" 2>/dev/null; then
                rm -f "$PID_FILE"
                echo -e "${GREEN}✓ Nginx 已停止${NC}"
                return 0
            fi
            sleep 1
        done

        # 如果仍在运行，强制停止
        echo -e "${YELLOW}强制停止 Nginx...${NC}"
        kill -9 "$PID" 2>/dev/null || true
        rm -f "$PID_FILE"
        echo -e "${GREEN}✓ Nginx 已强制停止${NC}"
    else
        rm -f "$PID_FILE"
        echo -e "${YELLOW}进程已不存在${NC}"
    fi
}

# 重启 Nginx
restart_nginx() {
    stop_nginx
    sleep 1
    start_nginx
}

# 重新加载配置
reload_nginx() {
    if [ ! -f "$PID_FILE" ]; then
        echo -e "${RED}错误: Nginx 未运行${NC}"
        exit 1
    fi

    PID=$(cat "$PID_FILE")
    echo -e "${GREEN}重新加载 Nginx 配置...${NC}"

    if kill -HUP "$PID" 2>/dev/null; then
        echo -e "${GREEN}✓ 配置已重新加载${NC}"
    else
        echo -e "${RED}✗ 重新加载失败${NC}"
        exit 1
    fi
}

# 查看状态
status_nginx() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if kill -0 "$PID" 2>/dev/null; then
            echo -e "${GREEN}Nginx 正在运行${NC}"
            echo "  PID: $PID"
            echo "  配置文件: ${NGINX_PREFIX}/conf/nginx-main.conf"
            echo "  日志目录: $LOGS_DIR"
            echo ""
            echo "最近的访问日志:"
            tail -5 "${LOGS_DIR}/platform_https_access.log" 2>/dev/null || echo "  (无日志)"
        else
            echo -e "${YELLOW}Nginx 未运行 (PID 文件存在但进程不存在)${NC}"
            rm -f "$PID_FILE"
        fi
    else
        echo -e "${YELLOW}Nginx 未运行${NC}"
    fi
}

# 查看日志
logs_nginx() {
    echo -e "${BLUE}实时查看 Nginx 日志 (Ctrl+C 退出)${NC}"
    echo ""
    tail -f "${LOGS_DIR}"/*.log
}

# 显示帮助
show_help() {
    cat << EOF
Conda Nginx 管理脚本

用法: bash $0 [命令]

命令:
  start        启动 Nginx
  stop         停止 Nginx
  restart      重启 Nginx
  reload       重新加载配置（不中断服务）
  status       查看 Nginx 状态
  logs         实时查看日志
  test         测试配置文件
  help         显示此帮助信息

示例:
  bash $0 start          # 启动 Nginx
  bash $0 stop           # 停止 Nginx
  bash $0 restart        # 重启 Nginx
  bash $0 reload         # 重新加载配置
  bash $0 status         # 查看状态
  bash $0 logs           # 查看日志

配置信息:
  Conda 环境: $ENV_NAME
  Nginx 路径: $NGINX_BIN
  配置文件: ${NGINX_PREFIX}/conf/nginx-main.conf
  日志目录: $LOGS_DIR
  PID 文件: $PID_FILE

EOF
}

# 主函数
main() {
    print_header "Conda Nginx 管理工具"

    check_nginx

    case "${1:-start}" in
        start)
            setup_directories
            generate_config
            check_certificates
            test_config
            start_nginx
            echo ""
            echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
            echo -e "${GREEN}Nginx 启动成功！${NC}"
            echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
            echo ""
            echo "访问地址: https://platform.largeModel.bobcfc.local"
            echo "日志文件: ${LOGS_DIR}/"
            echo ""
            echo "常用命令:"
            echo "  查看状态: bash $0 status"
            echo "  查看日志: bash $0 logs"
            echo "  重新加载: bash $0 reload"
            echo "  停止服务: bash $0 stop"
            echo ""
            ;;
        stop)
            stop_nginx
            ;;
        restart)
            restart_nginx
            ;;
        reload)
            setup_directories
            generate_config
            test_config
            reload_nginx
            ;;
        status)
            status_nginx
            ;;
        logs)
            logs_nginx
            ;;
        test)
            setup_directories
            generate_config
            test_config
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            echo -e "${RED}未知命令: $1${NC}"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# 运行主函数
main "$@"
