#!/usr/bin/env bash
# ==============================================================================
# KỊCH BẢN KIỂM THỬ XÂM NHẬP & BẢO MẬT HỆ THỐNG - UNIVERSAL SECURITY SHIELD
# Tự động quét và kiểm thử:
# 1. Tiêu đề an ninh (Security Headers) & Ẩn nhận dạng máy chủ (X-Powered-By)
# 2. Cơ chế phòng thủ DoS & Brute-Force (Rate Limiting HTTP 429)
# 3. Chống tấn công XSS, Clickjacking, MIME Sniffing
# 4. Bảo vệ điểm cuối xác thực (Same-Origin & CORS)
# ==============================================================================
set -e

API_URL="${1:-http://127.0.0.1:10000}"
WEB_URL="${2:-http://127.0.0.1:3000}"

echo "========================================================================"
echo "🛡️  QUÉT VÀ KIỂM THỬ BẢO MẬT TOÀN DIỆN - SYNAPSE SECURITY SHIELD"
echo "API Endpoint: $API_URL"
echo "Web Endpoint: $WEB_URL"
echo "========================================================================"

FAILED=0

check_header() {
  local target="$1"
  local header_name="$2"
  local expected_substr="$3"
  local resp_headers
  resp_headers=$(curl -sI -m 4 "$target")

  if echo "$resp_headers" | grep -i "^${header_name}:" | grep -iq "$expected_substr"; then
    echo "  [PASS] $header_name: Có mặt và chứa '$expected_substr'"
  else
    echo "  [FAIL] $header_name: Thiếu hoặc không chứa '$expected_substr'"
    FAILED=$((FAILED + 1))
  fi
}

echo ""
echo "=== 1. Kiểm Tra Tiêu Đề An Ninh API Gateway ($API_URL/healthz) ==="
check_header "$API_URL/healthz" "X-Frame-Options" "DENY"
check_header "$API_URL/healthz" "X-Content-Type-Options" "nosniff"
check_header "$API_URL/healthz" "Strict-Transport-Security" "max-age="
check_header "$API_URL/healthz" "Referrer-Policy" "strict-origin-when-cross-origin"
check_header "$API_URL/healthz" "Permissions-Policy" "camera=()"
check_header "$API_URL/healthz" "Content-Security-Policy" "default-src 'self'"

# Kiểm tra X-Powered-By đã bị xóa hoàn toàn
if curl -sI "$API_URL/healthz" | grep -qi "^x-powered-by:"; then
  echo "  [FAIL] x-powered-by: Vẫn còn lộ diện trong HTTP Header!"
  FAILED=$((FAILED + 1))
else
  echo "  [PASS] x-powered-by: ĐÃ BỊ TRIỆT TIÊU HOÀN TOÀN (Ẩn thông tin công nghệ)"
fi

echo ""
echo "=== 2. Kiểm Tra Tiêu Đề An Ninh Next.js Web Client ($WEB_URL/) ==="
check_header "$WEB_URL/" "X-Frame-Options" "DENY"
check_header "$WEB_URL/" "X-Content-Type-Options" "nosniff"
check_header "$WEB_URL/" "Referrer-Policy" "strict-origin-when-cross-origin"
check_header "$WEB_URL/" "Permissions-Policy" "camera=()"

echo ""
echo "=== 3. Kiểm Thử Phòng Thủ Brute-force & DoS (Rate Limiting trên /auth/login) ==="
echo "Gửi 12 yêu cầu đăng nhập liên tiếp để kích hoạt bộ bẫy Rate Limit..."
RATE_LIMITED=0

for i in $(seq 1 12); do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -H "X-Forwarded-For: 203.0.113.195" \
    -d "{\"email\":\"security_probe_$i@acad.vn\",\"password\":\"wrong_pass\"}")
  
  if [ "$HTTP_CODE" = "429" ]; then
    RATE_LIMITED=$((RATE_LIMITED + 1))
  fi
done

if [ "$RATE_LIMITED" -gt 0 ]; then
  echo "  [PASS] Rate Limiter hoạt động chính xác! Nhận được $RATE_LIMITED lần HTTP 429 Too Many Requests."
  # Kiểm tra chi tiết phản hồi 429
  SAMPLE_429=$(curl -s -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -H "X-Forwarded-For: 203.0.113.195" \
    -d '{"email":"sample@acad.vn","password":"wrong"}')
  echo "  [INFO] Chi tiết RFC 7807: $SAMPLE_429"
else
  echo "  [FAIL] Không nhận được mã 429 sau 12 yêu cầu liên tiếp."
  FAILED=$((FAILED + 1))
fi

echo ""
echo "=== 4. Kiểm Thử Phản Hồi CORS Preflight ==="
OPTIONS_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS "$API_URL/auth/login" \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST")

if [ "$OPTIONS_CODE" = "204" ] || [ "$OPTIONS_CODE" = "200" ]; then
  echo "  [PASS] Preflight CORS OPTIONS phản hồi an toàn mã $OPTIONS_CODE (Không gây lỗi 500)."
else
  echo "  [FAIL] Preflight CORS phản hồi mã $OPTIONS_CODE."
  FAILED=$((FAILED + 1))
fi

echo ""
echo "========================================================================"
if [ "$FAILED" -eq 0 ]; then
  echo "🎉 TẤT CẢ CÁC BÀI KIỂM THỬ BẢO MẬT ĐỀU VƯỢT QUA XUẤT SẮC!"
  echo "Hệ thống Acad DevOps (SYNAPSE Engine) đã được gia cố toàn diện theo tiêu chuẩn Universal Security Shield."
  exit 0
else
  echo "⚠️ Có $FAILED lỗi an ninh chưa đạt tiêu chuẩn. Vui lòng rà soát lại."
  exit 1
fi
