import { describe, expect, it } from 'vitest';
import {
  AdminStatsSchema,
  ChatRequestStatusSchema,
  CreateSpaceInputSchema,
  CreateThreadInputSchema,
  FlatCommentItemSchema,
  LoginInputSchema,
  ProblemDetailsSchema,
  RegisterInputSchema,
  ThreadListFilterSchema,
  VoteDirectionSchema,
  VoteInputSchema,
} from '../src/index.js';

describe('Đặc tả Khế ước Dữ liệu @acad/contracts', () => {
  describe('1. Xác thực & Đăng ký (Auth Contracts)', () => {
    it('Phải chấp nhận tài khoản đăng ký hợp lệ theo chuẩn ASVS', () => {
      const valid = {
        username: 'devops_engineer_99',
        email: 'engineer@acad.community',
        password: 'SecurePassword123!',
      };
      const result = RegisterInputSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('Phải từ chối mật khẩu không đủ độ phức tạp (thiếu số hoặc chữ hoa)', () => {
      const invalid = {
        username: 'alex_valid',
        email: 'alex@acad.community',
        password: 'passwordonly',
      };
      const result = RegisterInputSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors.some((e) => e.message.includes('chữ hoa'))).toBe(true);
      }
    });

    it('Phải từ chối username chứa ký tự đặc biệt không được phép', () => {
      const invalid = {
        username: 'alex@hacker#',
        email: 'alex@acad.community',
        password: 'SecurePassword123!',
      };
      const result = RegisterInputSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('Phải xác thực thành công payload đăng nhập với fingerprint', () => {
      const loginPayload = {
        identifier: 'devops_engineer_99',
        password: 'SecurePassword123!',
        fingerprint: 'fp_chrome_linux_x86_64',
      };
      const result = LoginInputSchema.safeParse(loginPayload);
      expect(result.success).toBe(true);
    });
  });

  describe('2. Không gian & Nhãn bài viết (Spaces & Flairs)', () => {
    it('Phải xác thực slug của Space theo quy tắc chữ thường và gạch ngang', () => {
      const validSpace = {
        slug: 'devops-cloud-native',
        name: 'DevOps & Cloud Native',
        description: 'Thảo luận hạ tầng kiến trúc vi dịch vụ',
      };
      const result = CreateSpaceInputSchema.safeParse(validSpace);
      expect(result.success).toBe(true);
    });

    it('Phải từ chối slug Space chứa chữ in hoa hoặc dấu cách', () => {
      const invalidSpace = {
        slug: 'DevOps Cloud',
        name: 'DevOps Cloud',
      };
      const result = CreateSpaceInputSchema.safeParse(invalidSpace);
      expect(result.success).toBe(false);
    });
  });

  describe('3. Bài viết & Cây bình luận ltree (Threads & Comments)', () => {
    it('Phải xác thực bộ lọc danh sách bài viết với giá trị mặc định hợp lý', () => {
      const filter = ThreadListFilterSchema.parse({});
      expect(filter.sort).toBe('hot');
      expect(filter.time).toBe('all');
      expect(filter.limit).toBe(20);
    });

    it('Phải từ chối bài viết có tiêu đề quá ngắn (< 5 ký tự)', () => {
      const shortThread = {
        spaceId: '11111111-1111-1111-1111-111111111111',
        title: 'Hi',
      };
      const result = CreateThreadInputSchema.safeParse(shortThread);
      expect(result.success).toBe(false);
    });

    it('Phải xác thực đường dẫn ltree Base36 4 ký tự cố định cho bình luận', () => {
      const validComment = {
        id: '22222222-2222-2222-2222-222222222222',
        threadId: '11111111-1111-1111-1111-111111111111',
        parentId: null,
        path: '0001.000a.0002',
        depth: 2,
        isCappedAtMaxDepth: false,
        parentAuthorMentionNeeded: false,
        contentAst: { type: 'doc', content: [] },
        author: {
          id: '33333333-3333-3333-3333-333333333333',
          username: 'commenter_1',
          karmaScore: 50,
        },
        netScore: 10,
        upvotes: 12,
        downvotes: 2,
        userVote: 1,
        directRepliesCount: 3,
        totalDescendantsCount: 5,
        isCollapsed: false,
        isDeleted: false,
        createdAt: new Date().toISOString(),
      };
      const result = FlatCommentItemSchema.safeParse(validComment);
      expect(result.success).toBe(true);
    });

    it('Phải từ chối đường dẫn ltree không tuân thủ Base36 4 ký tự', () => {
      const invalidComment = {
        id: '22222222-2222-2222-2222-222222222222',
        threadId: '11111111-1111-1111-1111-111111111111',
        parentId: null,
        path: '1.2.3', // Không đủ 4 ký tự mỗi node
        depth: 2,
        contentAst: {},
        author: {
          id: '33333333-3333-3333-3333-333333333333',
          username: 'commenter_1',
        },
        createdAt: new Date().toISOString(),
      };
      const result = FlatCommentItemSchema.safeParse(invalidComment);
      expect(result.success).toBe(false);
    });

    it('Phải hỗ trợ cờ Capped Depth 8 biến đổi Flat Reply', () => {
      const cappedComment = {
        id: '44444444-4444-4444-4444-444444444444',
        threadId: '11111111-1111-1111-1111-111111111111',
        parentId: '22222222-2222-2222-2222-222222222222',
        path: '0001.0001.0001.0001.0001.0001.0001.0001',
        depth: 8,
        isCappedAtMaxDepth: true,
        parentAuthorMentionNeeded: true,
        parentAuthorUsername: 'original_poster',
        contentAst: { type: 'doc' },
        author: {
          id: '33333333-3333-3333-3333-333333333333',
          username: 'deep_replier',
        },
        createdAt: new Date().toISOString(),
      };
      const result = FlatCommentItemSchema.safeParse(cappedComment);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isCappedAtMaxDepth).toBe(true);
        expect(result.data.parentAuthorMentionNeeded).toBe(true);
      }
    });
  });

  describe('4. Bầu chọn nguyên tử (Voting Contracts)', () => {
    it('Chỉ chấp nhận chiều vote là +1 hoặc -1', () => {
      expect(VoteDirectionSchema.safeParse(1).success).toBe(true);
      expect(VoteDirectionSchema.safeParse(-1).success).toBe(true);
      expect(VoteDirectionSchema.safeParse(0).success).toBe(false);
      expect(VoteDirectionSchema.safeParse(2).success).toBe(false);
    });

    it('Phải xác thực payload bỏ phiếu hợp lệ', () => {
      const votePayload = {
        targetId: '11111111-1111-1111-1111-111111111111',
        targetType: 'THREAD',
        direction: 1,
      };
      const result = VoteInputSchema.safeParse(votePayload);
      expect(result.success).toBe(true);
    });
  });

  describe('5. Tin nhắn tức thời (Reddit Chat Contracts)', () => {
    it('Phải hỗ trợ 4 trạng thái duyệt yêu cầu tin nhắn lạ', () => {
      expect(ChatRequestStatusSchema.safeParse('PENDING').success).toBe(true);
      expect(ChatRequestStatusSchema.safeParse('ACCEPTED').success).toBe(true);
      expect(ChatRequestStatusSchema.safeParse('IGNORED').success).toBe(true);
      expect(ChatRequestStatusSchema.safeParse('BLOCKED').success).toBe(true);
      expect(ChatRequestStatusSchema.safeParse('UNKNOWN').success).toBe(false);
    });
  });

  describe('6. Quản trị & Báo lỗi RFC 7807 (Admin & Errors)', () => {
    it('Phải xác thực phản hồi Problem Details RFC 7807', () => {
      const errorObj = {
        type: 'https://acad.community/errors/unauthorized',
        title: 'Xác thực không thành công',
        status: 401,
        detail: 'Access Token đã hết hạn',
        code: 'EXPIRED_ACCESS_TOKEN',
        instance: '/api/v1/threads',
      };
      const result = ProblemDetailsSchema.safeParse(errorObj);
      expect(result.success).toBe(true);
    });

    it('Phải xác thực số liệu thống kê thời gian thực của Admin Console', () => {
      const stats = {
        activeUsersCount: 1540,
        activeSessionsCount: 2200,
        spacesCount: 45,
        threadsCount: 8900,
        commentsCount: 34500,
        pendingReportsCount: 12,
      };
      const result = AdminStatsSchema.safeParse(stats);
      expect(result.success).toBe(true);
    });
  });
});
