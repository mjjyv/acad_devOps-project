/**
 * ==============================================================================
 * ANTI-SSRF GUARD - SERVER-SIDE REQUEST FORGERY SHIELD
 * Ngăn chặn kẻ tấn công lợi dụng máy chủ API để quét cổng nội bộ hoặc đánh cắp
 * Cloud Metadata (169.254.169.254), Localhost hoặc mạng nội bộ gia đình.
 * ==============================================================================
 */

// Danh sách các cổng dịch vụ nội bộ bị cấm tuyệt đối
const BLOCKED_INTERNAL_PORTS = new Set([
  21, // FTP
  22, // SSH
  23, // Telnet
  25, // SMTP
  53, // DNS
  8080, // Internal Proxy/Admin
  5432, // PostgreSQL
  6379, // Redis
  27017, // MongoDB
  2375, // Docker daemon unencrypted
  2376, // Docker daemon TLS
  10250, // Kubelet
  10255, // Kubelet read-only
]);

// Danh sách các hostname đặc biệt thuộc Cloud Metadata / Localhost
const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  'ip6-localhost',
  'ip6-loopback',
  'metadata.google.internal',
  'metadata.google.internal.',
  'instance-data',
]);

/**
 * Kiểm tra xem một địa chỉ IP (dạng chuỗi) có thuộc dải IP riêng tư / nguy hiểm không
 */
function isPrivateOrReservedIp(ip: string): boolean {
  // IPv6 Loopback hoặc Unspecified
  if (ip === '::1' || ip === '::' || ip.startsWith('fe80:') || ip.startsWith('fc00:')) {
    return true;
  }

  // Chuyển đổi IPv4 sang 4 octets
  const parts = ip.split('.').map((p) => parseInt(p, 10));
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) {
    return false;
  }

  const [a, b] = parts;
  if (a === undefined || b === undefined) {
    return false;
  }

  // 1. Loopback: 127.0.0.0/8
  if (a === 127) return true;

  // 2. Local Identification / 0.0.0.0/8
  if (a === 0) return true;

  // 3. RFC 1918 Private Class A: 10.0.0.0/8
  if (a === 10) return true;

  // 4. RFC 1918 Private Class B: 172.16.0.0/12 (172.16.x.x - 172.31.x.x)
  if (a === 172 && b >= 16 && b <= 31) return true;

  // 5. RFC 1918 Private Class C: 192.168.0.0/16
  if (a === 192 && b === 168) return true;

  // 6. Link-Local / Cloud Instance Metadata: 169.254.0.0/16 (chứa 169.254.169.254)
  if (a === 169 && b === 254) return true;

  // 7. Carrier-grade NAT: 100.64.0.0/10
  if (a === 100 && b >= 64 && b <= 127) return true;

  // 8. Multicast & Broadcast: 224.0.0.0/4 và 255.255.255.255
  if (a >= 224) return true;

  return false;
}

export interface SsrCheckResult {
  safe: boolean;
  reason?: string;
  normalizedUrl?: string;
}

export class SsrfGuard {
  /**
   * Kiểm tra tính an toàn của một URL người dùng cung cấp
   */
  public static isSafeUrl(rawUrl: string): SsrCheckResult {
    if (!rawUrl || typeof rawUrl !== 'string') {
      return { safe: false, reason: 'URL không hợp lệ hoặc để trống' };
    }

    let parsed: URL;
    try {
      parsed = new URL(rawUrl.trim());
    } catch {
      return { safe: false, reason: 'Định dạng URL không hợp lệ' };
    }

    // 1. Chỉ chấp nhận giao thức HTTP và HTTPS
    const protocol = parsed.protocol.toLowerCase();
    if (protocol !== 'http:' && protocol !== 'https:') {
      return {
        safe: false,
        reason: `Giao thức bị cấm: ${protocol}. Chỉ hỗ trợ http: và https:`,
      };
    }

    const hostname = parsed.hostname.toLowerCase();

    // 2. Chặn các hostname cấm (localhost, cloud metadata)
    if (BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith('.internal')) {
      return {
        safe: false,
        reason: `Truy cập tới tài nguyên nội bộ bị từ chối (${hostname})`,
      };
    }

    // 3. Chặn các dải IP nguy hiểm / riêng tư
    // Xóa dấu ngoặc vuông nếu là IPv6 (vd: [::1])
    const cleanHost = hostname.replace(/^\[|\]$/g, '');
    if (isPrivateOrReservedIp(cleanHost)) {
      return {
        safe: false,
        reason: `Địa chỉ IP mục tiêu nằm trong dải mạng riêng tư/bảo mật (${cleanHost})`,
      };
    }

    // 4. Chặn các cổng nguy hiểm
    if (parsed.port) {
      const portNum = parseInt(parsed.port, 10);
      if (BLOCKED_INTERNAL_PORTS.has(portNum)) {
        return {
          safe: false,
          reason: `Cổng kết nối bị cấm vì lý do an ninh hệ thống (${portNum})`,
        };
      }
    }

    return {
      safe: true,
      normalizedUrl: parsed.toString(),
    };
  }

  /**
   * Xác nhận tính an toàn, ném ra lỗi nếu vi phạm SSRF
   */
  public static assertSafeUrl(rawUrl: string): string {
    const result = SsrfGuard.isSafeUrl(rawUrl);
    if (!result.safe || !result.normalizedUrl) {
      const err = new Error(result.reason || 'URL không an toàn (Nguy cơ SSRF)');
      (err as unknown as { statusCode: number }).statusCode = 400;
      throw err;
    }
    return result.normalizedUrl;
  }
}
