#!/usr/bin/env bash
# ============================================================================
# ACAD DEVOPS PLATFORM - SUPABASE MIGRATION RUNNER
# File: deploy/scripts/migrate-supabase.sh
# Mục đích: Thực thi nạp CSDL và Seed Data lên Supabase an toàn trên Debian 13
# ============================================================================

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SQL_FILE="$PROJECT_ROOT/deploy/migrations/supabase_bootstrap.sql"

echo "=================================================================="
echo "    ACAD COMMUNITY PLATFORM - SUPABASE MIGRATION & SEED RUNNER   "
echo "=================================================================="
echo "OS Target: $(uname -s) $(uname -r) ($(uname -m))"
echo "Thời điểm: $(date)"
echo ""

# 1. Kiểm tra công cụ psql
if ! command -v psql &> /dev/null; then
  echo "[-] Lỗi: Chưa tìm thấy công cụ 'psql' trên hệ thống Debian 13."
  echo "    Vui lòng cài đặt bằng lệnh:"
  echo "    sudo apt update && sudo apt install -y postgresql-client"
  exit 1
fi
echo "[+] psql đã sẵn sàng: $(psql --version)"

# 2. Kiểm tra file SQL bootstrap
if [ ! -f "$SQL_FILE" ]; then
  echo "[-] Lỗi: Không tìm thấy file SQL bootstrap tại: $SQL_FILE"
  exit 1
fi
echo "[+] Đã nhận diện file SQL bootstrap: $SQL_FILE ($(wc -l < "$SQL_FILE") dòng)"

# 3. Lấy chuỗi kết nối DATABASE_URL
TARGET_URL="${DATABASE_URL:-}"

if [ -z "$TARGET_URL" ]; then
  echo ""
  echo "(!) Biến môi trường DATABASE_URL chưa được thiết lập."
  echo "    Vui lòng dán chuỗi kết nối Supabase Pooler IPv4 của bạn"
  echo "    Ví dụ: postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require"
  echo ""
  read -r -s -p "Nhập DATABASE_URL (ký tự sẽ được ẩn để bảo mật): " TARGET_URL
  echo ""
fi

if [ -z "$TARGET_URL" ]; then
  echo "[-] Lỗi: Chuỗi kết nối trống. Dừng tiến trình."
  exit 1
fi

# 4. Kiểm tra và cảnh báo nếu dùng host Direct db.xxxx.supabase.co (nguy cơ lỗi IPv6)
if [[ "$TARGET_URL" == *"db."*".supabase.co"* ]]; then
  echo ""
  echo "[!] CẢNH BÁO: Bạn đang sử dụng host Direct (db.xxxx.supabase.co)."
  echo "    Host này thường phân giải qua IPv6 và có thể gây lỗi timeout/ENOTFOUND"
  echo "    trên các container đám mây hoặc mạng chỉ có IPv4."
  echo "    Khuyến nghị sử dụng Pooler IPv4: aws-0-ap-southeast-1.pooler.supabase.com:6543"
  echo ""
fi

# 5. Thực thi di chuyển dữ liệu
echo ""
echo "[*] Đang kết nối tới Supabase và thực thi migrations..."
echo "------------------------------------------------------------------"

psql "$TARGET_URL" -v ON_ERROR_STOP=1 -f "$SQL_FILE"

echo "------------------------------------------------------------------"
echo "[+] MIGRATION VÀ BÀN GIAO DỮ LIỆU SUPABASE HOÀN TẤT THÀNH CÔNG!"
echo ""
echo "Các tài khoản mẫu đã sẵn sàng để đăng nhập:"
echo "  1. Quản trị viên (ADMIN): admin@acad.internal        / Admin@Acad2026!"
echo "  2. Kiểm duyệt viên (MOD): moderator@acad.internal    / Mod@Acad2026!"
echo "  3. Kỹ sư DevOps (USER):   devops_lead@acad.internal  / Dev@Acad2026!"
echo ""
echo "Bước tiếp theo: Cập nhật DATABASE_URL trên Render Web Service (acad-core-api)"
echo "=================================================================="
