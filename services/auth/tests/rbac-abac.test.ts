import { describe, expect, it } from 'vitest';
import { ABACResource, ABACSubject } from '@acad/contracts';
import { PolicyEngine } from '../src/policy/rbac-abac-engine.js';

describe('4. Kiểm thử Động cơ Phân quyền Toàn diện (RBAC + ABAC Policy Engine)', () => {
  const guestUser: ABACSubject = {
    userId: '00000000-0000-0000-0000-000000000000',
    role: 'GUEST',
    accountAgeDays: 0,
    karmaScore: 0,
  };

  const newMember: ABACSubject = {
    userId: '11111111-1111-1111-1111-111111111111',
    role: 'USER',
    accountAgeDays: 3, // < 7 ngày
    karmaScore: 20,
  };

  const trustedMember: ABACSubject = {
    userId: '22222222-2222-2222-2222-222222222222',
    role: 'USER',
    accountAgeDays: 45,
    karmaScore: 650, // >= 500
  };

  const spaceMod: ABACSubject = {
    userId: '33333333-3333-3333-3333-333333333333',
    role: 'SPACE_MOD',
    accountAgeDays: 120,
    karmaScore: 1200,
    spaceRoles: {
      'space-devops-guidelines': 'SPACE_MOD',
    },
  };

  const superAdmin: ABACSubject = {
    userId: '99999999-9999-9999-9999-999999999999',
    role: 'ADMIN',
    accountAgeDays: 365,
    karmaScore: 9999,
  };

  it('GUEST: Chỉ được đọc bài viết công khai, bị chặn toàn bộ các thao tác ghi dữ liệu', () => {
    expect(PolicyEngine.evaluate(guestUser, 'post:read').allowed).toBe(true);
    expect(PolicyEngine.evaluate(guestUser, 'post:create').allowed).toBe(false);
    expect(PolicyEngine.evaluate(guestUser, 'comment:create').allowed).toBe(false);
    expect(PolicyEngine.evaluate(guestUser, 'vote:up').allowed).toBe(false);
  });

  it('Rào cản Karma Downvote: Thành viên < 500 Karma bị chặn, >= 500 Karma được mở khóa', () => {
    const resNew = PolicyEngine.evaluate(newMember, 'vote:down');
    expect(resNew.allowed).toBe(false);
    expect(resNew.code).toBe('INSUFFICIENT_KARMA');

    const resTrusted = PolicyEngine.evaluate(trustedMember, 'vote:down');
    expect(resTrusted.allowed).toBe(true);
  });

  it('Rào cản Thành viên Mới (< 7 ngày): Áp dụng hạn ngạch 2 bài viết/ngày', () => {
    const res = PolicyEngine.evaluate(newMember, 'post:create');
    expect(res.allowed).toBe(true);
    expect(res.reason).toContain('Tài khoản dưới 7 ngày tuổi');
  });

  it('Điều kiện lập Space mới: Yêu cầu thâm niên >= 30 ngày và Karma >= 500', () => {
    // newMember: 3 ngày, 20 Karma -> Chặn
    expect(PolicyEngine.evaluate(newMember, 'space:create').allowed).toBe(false);

    // trustedMember: 45 ngày, 650 Karma -> Cho phép
    expect(PolicyEngine.evaluate(trustedMember, 'space:create').allowed).toBe(true);
  });

  it('Quyền Tác giả & Khóa sửa bài sau 24h: Tác giả được sửa trong 24h, bị khóa sau 24h', () => {
    const postUnder24h: ABACResource = {
      type: 'POST',
      id: 'post-recent-uuid',
      authorId: trustedMember.userId,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // Mới đăng 2 tiếng trước
    };

    const postOver24h: ABACResource = {
      type: 'POST',
      id: 'post-old-uuid',
      authorId: trustedMember.userId,
      createdAt: new Date(Date.now() - 36 * 60 * 60 * 1000), // Đã đăng 36 tiếng trước
    };

    // Đúng tác giả trong 24h -> Cho phép
    expect(PolicyEngine.evaluate(trustedMember, 'post:edit', postUnder24h).allowed).toBe(true);

    // Đúng tác giả nhưng quá 24h -> Chặn với mã EDIT_WINDOW_EXPIRED
    const expiredRes = PolicyEngine.evaluate(trustedMember, 'post:edit', postOver24h);
    expect(expiredRes.allowed).toBe(false);
    expect(expiredRes.code).toBe('EDIT_WINDOW_EXPIRED');

    // Không phải tác giả -> Chặn với mã NOT_RESOURCE_OWNER
    const notOwnerRes = PolicyEngine.evaluate(newMember, 'post:edit', postUnder24h);
    expect(notOwnerRes.allowed).toBe(false);
    expect(notOwnerRes.code).toBe('NOT_RESOURCE_OWNER');
  });

  it('Ranh giới Quản trị Space (Space Boundary): Space Mod chỉ có quyền trong Space sở tại', () => {
    const targetInSpace: ABACResource = {
      type: 'POST',
      id: 'post-1',
      spaceId: 'space-devops-guidelines',
    };

    const targetOutsideSpace: ABACResource = {
      type: 'POST',
      id: 'post-2',
      spaceId: 'space-general-chat',
    };

    expect(PolicyEngine.evaluate(spaceMod, 'post:pin', targetInSpace).allowed).toBe(true);
    expect(PolicyEngine.evaluate(spaceMod, 'post:pin', targetOutsideSpace).allowed).toBe(false);
  });

  it('Super Admin: Toàn quyền vượt qua mọi rào cản ABAC', () => {
    const postOver24h: ABACResource = {
      type: 'POST',
      id: 'post-old-uuid',
      authorId: 'some-other-user',
      createdAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000),
    };

    expect(PolicyEngine.evaluate(superAdmin, 'post:edit', postOver24h).allowed).toBe(true);
    expect(PolicyEngine.evaluate(superAdmin, 'system:view_logs').allowed).toBe(true);
  });
});
