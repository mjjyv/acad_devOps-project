#!/usr/bin/env bash
# ==============================================================================
# QUẢN TRỊ DỊCH VỤ SELF-HOSTED HOMELAB DEBIAN (ACAD FULLSTACK DEVOPS PLATFORM)
# Chạy 100% tài nguyên cục bộ: Podman Rootless (Postgres 16 + Redis 7) + Systemd User
# Lưu trữ dữ liệu: .data/postgres và .data/redis
# ==============================================================================
set -e

PROJECT_DIR="/home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project"
ACTION="${1:-status}"

start_containers() {
  echo "--- Khởi động Database & Cache Cục Bộ (Podman Rootless) ---"
  mkdir -p "$PROJECT_DIR/.data/postgres" "$PROJECT_DIR/.data/redis"

  if ! podman ps -a --format "{{.Names}}" | grep -q "^acad-postgres$"; then
    echo "Tạo container acad-postgres..."
    podman run -d --name acad-postgres \
      -e POSTGRES_USER=postgres \
      -e POSTGRES_PASSWORD=postgres \
      -e POSTGRES_DB=acad_dev \
      -p 5432:5432 \
      -v "$PROJECT_DIR/.data/postgres:/var/lib/postgresql/data:Z" \
      docker.io/library/postgres:16-alpine
  elif ! podman ps --format "{{.Names}}" | grep -q "^acad-postgres$"; then
    echo "Khởi động container acad-postgres..."
    podman start acad-postgres
  fi

  if ! podman ps -a --format "{{.Names}}" | grep -q "^acad-redis$"; then
    echo "Tạo container acad-redis..."
    podman run -d --name acad-redis \
      -p 6379:6379 \
      -v "$PROJECT_DIR/.data/redis:/data:Z" \
      docker.io/library/redis:7-alpine redis-server --appendonly yes
  elif ! podman ps --format "{{.Names}}" | grep -q "^acad-redis$"; then
    echo "Khởi động container acad-redis..."
    podman start acad-redis
  fi
}

case "$ACTION" in
  start)
    start_containers
    echo "--- Khởi chạy Backend API (:10000) & Next.js Web (:3000) qua Systemd ---"
    systemctl --user enable --now acad-api.service acad-web.service
    sleep 2
    systemctl --user status acad-api.service acad-web.service --no-pager
    ;;
  stop)
    echo "--- Dừng toàn bộ dịch vụ Acad Self-Hosted ---"
    systemctl --user stop acad-api.service acad-web.service
    podman stop acad-postgres acad-redis 2>/dev/null || true
    echo "Đã dừng hoàn toàn các dịch vụ."
    ;;
  restart)
    start_containers
    echo "--- Khởi động lại dịch vụ Acad Homelab ---"
    systemctl --user restart acad-api.service acad-web.service
    sleep 2
    systemctl --user status acad-api.service acad-web.service --no-pager
    ;;
  status)
    echo "=== 1. Trạng Thái Database & Redis (Podman Rootless) ==="
    podman ps --filter "name=acad-"
    echo ""
    echo "=== 2. Trạng Thái API Gateway & Web Client (Systemd User) ==="
    systemctl --user status acad-api.service acad-web.service --no-pager || true
    echo ""
    echo "=== 3. Trạng Thái Cloudflare Tunnel (cloudflared) ==="
    systemctl status cloudflared --no-pager 2>/dev/null | head -n 12 || true
    ;;
  logs-api)
    journalctl --user -u acad-api.service -f
    ;;
  logs-web)
    journalctl --user -u acad-web.service -f
    ;;
  test)
    echo "=== KIỂM TRA SỨC KHỎE HỆ THỐNG SELF-HOSTED ==="
    echo -n "1. PostgreSQL (Port 5432 - Storage .data/postgres): "
    podman exec acad-postgres pg_isready -U postgres -d acad_dev >/dev/null 2>&1 && echo "READY (OK)" || echo "DOWN"
    
    echo -n "2. Redis Engine (Port 6379 - Storage .data/redis): "
    [ "$(podman exec acad-redis redis-cli ping 2>/dev/null)" = "PONG" ] && echo "PONG (OK)" || echo "DOWN"

    echo -n "3. API Gateway (http://127.0.0.1:10000/healthz): "
    HEALTH_RESP=$(curl -s -m 3 http://127.0.0.1:10000/healthz || echo "")
    if echo "$HEALTH_RESP" | grep -q '"status":"ok"'; then
      echo "200 OK ($HEALTH_RESP)"
    else
      echo "DEGRADED/DOWN ($HEALTH_RESP)"
    fi

    echo -n "4. Next.js Web Client (http://127.0.0.1:3000/): "
    WEB_CODE=$(curl -s -m 3 -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/ || echo "000")
    if [ "$WEB_CODE" = "200" ]; then
      echo "200 OK (Sẵn sàng phục vụ giao diện)"
    else
      echo "HTTP $WEB_CODE"
    fi
    ;;
  verify-domain)
    DOMAIN="${2:-}"
    if [ -z "$DOMAIN" ]; then
      echo "Lỗi: Vui lòng cung cấp tên miền."
      echo "Ví dụ: $0 verify-domain example.com"
      exit 1
    fi
    echo "=== KIỂM TRA ĐIỀU HƯỚNG TÊN MIỀN TOÀN CẦU CHO: $DOMAIN ==="
    echo "1. Kiểm tra Frontend (https://$DOMAIN/):"
    FRONTEND_STATUS=$(curl -s -m 6 -o /dev/null -w "%{http_code}" "https://$DOMAIN/" || echo "FAILED")
    echo "   -> HTTP Status: $FRONTEND_STATUS"

    echo "2. Kiểm tra Healthz qua Frontend Rewrite (https://$DOMAIN/healthz):"
    HEALTH_FRONT=$(curl -s -m 6 "https://$DOMAIN/healthz" || echo "FAILED")
    echo "   -> Response: $HEALTH_FRONT"

    echo "3. Kiểm tra Subdomain API trực tiếp (https://api.$DOMAIN/healthz):"
    HEALTH_API=$(curl -s -m 6 "https://api.$DOMAIN/healthz" || echo "FAILED")
    echo "   -> Response: $HEALTH_API"

    echo "4. Kiểm tra Auth Proxy Login (POST https://$DOMAIN/auth/login):"
    AUTH_RESP=$(curl -s -m 6 -X POST "https://$DOMAIN/auth/login" \
      -H "Content-Type: application/json" \
      -d '{"email":"probe_test@acad.dev","password":"wrong"}' || echo "FAILED")
    echo "   -> Auth Endpoint: $AUTH_RESP"

    echo ""
    if echo "$FRONTEND_STATUS" | grep -q "200"; then
      echo "✅ Tên miền $DOMAIN đã kết nối thành công và đang hoạt động tốt!"
    else
      echo "⚠️ Tên miền chưa phản hồi 200 OK. Vui lòng kiểm tra lại cấu hình Public Hostnames trên Cloudflare Tunnel."
    fi
    ;;
  *)
    echo "Cách dùng: $0 {start|stop|restart|status|logs-api|logs-web|test|verify-domain <domain>}"
    exit 1
    ;;
esac
