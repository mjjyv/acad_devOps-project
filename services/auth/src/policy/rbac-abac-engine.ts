import {
  ABACDecision,
  ABACResource,
  ABACSubject,
  ActionType,
} from '@acad/contracts';

export class PolicyEngine {
  /**
   * Đánh giá ma trận phân quyền kép: RBAC (Vai trò) kết hợp ABAC (Thuộc tính động)
   */
  public static evaluate(
    subject: ABACSubject,
    action: ActionType,
    resource?: ABACResource,
  ): ABACDecision {
    // =========================================================================
    // NGUYÊN TẮC 1: ADMIN TOÀN QUYỀN HỆ THỐNG
    // =========================================================================
    if (subject.role === 'ADMIN') {
      return { allowed: true };
    }

    // =========================================================================
    // NGUYÊN TẮC 2: KHÁCH VÃNG LAI (GUEST)
    // Chỉ được phép đọc nội dung công khai
    // =========================================================================
    if (subject.role === 'GUEST') {
      if (action === 'post:read') {
        return { allowed: true };
      }
      return {
        allowed: false,
        code: 'INSUFFICIENT_ROLE',
        reason: 'Hành động yêu cầu đăng nhập tài khoản',
      };
    }

    // =========================================================================
    // NGUYÊN TẮC 3: KIỂM SOÁT TƯƠNG TÁC BẦU CHỌN TRỪ (DOWNVOTE)
    // Rào cản Karma >= 500 để chống lạm dụng dìm bài viết
    // =========================================================================
    if (action === 'vote:down') {
      if (subject.karmaScore < 500) {
        return {
          allowed: false,
          code: 'INSUFFICIENT_KARMA',
          reason: 'Yêu cầu đạt tối thiểu 500 điểm Karma để mở khóa tính năng Downvote',
        };
      }
      return { allowed: true };
    }

    if (action === 'vote:up' || action === 'report:create') {
      return { allowed: true };
    }

    // =========================================================================
    // NGUYÊN TẮC 4: RÀO CẢN THÀNH VIÊN MỚI (NEWBIE SLOW-DOWN BARRIER < 7 NGÀY)
    // =========================================================================
    if (action === 'post:create') {
      if (subject.accountAgeDays < 7) {
        // Thuộc diện kiểm soát bài viết mới
        return {
          allowed: true,
          reason: 'Tài khoản dưới 7 ngày tuổi: Áp dụng giới hạn tối đa 2 bài viết/ngày',
        };
      }
      return { allowed: true };
    }

    if (action === 'comment:create' || action === 'comment:reply') {
      if (subject.isMutedInSpace) {
        return {
          allowed: false,
          code: 'MUTED',
          reason: 'Tài khoản đang bị tạm khóa phát ngôn (Muted) trong Không gian này',
        };
      }
      return { allowed: true };
    }

    if (action === 'comment:attach_media') {
      // Đính kèm ảnh trong comment yêu cầu tài khoản >= 7 ngày hoặc Karma >= 50
      if (subject.accountAgeDays < 7 && subject.karmaScore < 50) {
        return {
          allowed: false,
          code: 'ACCOUNT_TOO_NEW',
          reason: 'Tài khoản mới cần đạt tối thiểu 50 Karma để đính kèm tệp đa phương tiện',
        };
      }
      return { allowed: true };
    }

    // =========================================================================
    // NGUYÊN TẮC 5: QUYỀN TÁC GIẢ & KHÓA CHỈNH SỬA SAU 24 GIỜ
    // =========================================================================
    if (action === 'post:edit') {
      if (!resource) {
        return { allowed: false, code: 'NOT_RESOURCE_OWNER', reason: 'Không tìm thấy tài nguyên' };
      }

      if (resource.authorId !== subject.userId) {
        // Cho phép Moderator sửa nếu thuộc quyền quản lý Space
        if (this.isSpaceModerator(subject, resource.spaceId)) {
          return { allowed: true };
        }
        return {
          allowed: false,
          code: 'NOT_RESOURCE_OWNER',
          reason: 'Bạn chỉ có quyền chỉnh sửa bài viết do chính mình tạo ra',
        };
      }

      // Kiểm tra cửa sổ 24 giờ
      if (resource.createdAt) {
        const ageHours = (Date.now() - resource.createdAt.getTime()) / (1000 * 60 * 60);
        if (ageHours > 24) {
          return {
            allowed: false,
            code: 'EDIT_WINDOW_EXPIRED',
            reason: 'Bài viết đã bị khóa cứng nội dung (quá 24 giờ kể từ thời điểm đăng tải)',
          };
        }
      }

      return { allowed: true };
    }

    if (action === 'post:delete') {
      if (!resource) {
        return { allowed: false, code: 'NOT_RESOURCE_OWNER', reason: 'Không tìm thấy tài nguyên' };
      }
      if (resource.authorId === subject.userId || this.isSpaceModerator(subject, resource.spaceId)) {
        return { allowed: true };
      }
      return {
        allowed: false,
        code: 'NOT_RESOURCE_OWNER',
        reason: 'Không có quyền xóa bài viết của người khác',
      };
    }

    // =========================================================================
    // NGUYÊN TẮC 6: ĐIỀU KIỆN TẠO KHÔNG GIAN THẢO LUẬN MỚI (SPACE CREATION)
    // =========================================================================
    if (action === 'space:create') {
      if (subject.accountAgeDays < 30 || subject.karmaScore < 500) {
        return {
          allowed: false,
          code: 'INSUFFICIENT_KARMA',
          reason: 'Yêu cầu tài khoản có thâm niên tối thiểu 30 ngày và đạt từ 500 điểm Karma để lập Không gian mới',
        };
      }
      return { allowed: true };
    }

    // =========================================================================
    // NGUYÊN TẮC 7: RANH GIỚI KHÔNG GIAN (SPACE MODERATION BOUNDARY)
    // =========================================================================
    if (
      action === 'mod:view_queue' ||
      action === 'post:pin' ||
      action === 'post:lock' ||
      action === 'mod:mute_user' ||
      action === 'space:edit_rules'
    ) {
      if (subject.role === 'GLOBAL_MOD') {
        return { allowed: true };
      }
      if (this.isSpaceModerator(subject, resource?.spaceId)) {
        return { allowed: true };
      }
      return {
        allowed: false,
        code: 'OUTSIDE_SPACE_BOUNDARY',
        reason: 'Hành động yêu cầu quyền Điều hành viên (Moderator) của Không gian này',
      };
    }

    // =========================================================================
    // NGUYÊN TẮC 8: CÁC QUYỀN TOÀN CỤC CẤP CAO
    // =========================================================================
    if (action === 'mod:shadowban' || action === 'mod:ban_user') {
      if (subject.role === 'GLOBAL_MOD') {
        return { allowed: true };
      }
      return {
        allowed: false,
        code: 'INSUFFICIENT_ROLE',
        reason: 'Yêu cầu quyền Global Moderator hoặc Super Admin',
      };
    }

    if (action === 'system:view_logs' || action === 'system:maintenance') {
      return {
        allowed: false,
        code: 'INSUFFICIENT_ROLE',
        reason: 'Yêu cầu quyền Quản trị viên Tối cao (Super Admin)',
      };
    }

    return { allowed: false, code: 'INSUFFICIENT_ROLE', reason: 'Không có quyền thực hiện hành động này' };
  }

  private static isSpaceModerator(subject: ABACSubject, spaceId?: string): boolean {
    if (!spaceId || !subject.spaceRoles) return false;
    const roleInSpace = subject.spaceRoles[spaceId];
    return roleInSpace === 'SPACE_MOD' || roleInSpace === 'ADMIN';
  }
}
