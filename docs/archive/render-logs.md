acad-core-api

#30 exporting to image
#30 pushing layers 4.3s done
#30 DONE 8.4s

#31 exporting cache to registry
#31 sending cache export 5.5s done
#31 DONE 5.6s
==> Deploying...
==> Setting WEB_CONCURRENCY=1 by default, based on available CPUs in the instance
[ioredis] Unhandled error event: MaxRetriesPerRequestError: Reached the max retries per request limit (which is 3). Refer to "maxRetriesPerRequest" option for details.
    at Socket.<anonymous> (/app/node_modules/.pnpm/ioredis@5.11.1/node_modules/ioredis/built/redis/event_handler.js:207:37)
    at Object.onceWrapper (node:events:634:26)
    at Socket.emit (node:events:519:28)
    at TCP.<anonymous> (node:net:347:12)
[ioredis] Unhandled error event: Error: read ECONNRESET
    at TCP.onStreamRead (node:internal/stream_base_commons:216:20)
[ioredis] Unhandled error event: Error: read ECONNRESET
    at TCP.onStreamRead (node:internal/stream_base_commons:216:20)
[ioredis] Unhandled error event: MaxRetriesPerRequestError: Reached the max retries per request limit (which is 3). Refer to "maxRetriesPerRequest" option for details.
    at Socket.<anonymous> (/app/node_modules/.pnpm/ioredis@5.11.1/node_modules/ioredis/built/redis/event_handler.js:207:37)
    at Object.onceWrapper (node:events:634:26)
    at Socket.emit (node:events:519:28)
    at TCP.<anonymous> (node:net:347:12)
[VOTE FLUSH WORKER ERROR]: MaxRetriesPerRequestError: Reached the max retries per request limit (which is 3). Refer to "maxRetriesPerRequest" option for details.
    at Socket.<anonymous> (/app/node_modules/.pnpm/ioredis@5.11.1/node_modules/ioredis/built/redis/event_handler.js:207:37)
    at Object.onceWrapper (node:events:634:26)
    at Socket.emit (node:events:519:28)
    at TCP.<anonymous> (node:net:347:12)
[ioredis] Unhandled error event: Error: read ECONNRESET
    at TCP.onStreamRead (node:internal/stream_base_commons:216:20)
[ioredis] Unhandled error event: MaxRetriesPerRequestError: Reached the max retries per request limit (which is 3). Refer to "maxRetriesPerRequest" option for details.
    at Socket.<anonymous> (/app/node_modules/.pnpm/ioredis@5.11.1/node_modules/ioredis/built/redis/event_handler.js:207:37)
    at Object.onceWrapper (node:events:634:26)
    at Socket.emit (node:events:519:28)
    at TCP.<anonymous> (node:net:347:12)
[ioredis] Unhandled error event: Error: read ECONNRESET
    at TCP.onStreamRead (node:internal/stream_base_commons:216:20)
[ioredis] Unhandled error event: MaxRetriesPerRequestError: Reached the max retries per request limit (which is 3). Refer to "maxRetriesPerRequest" option for details.
    at Socket.<anonymous> (/app/node_modules/.pnpm/ioredis@5.11.1/node_modules/ioredis/built/redis/event_handler.js:207:37)
    at Object.onceWrapper (node:events:634:26)
    at Socket.emit (node:events:519:28)
    at TCP.<anonymous> (node:net:347:12)
[VOTE FLUSH WORKER ERROR]: MaxRetriesPerRequestError: Reached the max retries per request limit (which is 3). Refer to "maxRetriesPerRequest" option for details.
    at Socket.<anonymous> (/app/node_modules/.pnpm/ioredis@5.11.1/node_modules/ioredis/built/redis/event_handler.js:207:37)
    at Object.onceWrapper (node:events:634:26)


---

# BIÊN BẢN KHẮC PHỤC SỰ CỐ REDIS & ĐIỀU HƯỚNG CỔNG RENDER (INCIDENT REPORT #002)

> **Mã sự cố:** `INCIDENT-RENDER-REDIS-PORT-002`  
> **Thời điểm xử lý:** 2026-11-06T06:24:00+07:00  
> **Dịch vụ:** `acad-core-api`  
> **Trạng thái:** ✅ **Đã khắc phục hoàn toàn**

---

## 1. NGUYÊN NHÂN SỰ CỐ
1. **Lỗi `[ioredis] Unhandled error event: Error: read ECONNRESET` & `MaxRetriesPerRequestError`:**
   - Client Redis toàn cục trong `apps/api/src/server.ts` chưa đăng ký bộ lắng nghe sự kiện lỗi `redis.on('error', ...)`. Khi xảy ra gián đoạn mạng hoặc kết nối tới Upstash Redis qua giao thức không TLS (`redis://`), ioredis phát ra sự kiện lỗi không được bắt, làm tràn log tiến trình.
   - Khi `maxRetriesPerRequest` đặt là 3, tiến trình nền `VoteFlushWorker` cố gắng xả dữ liệu dồn nhưng gặp rớt mạng dẫn tới văng `MaxRetriesPerRequestError`.
2. **Endpoint gốc `/` chưa có bộ điều hướng (Route Handler):**
   - API Gateway chỉ có endpoint `/healthz`, thiếu route phản hồi cho root path `/`.

---

## 2. GIẢI PHÁP ĐÃ TRIỂN KHAI
1. **Cấu hình Redis An Toàn & Khả Năng Tự Phục Hồi:**
   - Tự động nhận diện chuỗi kết nối Upstash Redis và nâng cấp giao thức lên `rediss://` (TLS bắt buộc).
   - Đặt `maxRetriesPerRequest: null`, bổ sung `retryStrategy` và `reconnectOnError` với các lỗi mạng phổ biến (`ECONNRESET`, `ETIMEDOUT`).
   - Đăng ký `redis.on('error', ...)` để bắt toàn bộ sự kiện lỗi kết nối và tự động thử lại, triệt tiêu `Unhandled error event`.
2. **Khả Năng Chịu Lỗi Tại `VoteFlushWorker` & `RedisVoteEngine`:**
   - Trong `RedisVoteEngine.getDirtyTargetIds()`, bọc try/catch trả về `[]` khi Redis tạm thời ngắt kết nối để không làm treo hay lỗi tiến trình chạy nền.
   - Giảm mức độ log trong worker từ `console.error` xuống `console.warn` (`[VOTE FLUSH WORKER DEFERRED]`).
3. **Bổ sung Route `GET /` cho API Gateway:**
   - Phản hồi JSON metadata (tên dịch vụ, phiên bản 2.0.0, liên kết `/healthz` và tài liệu).
