import pg from 'pg';
import {
  Space,
  CreateSpaceInput,
  SpaceMembership,
  ThreadSummary,
  ThreadDetail,
  CreateThreadInput,
  FlatCommentItem,
  ContentAST,
  VoteDirection,
} from '@acad/contracts';
import { LtreePathGenerator } from '../comments/ltree-path-generator.js';
import { GravityDecayEngine } from '../voting/gravity-decay.js';
import { AtomicVoteEngine } from '../voting/lua-vote-engine.js';

const { Pool } = pg;

export interface ThreadListFilter {
  spaceSlug?: string;
  sort?: 'hot' | 'new' | 'top';
  limit?: number;
  cursor?: string;
  userId?: string;
}

export interface ThreadListResult {
  items: ThreadSummary[];
  nextCursor: string | null;
}

export interface ICommunityRepository {
  listSpaces(): Promise<Space[]>;
  getSpaceBySlug(slug: string): Promise<Space | null>;
  getSpaceById(id: string): Promise<Space | null>;
  createSpace(input: CreateSpaceInput, creatorId?: string | null): Promise<Space>;
  joinSpace(spaceId: string, userId: string): Promise<SpaceMembership>;
  leaveSpace(spaceId: string, userId: string): Promise<boolean>;

  listThreads(filter: ThreadListFilter): Promise<ThreadListResult>;
  getThreadBySlug(slug: string, userId?: string): Promise<ThreadDetail | null>;
  getThreadById(id: string, userId?: string): Promise<ThreadDetail | null>;
  createThread(
    input: CreateThreadInput,
    authorId: string,
    authorUsername: string,
    authorAvatarUrl?: string | null,
  ): Promise<ThreadDetail>;
  deleteThread(id: string, requesterId: string, isAdminOrMod: boolean): Promise<boolean>;

  listComments(threadId: string, userId?: string): Promise<FlatCommentItem[]>;
  createComment(input: {
    threadId: string;
    parentId?: string | null;
    contentAst: ContentAST;
    authorId: string;
    authorUsername: string;
    authorAvatarUrl?: string | null;
    karmaScore?: number;
  }): Promise<FlatCommentItem>;
  deleteComment(id: string, requesterId: string, isAdminOrMod: boolean): Promise<boolean>;

  voteThread(
    threadId: string,
    userId: string,
    direction: 1 | -1,
  ): Promise<{ upvotes: number; downvotes: number; netScore: number; userVote: 1 | -1 | null }>;
  voteComment(
    commentId: string,
    userId: string,
    direction: 1 | -1,
  ): Promise<{ upvotes: number; downvotes: number; netScore: number; userVote: 1 | -1 | null }>;

  getHealthStatus(): {
    type: 'postgres' | 'in_memory_fallback';
    isFallback: boolean;
    target?: string;
  };
}

// ============================================================================
// TIỆN ÍCH HỖ TRỢ XỬ LÝ CHUỖI & TIPTAP AST
// ============================================================================

export function slugify(text: string): string {
  let str = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  str = str.replace(/[đĐ]/g, 'd');
  str = str.toLowerCase();
  str = str.replace(/[^a-z0-9\s-]/g, '');
  str = str.trim().replace(/[\s-]+/g, '-');
  return str.slice(0, 80);
}

export function extractSnippetFromAst(contentAst: ContentAST, maxLength: number = 200): string {
  let text = '';
  function walk(node: any) {
    if (!node) return;
    if (typeof node.text === 'string') {
      text += node.text + ' ';
    }
    if (Array.isArray(node.content)) {
      for (const child of node.content) {
        walk(child);
        if (text.length >= maxLength) break;
      }
    }
  }
  walk(contentAst);
  text = text.trim();
  if (text.length > maxLength) {
    return text.slice(0, maxLength) + '...';
  }
  return text || 'Nội dung bài viết thảo luận...';
}

// ============================================================================
// IN-MEMORY COMMUNITY REPOSITORY (RESILIENT ZERO-DOWNTIME FALLBACK)
// ============================================================================

export class InMemoryCommunityRepository implements ICommunityRepository {
  private spaces = new Map<string, Space>();
  private spaceMemberships = new Map<string, SpaceMembership>(); // "userId:spaceId" -> membership
  private threads = new Map<string, ThreadDetail>();
  private comments = new Map<string, FlatCommentItem>();
  private voteEngine = new AtomicVoteEngine();

  constructor() {
    this.seedInitialData();
  }

  public getHealthStatus(): {
    type: 'postgres' | 'in_memory_fallback';
    isFallback: boolean;
    target?: string;
  } {
    return {
      type: 'in_memory_fallback',
      isFallback: true,
      target: 'ram_store',
    };
  }

  private seedInitialData(): void {
    const space1Id = '22222222-2222-2222-2222-222222222221';
    const space2Id = '22222222-2222-2222-2222-222222222222';
    const space3Id = '22222222-2222-2222-2222-222222222223';

    const defaultSpaces: Space[] = [
      {
        id: space1Id,
        slug: 'devops-engineering',
        name: 'DevOps & SRE Engineering',
        description: 'Không gian chuyên sâu về CI/CD, Kubernetes, Terraform, ArgoCD và Hạ tầng đám mây.',
        rules: [
          { id: '11111111-0000-0000-0000-000000000001', title: 'Tôn trọng thành viên', description: 'Giao tiếp văn minh, xây dựng.' },
          { id: '11111111-0000-0000-0000-000000000002', title: 'Không lộ mã bí mật', description: 'Tuyệt đối không dán API Key, Private Key lên bài viết.' },
        ],
        bannerUrl: null,
        avatarUrl: null,
        creatorId: '11111111-1111-1111-1111-111111111111',
        isPrivate: false,
        memberCount: 128,
        threadCount: 15,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: space2Id,
        slug: 'security-devsecops',
        name: 'DevSecOps & Zero-Trust',
        description: 'An ninh mạng, kiểm toán bảo mật, quản lý danh tính, mã hóa Scrypt KDF và Token Rotation.',
        rules: [
          { id: '11111111-0000-0000-0000-000000000003', title: 'Tuân thủ Responsible Disclosure', description: 'Báo cáo lỗ hổng cho ban quản trị trước khi công khai.' },
        ],
        bannerUrl: null,
        avatarUrl: null,
        creatorId: '11111111-1111-1111-1111-111111111111',
        isPrivate: false,
        memberCount: 94,
        threadCount: 8,
        createdAt: '2026-01-05T00:00:00.000Z',
      },
      {
        id: space3Id,
        slug: 'system-architecture',
        name: 'Kiến Trúc Hệ Thống & CSDL',
        description: 'PostgreSQL internals, High Availability, GiST & Ltree trees, phân vùng sharding và caching.',
        rules: [],
        bannerUrl: null,
        avatarUrl: null,
        creatorId: '11111111-1111-1111-1111-111111111111',
        isPrivate: false,
        memberCount: 156,
        threadCount: 22,
        createdAt: '2026-01-10T00:00:00.000Z',
      },
    ];

    for (const space of defaultSpaces) {
      this.spaces.set(space.id, space);
    }

    // Seed 3 bài viết mẫu đại diện
    const thread1Id = '33333333-3333-3333-3333-333333333331';
    const thread2Id = '33333333-3333-3333-3333-333333333332';
    const thread3Id = '33333333-3333-3333-3333-333333333333';

    const defaultThreads: ThreadDetail[] = [
      {
        id: thread1Id,
        spaceId: space1Id,
        spaceSlug: 'devops-engineering',
        spaceName: 'DevOps & SRE Engineering',
        authorId: '11111111-1111-1111-1111-111111111112',
        authorUsername: 'devops_lead',
        authorAvatarUrl: null,
        slug: 'thiet-ke-chien-luoc-zero-downtime-deployment-voi-kubernetes-argocd',
        title: 'Thiết kế Chiến lược Zero-Downtime Deployment với Kubernetes & ArgoCD',
        snippet: 'Phân tích kỹ thuật triển khai Canary Deployment kết hợp Argo Rollouts và Prometheus Analysis...',
        counters: {
          upvotes: 24,
          downvotes: 1,
          netScore: 23,
          commentCount: 2,
          viewCount: 184,
          hotScore: 16.4,
        },
        userVoteDirection: null,
        isPinned: true,
        isLocked: false,
        contentAst: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              text: 'Trong kiến trúc Microservices hiện đại, việc cập nhật ứng dụng mà không gây gián đoạn phiên người dùng (Zero-Downtime) là tiêu chí bắt buộc. Bài viết này hướng dẫn chi tiết cách cấu hình Argo Rollouts kết hợp Service Mesh và Prometheus.',
            },
            {
              type: 'codeBlock',
              attrs: { language: 'yaml' },
              text: 'apiVersion: argoproj.io/v1alpha1\nkind: Rollout\nmetadata:\n  name: acad-core-api\nspec:\n  replicas: 5\n  strategy:\n    canary:\n      steps:\n      - setWeight: 20\n      - pause: {duration: 5m}',
            },
          ],
        },
        createdAt: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
        updatedAt: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
      },
      {
        id: thread2Id,
        spaceId: space2Id,
        spaceSlug: 'security-devsecops',
        spaceName: 'DevSecOps & Zero-Trust',
        authorId: '11111111-1111-1111-1111-111111111113',
        authorUsername: 'security_officer',
        authorAvatarUrl: null,
        slug: 'trien-khai-token-rotation-va-phat-hien-tai-su-dung-refresh-token',
        title: 'Triển khai Token Rotation và Phát hiện Tái sử dụng (Refresh Token Reuse Detection)',
        snippet: 'Cơ chế Token Family Id kết hợp SHA-256 hash và cửa sổ 30 giây Grace Period giải quyết triệt để race conditions...',
        counters: {
          upvotes: 32,
          downvotes: 0,
          netScore: 32,
          commentCount: 1,
          viewCount: 310,
          hotScore: 22.8,
        },
        userVoteDirection: null,
        isPinned: false,
        isLocked: false,
        contentAst: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              text: 'Khi người dùng refresh token, hệ thống hủy ngay token cũ và cấp token mới cùng Family ID. Nếu token cũ đã dùng tiếp tục được gửi đến sau thời hạn Grace Period (30s), toàn bộ họ phiên sẽ bị vô hiệu hóa lập tức để ngăn chặn đánh cắp phiên.',
            },
          ],
        },
        createdAt: new Date(Date.now() - 3600 * 1000 * 8).toISOString(),
        updatedAt: new Date(Date.now() - 3600 * 1000 * 8).toISOString(),
      },
      {
        id: thread3Id,
        spaceId: space3Id,
        spaceSlug: 'system-architecture',
        spaceName: 'Kiến Trúc Hệ Thống & CSDL',
        authorId: '11111111-1111-1111-1111-111111111111',
        authorUsername: 'admin',
        authorAvatarUrl: null,
        slug: 'toi-uu-hoa-bang-bo-dem-tach-roi-counter-table-voi-fillfactor-70',
        title: 'Tối ưu hóa Bảng Bộ đếm Tách rời (Counter Table) với fillfactor=70 trong PostgreSQL',
        snippet: 'Kỹ thuật HOT (Heap-Only Tuples) updates giúp PostgreSQL tăng tốc độ cập nhật upvote/view count gấp 5 lần...',
        counters: {
          upvotes: 45,
          downvotes: 2,
          netScore: 43,
          commentCount: 0,
          viewCount: 520,
          hotScore: 31.0,
        },
        userVoteDirection: null,
        isPinned: false,
        isLocked: false,
        contentAst: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              text: 'Bằng cách thiết lập WITH (fillfactor = 70) trên bảng thread_counters, PostgreSQL chừa lại 30% dung lượng trống trên mỗi data page để các thao tác UPDATE điểm số vote có thể ghi ngay tại chỗ mà không cần cập nhật lại chỉ mục B-Tree.',
            },
          ],
        },
        createdAt: new Date(Date.now() - 3600 * 1000 * 12).toISOString(),
        updatedAt: new Date(Date.now() - 3600 * 1000 * 12).toISOString(),
      },
    ];

    for (const thread of defaultThreads) {
      this.threads.set(thread.id, thread);
    }

    // Seed 2 bình luận lồng nhau trong thread1
    const comment1Id = '44444444-4444-4444-4444-444444444441';
    const comment2Id = '44444444-4444-4444-4444-444444444442';

    const comment1: FlatCommentItem = {
      id: comment1Id,
      threadId: thread1Id,
      parentId: null,
      path: '0001',
      depth: 0,
      hasChildren: true,
      childCount: 1,
      isCollapsed: false,
      visible: true,
      author: {
        id: '11111111-1111-1111-1111-111111111113',
        username: 'security_officer',
        avatarUrl: null,
        karmaScore: 120,
      },
      contentAst: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            text: 'Bài viết rất chuẩn! Khi cấu hình Canary cần chú ý thêm Service Mesh TLS mutual authentication giữa các pod canary và stable.',
          },
        ],
      },
      upvotes: 5,
      downvotes: 0,
      netScore: 5,
      userVoteDirection: null,
      createdAt: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
      updatedAt: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
    };

    const comment2: FlatCommentItem = {
      id: comment2Id,
      threadId: thread1Id,
      parentId: comment1Id,
      path: '0001.0001',
      depth: 1,
      hasChildren: false,
      childCount: 0,
      isCollapsed: false,
      visible: true,
      author: {
        id: '11111111-1111-1111-1111-111111111112',
        username: 'devops_lead',
        avatarUrl: null,
        karmaScore: 250,
      },
      contentAst: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            text: 'Hoàn toàn đồng ý, mTLS của Istio hoặc Linkerd giúp mã hóa toàn bộ luồng mạng nội bộ an toàn.',
          },
        ],
      },
      upvotes: 2,
      downvotes: 0,
      netScore: 2,
      userVoteDirection: null,
      createdAt: new Date(Date.now() - 3600 * 1000 * 1).toISOString(),
      updatedAt: new Date(Date.now() - 3600 * 1000 * 1).toISOString(),
    };

    this.comments.set(comment1.id, comment1);
    this.comments.set(comment2.id, comment2);
  }

  // --- SPACES ---
  public async listSpaces(): Promise<Space[]> {
    return Array.from(this.spaces.values());
  }

  public async getSpaceBySlug(slug: string): Promise<Space | null> {
    const s = Array.from(this.spaces.values()).find(
      (item) => item.slug.toLowerCase() === slug.toLowerCase(),
    );
    return s ?? null;
  }

  public async getSpaceById(id: string): Promise<Space | null> {
    return this.spaces.get(id) ?? null;
  }

  public async createSpace(
    input: CreateSpaceInput,
    creatorId?: string | null,
  ): Promise<Space> {
    const existing = await this.getSpaceBySlug(input.slug);
    if (existing) {
      throw new Error(`Không gian với đường dẫn '${input.slug}' đã tồn tại`);
    }

    const space: Space = {
      id: crypto.randomUUID(),
      slug: input.slug.toLowerCase(),
      name: input.name,
      description: input.description ?? null,
      rules: input.rules || [],
      bannerUrl: input.bannerUrl ?? null,
      avatarUrl: input.avatarUrl ?? null,
      creatorId: creatorId ?? null,
      isPrivate: input.isPrivate || false,
      memberCount: 1,
      threadCount: 0,
      createdAt: new Date().toISOString(),
    };
    this.spaces.set(space.id, space);
    return space;
  }

  public async joinSpace(spaceId: string, userId: string): Promise<SpaceMembership> {
    const key = `${userId}:${spaceId}`;
    let membership = this.spaceMemberships.get(key);
    if (!membership) {
      membership = {
        userId,
        spaceId,
        role: 'MEMBER',
        karmaInSpace: 0,
        isMuted: false,
        mutedUntil: null,
        createdAt: new Date().toISOString(),
      };
      this.spaceMemberships.set(key, membership);
      const space = this.spaces.get(spaceId);
      if (space) space.memberCount += 1;
    }
    return membership;
  }

  public async leaveSpace(spaceId: string, userId: string): Promise<boolean> {
    const key = `${userId}:${spaceId}`;
    if (this.spaceMemberships.has(key)) {
      this.spaceMemberships.delete(key);
      const space = this.spaces.get(spaceId);
      if (space && space.memberCount > 0) space.memberCount -= 1;
      return true;
    }
    return false;
  }

  // --- THREADS ---
  public async listThreads(filter: ThreadListFilter): Promise<ThreadListResult> {
    let items = Array.from(this.threads.values());

    if (filter.spaceSlug) {
      items = items.filter(
        (t) => t.spaceSlug.toLowerCase() === filter.spaceSlug!.toLowerCase(),
      );
    }

    const sort = filter.sort || 'hot';
    if (sort === 'hot') {
      items.sort((a, b) => b.counters.hotScore - a.counters.hotScore);
    } else if (sort === 'new') {
      items.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    } else if (sort === 'top') {
      items.sort((a, b) => b.counters.netScore - a.counters.netScore);
    }

    // Attach user vote direction if userId provided
    if (filter.userId) {
      items = items.map((t) => {
        const uv = this.voteEngine.getUserVote(t.id, filter.userId!);
        return {
          ...t,
          userVoteDirection: (uv === 1 || uv === -1 ? uv : null) as VoteDirection | null,
        };
      });
    }

    const limit = filter.limit || 20;
    const paginated = items.slice(0, limit);

    return {
      items: paginated,
      nextCursor: items.length > limit ? 'next' : null,
    };
  }

  public async getThreadBySlug(
    slug: string,
    userId?: string,
  ): Promise<ThreadDetail | null> {
    const thread = Array.from(this.threads.values()).find(
      (t) => t.slug.toLowerCase() === slug.toLowerCase(),
    );
    if (!thread) return null;

    if (userId) {
      const uv = this.voteEngine.getUserVote(thread.id, userId);
      return {
        ...thread,
        userVoteDirection: (uv === 1 || uv === -1 ? uv : null) as VoteDirection | null,
      };
    }
    return thread;
  }

  public async getThreadById(
    id: string,
    userId?: string,
  ): Promise<ThreadDetail | null> {
    const thread = this.threads.get(id);
    if (!thread) return null;

    if (userId) {
      const uv = this.voteEngine.getUserVote(thread.id, userId);
      return {
        ...thread,
        userVoteDirection: (uv === 1 || uv === -1 ? uv : null) as VoteDirection | null,
      };
    }
    return thread;
  }

  public async createThread(
    input: CreateThreadInput,
    authorId: string,
    authorUsername: string,
    authorAvatarUrl?: string | null,
  ): Promise<ThreadDetail> {
    const space = this.spaces.get(input.spaceId);
    if (!space) {
      throw new Error(`Không gian thảo luận không tồn tại (spaceId: ${input.spaceId})`);
    }

    const baseSlug = slugify(input.title) || 'bai-viet-moi';
    const uniqueSuffix = Math.random().toString(36).substring(2, 7);
    const finalSlug = `${baseSlug}-${uniqueSuffix}`;

    const snippet = extractSnippetFromAst(input.contentAst);
    const now = new Date().toISOString();

    const thread: ThreadDetail = {
      id: crypto.randomUUID(),
      spaceId: space.id,
      spaceSlug: space.slug,
      spaceName: space.name,
      authorId,
      authorUsername,
      authorAvatarUrl: authorAvatarUrl ?? null,
      slug: finalSlug,
      title: input.title,
      snippet,
      counters: {
        upvotes: 1, // Tác giả tự động upvote bài mình
        downvotes: 0,
        netScore: 1,
        commentCount: 0,
        viewCount: 1,
        hotScore: GravityDecayEngine.computeHotScore(1, new Date()),
      },
      userVoteDirection: 1,
      isPinned: false,
      isLocked: false,
      contentAst: input.contentAst,
      createdAt: now,
      updatedAt: now,
    };

    this.threads.set(thread.id, thread);
    this.voteEngine.executeVote(thread.id, authorId, 1);
    space.threadCount += 1;

    return thread;
  }

  public async deleteThread(
    id: string,
    requesterId: string,
    isAdminOrMod: boolean,
  ): Promise<boolean> {
    const thread = this.threads.get(id);
    if (!thread) return false;
    if (thread.authorId !== requesterId && !isAdminOrMod) {
      throw new Error('Bạn không có quyền xóa bài viết này');
    }
    this.threads.delete(id);
    const space = this.spaces.get(thread.spaceId);
    if (space && space.threadCount > 0) space.threadCount -= 1;
    return true;
  }

  // --- COMMENTS ---
  public async listComments(
    threadId: string,
    userId?: string,
  ): Promise<FlatCommentItem[]> {
    const list = Array.from(this.comments.values())
      .filter((c) => c.threadId === threadId)
      .sort((a, b) => a.path.localeCompare(b.path));

    if (userId) {
      return list.map((c) => {
        const uv = this.voteEngine.getUserVote(c.id, userId);
        return {
          ...c,
          userVoteDirection: (uv === 1 || uv === -1 ? uv : null) as VoteDirection | null,
        };
      });
    }
    return list;
  }

  public async createComment(input: {
    threadId: string;
    parentId?: string | null;
    contentAst: ContentAST;
    authorId: string;
    authorUsername: string;
    authorAvatarUrl?: string | null;
    karmaScore?: number;
  }): Promise<FlatCommentItem> {
    const thread = this.threads.get(input.threadId);
    if (!thread) {
      throw new Error(`Bài viết không tồn tại (threadId: ${input.threadId})`);
    }

    let parentPath: string | null = null;
    let siblingsCount = 0;

    if (input.parentId) {
      const parent = this.comments.get(input.parentId);
      if (!parent) {
        throw new Error(`Bình luận cha không tồn tại (parentId: ${input.parentId})`);
      }
      parentPath = parent.path;
      parent.hasChildren = true;
      parent.childCount += 1;
      siblingsCount = Array.from(this.comments.values()).filter(
        (c) => c.parentId === input.parentId,
      ).length;
    } else {
      siblingsCount = Array.from(this.comments.values()).filter(
        (c) => c.threadId === input.threadId && !c.parentId,
      ).length;
    }

    const pathGen = LtreePathGenerator.generateNextPath(parentPath, siblingsCount);
    const now = new Date().toISOString();

    const comment: FlatCommentItem = {
      id: crypto.randomUUID(),
      threadId: input.threadId,
      parentId: input.parentId ?? null,
      path: pathGen.path,
      depth: pathGen.depth,
      hasChildren: false,
      childCount: 0,
      isCollapsed: false,
      visible: true,
      author: {
        id: input.authorId,
        username: input.authorUsername,
        avatarUrl: input.authorAvatarUrl ?? null,
        karmaScore: input.karmaScore ?? 0,
      },
      contentAst: input.contentAst,
      upvotes: 1,
      downvotes: 0,
      netScore: 1,
      userVoteDirection: 1,
      createdAt: now,
      updatedAt: now,
    };

    this.comments.set(comment.id, comment);
    this.voteEngine.executeVote(comment.id, input.authorId, 1);
    thread.counters.commentCount += 1;

    return comment;
  }

  public async deleteComment(
    id: string,
    requesterId: string,
    isAdminOrMod: boolean,
  ): Promise<boolean> {
    const comment = this.comments.get(id);
    if (!comment) return false;
    if (comment.author.id !== requesterId && !isAdminOrMod) {
      throw new Error('Bạn không có quyền xóa bình luận này');
    }
    this.comments.delete(id);
    const thread = this.threads.get(comment.threadId);
    if (thread && thread.counters.commentCount > 0) {
      thread.counters.commentCount -= 1;
    }
    return true;
  }

  // --- VOTES ---
  public async voteThread(
    threadId: string,
    userId: string,
    direction: 1 | -1,
  ): Promise<{ upvotes: number; downvotes: number; netScore: number; userVote: 1 | -1 | null }> {
    const thread = this.threads.get(threadId);
    if (!thread) {
      throw new Error(`Bài viết không tồn tại (threadId: ${threadId})`);
    }

    const voteRes = this.voteEngine.executeVote(threadId, userId, direction);
    thread.counters.upvotes = voteRes.counters.upvotes;
    thread.counters.downvotes = voteRes.counters.downvotes;
    thread.counters.netScore = voteRes.counters.netScore;
    thread.counters.hotScore = GravityDecayEngine.computeHotScore(
      voteRes.counters.netScore,
      new Date(thread.createdAt),
    );

    return {
      upvotes: voteRes.counters.upvotes,
      downvotes: voteRes.counters.downvotes,
      netScore: voteRes.counters.netScore,
      userVote: (voteRes.finalDirection === 1 || voteRes.finalDirection === -1
        ? voteRes.finalDirection
        : null) as 1 | -1 | null,
    };
  }

  public async voteComment(
    commentId: string,
    userId: string,
    direction: 1 | -1,
  ): Promise<{ upvotes: number; downvotes: number; netScore: number; userVote: 1 | -1 | null }> {
    const comment = this.comments.get(commentId);
    if (!comment) {
      throw new Error(`Bình luận không tồn tại (commentId: ${commentId})`);
    }

    const voteRes = this.voteEngine.executeVote(commentId, userId, direction);
    comment.upvotes = voteRes.counters.upvotes;
    comment.downvotes = voteRes.counters.downvotes;
    comment.netScore = voteRes.counters.netScore;

    return {
      upvotes: voteRes.counters.upvotes,
      downvotes: voteRes.counters.downvotes,
      netScore: voteRes.counters.netScore,
      userVote: (voteRes.finalDirection === 1 || voteRes.finalDirection === -1
        ? voteRes.finalDirection
        : null) as 1 | -1 | null,
    };
  }
}

// ============================================================================
// POSTGRESQL COMMUNITY REPOSITORY (PRODUCTION / SUPABASE / RESILIENT FALLBACK)
// ============================================================================

export function sanitizePostgresConfig(poolOrConfig: pg.Pool | pg.PoolConfig | string): pg.PoolConfig {
  if (typeof poolOrConfig === 'string') {
    const connectionString = poolOrConfig.trim();
    const isLocal =
      connectionString.includes('localhost') ||
      connectionString.includes('127.0.0.1') ||
      connectionString.includes('infra-db');

    const hasSslDisabled =
      connectionString.includes('sslmode=disable') ||
      connectionString.includes('ssl=false');

    const isCloudHost =
      connectionString.includes('.render.com') ||
      connectionString.includes('.neon.tech') ||
      connectionString.includes('.supabase.co') ||
      connectionString.includes('.supabase.com') ||
      connectionString.includes('pooler.supabase.com') ||
      connectionString.includes('.supabase.in') ||
      connectionString.includes('.aivencloud.com') ||
      connectionString.includes('amazonaws.com') ||
      connectionString.includes('cockroachlabs.cloud') ||
      connectionString.includes('.upstash.io');

    const shouldEnableSsl =
      !isLocal &&
      !hasSslDisabled &&
      (isCloudHost || connectionString.includes('sslmode=') || process.env.NODE_ENV === 'production');

    if (shouldEnableSsl) {
      return {
        connectionString,
        ssl: {
          rejectUnauthorized: false,
        },
      };
    }
    return { connectionString };
  }

  if (poolOrConfig && typeof poolOrConfig === 'object') {
    const config = { ...(poolOrConfig as pg.PoolConfig) };
    if (!config.ssl && process.env.NODE_ENV === 'production') {
      config.ssl = { rejectUnauthorized: false };
    }
    return config;
  }

  return poolOrConfig as pg.PoolConfig;
}

export class PostgresCommunityRepository implements ICommunityRepository {
  private pool: pg.Pool;
  private rawConfig: pg.Pool | pg.PoolConfig | string;
  private fallbackStore: InMemoryCommunityRepository = new InMemoryCommunityRepository();
  private isUsingFallback = false;

  constructor(poolOrConfig: pg.Pool | pg.PoolConfig | string) {
    this.rawConfig = poolOrConfig;
    if (poolOrConfig instanceof Pool) {
      this.pool = poolOrConfig;
    } else {
      const sanitized = sanitizePostgresConfig(poolOrConfig);
      this.pool = new Pool(sanitized);
    }

    this.pool.on('error', (err) => {
      console.warn('[PostgresCommunityRepository] Pool background error, switching to resilient fallback:', err.message);
      this.isUsingFallback = true;
    });
  }

  public getHealthStatus(): {
    type: 'postgres' | 'in_memory_fallback';
    isFallback: boolean;
    target?: string;
  } {
    if (this.isUsingFallback) {
      return {
        type: 'in_memory_fallback',
        isFallback: true,
        target: 'resilient_ram_community_store',
      };
    }

    let target = 'postgresql';
    const connStr = typeof this.rawConfig === 'string' ? this.rawConfig : (this.rawConfig as pg.PoolConfig).connectionString || '';
    if (connStr.includes('supabase')) target = 'supabase';
    else if (connStr.includes('neon.tech')) target = 'neon';
    else if (connStr.includes('render.com')) target = 'render';

    return {
      type: 'postgres',
      isFallback: false,
      target,
    };
  }

  private async executeWithFallback<T>(
    operation: (client: pg.PoolClient) => Promise<T>,
    fallbackOp: () => Promise<T>,
  ): Promise<T> {
    if (this.isUsingFallback) {
      return fallbackOp();
    }

    let client: pg.PoolClient | null = null;
    try {
      client = await this.pool.connect();
      return await operation(client);
    } catch (err: any) {
      console.warn('[PostgresCommunityRepository] DB operation failed, falling back to memory store:', err?.message || err);
      this.isUsingFallback = true;
      return fallbackOp();
    } finally {
      if (client) client.release();
    }
  }

  // --- SPACES ---
  public async listSpaces(): Promise<Space[]> {
    return this.executeWithFallback(
      async (client) => {
        const query = `
          SELECT 
            s.id, s.slug, s.name, s.description, s.rules, 
            s.banner_url AS "bannerUrl", s.avatar_url AS "avatarUrl", 
            s.creator_id AS "creatorId", s.is_private AS "isPrivate",
            s.created_at AS "createdAt",
            COALESCE((SELECT COUNT(*)::int FROM space_memberships sm WHERE sm.space_id = s.id), 0) AS "memberCount",
            COALESCE((SELECT COUNT(*)::int FROM threads t WHERE t.space_id = s.id AND t.is_deleted = FALSE), 0) AS "threadCount"
          FROM spaces s
          ORDER BY "memberCount" DESC, s.name ASC
        `;
        const res = await client.query(query);
        return res.rows.map((row) => ({
          ...row,
          rules: typeof row.rules === 'string' ? JSON.parse(row.rules) : row.rules || [],
          createdAt: new Date(row.createdAt).toISOString(),
        }));
      },
      () => this.fallbackStore.listSpaces(),
    );
  }

  public async getSpaceBySlug(slug: string): Promise<Space | null> {
    return this.executeWithFallback(
      async (client) => {
        const query = `
          SELECT 
            s.id, s.slug, s.name, s.description, s.rules, 
            s.banner_url AS "bannerUrl", s.avatar_url AS "avatarUrl", 
            s.creator_id AS "creatorId", s.is_private AS "isPrivate",
            s.created_at AS "createdAt",
            COALESCE((SELECT COUNT(*)::int FROM space_memberships sm WHERE sm.space_id = s.id), 0) AS "memberCount",
            COALESCE((SELECT COUNT(*)::int FROM threads t WHERE t.space_id = s.id AND t.is_deleted = FALSE), 0) AS "threadCount"
          FROM spaces s
          WHERE LOWER(s.slug) = LOWER($1)
          LIMIT 1
        `;
        const res = await client.query(query, [slug]);
        if (res.rows.length === 0) return null;
        const row = res.rows[0];
        return {
          ...row,
          rules: typeof row.rules === 'string' ? JSON.parse(row.rules) : row.rules || [],
          createdAt: new Date(row.createdAt).toISOString(),
        };
      },
      () => this.fallbackStore.getSpaceBySlug(slug),
    );
  }

  public async getSpaceById(id: string): Promise<Space | null> {
    return this.executeWithFallback(
      async (client) => {
        const query = `
          SELECT 
            s.id, s.slug, s.name, s.description, s.rules, 
            s.banner_url AS "bannerUrl", s.avatar_url AS "avatarUrl", 
            s.creator_id AS "creatorId", s.is_private AS "isPrivate",
            s.created_at AS "createdAt",
            COALESCE((SELECT COUNT(*)::int FROM space_memberships sm WHERE sm.space_id = s.id), 0) AS "memberCount",
            COALESCE((SELECT COUNT(*)::int FROM threads t WHERE t.space_id = s.id AND t.is_deleted = FALSE), 0) AS "threadCount"
          FROM spaces s
          WHERE s.id = $1
          LIMIT 1
        `;
        const res = await client.query(query, [id]);
        if (res.rows.length === 0) return null;
        const row = res.rows[0];
        return {
          ...row,
          rules: typeof row.rules === 'string' ? JSON.parse(row.rules) : row.rules || [],
          createdAt: new Date(row.createdAt).toISOString(),
        };
      },
      () => this.fallbackStore.getSpaceById(id),
    );
  }

  public async createSpace(
    input: CreateSpaceInput,
    creatorId?: string | null,
  ): Promise<Space> {
    return this.executeWithFallback(
      async (client) => {
        const query = `
          INSERT INTO spaces (slug, name, description, rules, banner_url, avatar_url, creator_id, is_private)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING id, slug, name, description, rules, banner_url AS "bannerUrl", avatar_url AS "avatarUrl", creator_id AS "creatorId", is_private AS "isPrivate", created_at AS "createdAt"
        `;
        const res = await client.query(query, [
          input.slug.toLowerCase(),
          input.name,
          input.description || null,
          JSON.stringify(input.rules || []),
          input.bannerUrl || null,
          input.avatarUrl || null,
          creatorId || null,
          input.isPrivate || false,
        ]);
        const row = res.rows[0];

        // Creator automatically joins as ADMIN
        if (creatorId) {
          await client.query(
            `INSERT INTO space_memberships (user_id, space_id, role) VALUES ($1, $2, 'ADMIN') ON CONFLICT DO NOTHING`,
            [creatorId, row.id],
          );
        }

        return {
          ...row,
          rules: typeof row.rules === 'string' ? JSON.parse(row.rules) : row.rules || [],
          memberCount: creatorId ? 1 : 0,
          threadCount: 0,
          createdAt: new Date(row.createdAt).toISOString(),
        };
      },
      () => this.fallbackStore.createSpace(input, creatorId),
    );
  }

  public async joinSpace(spaceId: string, userId: string): Promise<SpaceMembership> {
    return this.executeWithFallback(
      async (client) => {
        const query = `
          INSERT INTO space_memberships (user_id, space_id, role, karma_in_space)
          VALUES ($1, $2, 'MEMBER', 0)
          ON CONFLICT (user_id, space_id) DO UPDATE SET updated_at = NOW()
          RETURNING user_id AS "userId", space_id AS "spaceId", role, karma_in_space AS "karmaInSpace", is_muted AS "isMuted", muted_until AS "mutedUntil", created_at AS "createdAt"
        `;
        const res = await client.query(query, [userId, spaceId]);
        const row = res.rows[0];
        return {
          ...row,
          mutedUntil: row.mutedUntil ? new Date(row.mutedUntil).toISOString() : null,
          createdAt: new Date(row.createdAt).toISOString(),
        };
      },
      () => this.fallbackStore.joinSpace(spaceId, userId),
    );
  }

  public async leaveSpace(spaceId: string, userId: string): Promise<boolean> {
    return this.executeWithFallback(
      async (client) => {
        const res = await client.query(
          `DELETE FROM space_memberships WHERE user_id = $1 AND space_id = $2`,
          [userId, spaceId],
        );
        return (res.rowCount ?? 0) > 0;
      },
      () => this.fallbackStore.leaveSpace(spaceId, userId),
    );
  }

  // --- THREADS ---
  public async listThreads(filter: ThreadListFilter): Promise<ThreadListResult> {
    return this.executeWithFallback(
      async (client) => {
        let orderByClause = 'tc.hot_score DESC';
        if (filter.sort === 'new') {
          orderByClause = 't.created_at DESC';
        } else if (filter.sort === 'top') {
          orderByClause = 'tc.net_score DESC';
        }

        const params: any[] = [];
        let whereClause = 'WHERE t.is_deleted = FALSE';

        if (filter.spaceSlug) {
          params.push(filter.spaceSlug.toLowerCase());
          whereClause += ` AND LOWER(s.slug) = $${params.length}`;
        }

        const limit = filter.limit || 20;
        params.push(limit + 1);
        const limitParamIndex = params.length;

        let userVoteSelect = 'NULL::smallint AS "userVoteDirection"';
        if (filter.userId) {
          params.push(filter.userId);
          userVoteSelect = `(SELECT v.direction FROM votes v WHERE v.target_id = t.id AND v.user_id = $${params.length} AND v.target_type = 'THREAD') AS "userVoteDirection"`;
        }

        const query = `
          SELECT 
            t.id, t.space_id AS "spaceId", s.slug AS "spaceSlug", s.name AS "spaceName",
            t.author_id AS "authorId", u.username AS "authorUsername", u.avatar_url AS "authorAvatarUrl",
            t.slug, t.title, t.content_ast AS "contentAst",
            t.is_pinned AS "isPinned", t.is_locked AS "isLocked",
            t.created_at AS "createdAt",
            COALESCE(tc.upvotes, 0) AS upvotes,
            COALESCE(tc.downvotes, 0) AS downvotes,
            COALESCE(tc.net_score, 0) AS "netScore",
            COALESCE(tc.comment_count, 0) AS "commentCount",
            COALESCE(tc.view_count, 0) AS "viewCount",
            COALESCE(tc.hot_score, 0) AS "hotScore",
            ${userVoteSelect}
          FROM threads t
          INNER JOIN spaces s ON s.id = t.space_id
          INNER JOIN users u ON u.id = t.author_id
          LEFT JOIN thread_counters tc ON tc.thread_id = t.id
          ${whereClause}
          ORDER BY t.is_pinned DESC, ${orderByClause}
          LIMIT $${limitParamIndex}
        `;

        const res = await client.query(query, params);
        const hasNext = res.rows.length > limit;
        const rawItems = hasNext ? res.rows.slice(0, limit) : res.rows;

        const items: ThreadSummary[] = rawItems.map((r) => {
          const contentAst = typeof r.contentAst === 'string' ? JSON.parse(r.contentAst) : r.contentAst;
          const snippet = extractSnippetFromAst(contentAst);
          return {
            id: r.id,
            spaceId: r.spaceId,
            spaceSlug: r.spaceSlug,
            spaceName: r.spaceName,
            authorId: r.authorId,
            authorUsername: r.authorUsername,
            authorAvatarUrl: r.authorAvatarUrl || null,
            slug: r.slug,
            title: r.title,
            snippet,
            counters: {
              upvotes: Number(r.upvotes),
              downvotes: Number(r.downvotes),
              netScore: Number(r.netScore),
              commentCount: Number(r.commentCount),
              viewCount: Number(r.viewCount),
              hotScore: Number(r.hotScore),
            },
            userVoteDirection: (r.userVoteDirection === 1 || r.userVoteDirection === -1
              ? r.userVoteDirection
              : null) as VoteDirection | null,
            isPinned: Boolean(r.isPinned),
            isLocked: Boolean(r.isLocked),
            createdAt: new Date(r.createdAt).toISOString(),
          };
        });

        return {
          items,
          nextCursor: hasNext ? 'has_more' : null,
        };
      },
      () => this.fallbackStore.listThreads(filter),
    );
  }

  public async getThreadBySlug(
    slug: string,
    userId?: string,
  ): Promise<ThreadDetail | null> {
    return this.executeWithFallback(
      async (client) => {
        const params: any[] = [slug.toLowerCase()];
        let userVoteSelect = 'NULL::smallint AS "userVoteDirection"';
        if (userId) {
          params.push(userId);
          userVoteSelect = `(SELECT v.direction FROM votes v WHERE v.target_id = t.id AND v.user_id = $2 AND v.target_type = 'THREAD') AS "userVoteDirection"`;
        }

        const query = `
          SELECT 
            t.id, t.space_id AS "spaceId", s.slug AS "spaceSlug", s.name AS "spaceName",
            t.author_id AS "authorId", u.username AS "authorUsername", u.avatar_url AS "authorAvatarUrl",
            t.slug, t.title, t.content_ast AS "contentAst",
            t.is_pinned AS "isPinned", t.is_locked AS "isLocked",
            t.created_at AS "createdAt", t.updated_at AS "updatedAt",
            COALESCE(tc.upvotes, 0) AS upvotes,
            COALESCE(tc.downvotes, 0) AS downvotes,
            COALESCE(tc.net_score, 0) AS "netScore",
            COALESCE(tc.comment_count, 0) AS "commentCount",
            COALESCE(tc.view_count, 0) AS "viewCount",
            COALESCE(tc.hot_score, 0) AS "hotScore",
            ${userVoteSelect}
          FROM threads t
          INNER JOIN spaces s ON s.id = t.space_id
          INNER JOIN users u ON u.id = t.author_id
          LEFT JOIN thread_counters tc ON tc.thread_id = t.id
          WHERE LOWER(t.slug) = $1 AND t.is_deleted = FALSE
          LIMIT 1
        `;

        const res = await client.query(query, params);
        if (res.rows.length === 0) return null;
        const r = res.rows[0];
        const contentAst = typeof r.contentAst === 'string' ? JSON.parse(r.contentAst) : r.contentAst;
        const snippet = extractSnippetFromAst(contentAst);

        // Async increment view count
        client.query('UPDATE thread_counters SET view_count = view_count + 1 WHERE thread_id = $1', [r.id]).catch(() => {});

        return {
          id: r.id,
          spaceId: r.spaceId,
          spaceSlug: r.spaceSlug,
          spaceName: r.spaceName,
          authorId: r.authorId,
          authorUsername: r.authorUsername,
          authorAvatarUrl: r.authorAvatarUrl || null,
          slug: r.slug,
          title: r.title,
          snippet,
          contentAst,
          counters: {
            upvotes: Number(r.upvotes),
            downvotes: Number(r.downvotes),
            netScore: Number(r.netScore),
            commentCount: Number(r.commentCount),
            viewCount: Number(r.viewCount) + 1,
            hotScore: Number(r.hotScore),
          },
          userVoteDirection: (r.userVoteDirection === 1 || r.userVoteDirection === -1
            ? r.userVoteDirection
            : null) as VoteDirection | null,
          isPinned: Boolean(r.isPinned),
          isLocked: Boolean(r.isLocked),
          createdAt: new Date(r.createdAt).toISOString(),
          updatedAt: new Date(r.updatedAt).toISOString(),
        };
      },
      () => this.fallbackStore.getThreadBySlug(slug, userId),
    );
  }

  public async getThreadById(
    id: string,
    userId?: string,
  ): Promise<ThreadDetail | null> {
    return this.executeWithFallback(
      async (client) => {
        const params: any[] = [id];
        let userVoteSelect = 'NULL::smallint AS "userVoteDirection"';
        if (userId) {
          params.push(userId);
          userVoteSelect = `(SELECT v.direction FROM votes v WHERE v.target_id = t.id AND v.user_id = $2 AND v.target_type = 'THREAD') AS "userVoteDirection"`;
        }

        const query = `
          SELECT 
            t.id, t.space_id AS "spaceId", s.slug AS "spaceSlug", s.name AS "spaceName",
            t.author_id AS "authorId", u.username AS "authorUsername", u.avatar_url AS "authorAvatarUrl",
            t.slug, t.title, t.content_ast AS "contentAst",
            t.is_pinned AS "isPinned", t.is_locked AS "isLocked",
            t.created_at AS "createdAt", t.updated_at AS "updatedAt",
            COALESCE(tc.upvotes, 0) AS upvotes,
            COALESCE(tc.downvotes, 0) AS downvotes,
            COALESCE(tc.net_score, 0) AS "netScore",
            COALESCE(tc.comment_count, 0) AS "commentCount",
            COALESCE(tc.view_count, 0) AS "viewCount",
            COALESCE(tc.hot_score, 0) AS "hotScore",
            ${userVoteSelect}
          FROM threads t
          INNER JOIN spaces s ON s.id = t.space_id
          INNER JOIN users u ON u.id = t.author_id
          LEFT JOIN thread_counters tc ON tc.thread_id = t.id
          WHERE t.id = $1 AND t.is_deleted = FALSE
          LIMIT 1
        `;

        const res = await client.query(query, params);
        if (res.rows.length === 0) return null;
        const r = res.rows[0];
        const contentAst = typeof r.contentAst === 'string' ? JSON.parse(r.contentAst) : r.contentAst;
        const snippet = extractSnippetFromAst(contentAst);

        return {
          id: r.id,
          spaceId: r.spaceId,
          spaceSlug: r.spaceSlug,
          spaceName: r.spaceName,
          authorId: r.authorId,
          authorUsername: r.authorUsername,
          authorAvatarUrl: r.authorAvatarUrl || null,
          slug: r.slug,
          title: r.title,
          snippet,
          contentAst,
          counters: {
            upvotes: Number(r.upvotes),
            downvotes: Number(r.downvotes),
            netScore: Number(r.netScore),
            commentCount: Number(r.commentCount),
            viewCount: Number(r.viewCount),
            hotScore: Number(r.hotScore),
          },
          userVoteDirection: (r.userVoteDirection === 1 || r.userVoteDirection === -1
            ? r.userVoteDirection
            : null) as VoteDirection | null,
          isPinned: Boolean(r.isPinned),
          isLocked: Boolean(r.isLocked),
          createdAt: new Date(r.createdAt).toISOString(),
          updatedAt: new Date(r.updatedAt).toISOString(),
        };
      },
      () => this.fallbackStore.getThreadById(id, userId),
    );
  }

  public async createThread(
    input: CreateThreadInput,
    authorId: string,
    authorUsername: string,
    authorAvatarUrl?: string | null,
  ): Promise<ThreadDetail> {
    return this.executeWithFallback(
      async (client) => {
        // Lấy thông tin space
        const spaceRes = await client.query('SELECT id, slug, name FROM spaces WHERE id = $1', [input.spaceId]);
        if (spaceRes.rows.length === 0) {
          throw new Error(`Không gian thảo luận không tồn tại (spaceId: ${input.spaceId})`);
        }
        const space = spaceRes.rows[0];

        const baseSlug = slugify(input.title) || 'bai-viet-moi';
        const uniqueSuffix = Math.random().toString(36).substring(2, 7);
        const finalSlug = `${baseSlug}-${uniqueSuffix}`;

        const insertQuery = `
          INSERT INTO threads (space_id, author_id, slug, title, content_ast)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id, space_id AS "spaceId", author_id AS "authorId", slug, title, content_ast AS "contentAst", is_pinned AS "isPinned", is_locked AS "isLocked", created_at AS "createdAt", updated_at AS "updatedAt"
        `;

        const res = await client.query(insertQuery, [
          space.id,
          authorId,
          finalSlug,
          input.title,
          JSON.stringify(input.contentAst),
        ]);
        const r = res.rows[0];

        // Tự động upvote bài viết mới
        await client.query(
          `INSERT INTO votes (user_id, target_id, target_type, direction) VALUES ($1, $2, 'THREAD', 1) ON CONFLICT DO NOTHING`,
          [authorId, r.id],
        );

        const hotScore = GravityDecayEngine.computeHotScore(1, new Date());
        await client.query(
          `INSERT INTO thread_counters (thread_id, upvotes, downvotes, net_score, comment_count, view_count, hot_score)
           VALUES ($1, 1, 0, 1, 0, 1, $2)
           ON CONFLICT (thread_id) DO UPDATE SET upvotes = 1, net_score = 1, hot_score = $2`,
          [r.id, hotScore],
        );

        const snippet = extractSnippetFromAst(input.contentAst);

        return {
          id: r.id,
          spaceId: space.id,
          spaceSlug: space.slug,
          spaceName: space.name,
          authorId,
          authorUsername,
          authorAvatarUrl: authorAvatarUrl || null,
          slug: r.slug,
          title: r.title,
          snippet,
          contentAst: input.contentAst,
          counters: {
            upvotes: 1,
            downvotes: 0,
            netScore: 1,
            commentCount: 0,
            viewCount: 1,
            hotScore,
          },
          userVoteDirection: 1,
          isPinned: Boolean(r.isPinned),
          isLocked: Boolean(r.isLocked),
          createdAt: new Date(r.createdAt).toISOString(),
          updatedAt: new Date(r.updatedAt).toISOString(),
        };
      },
      () => this.fallbackStore.createThread(input, authorId, authorUsername, authorAvatarUrl),
    );
  }

  public async deleteThread(
    id: string,
    requesterId: string,
    isAdminOrMod: boolean,
  ): Promise<boolean> {
    return this.executeWithFallback(
      async (client) => {
        const check = await client.query('SELECT author_id FROM threads WHERE id = $1', [id]);
        if (check.rows.length === 0) return false;
        if (check.rows[0].author_id !== requesterId && !isAdminOrMod) {
          throw new Error('Bạn không có quyền xóa bài viết này');
        }
        await client.query('UPDATE threads SET is_deleted = TRUE, updated_at = NOW() WHERE id = $1', [id]);
        return true;
      },
      () => this.fallbackStore.deleteThread(id, requesterId, isAdminOrMod),
    );
  }

  // --- COMMENTS ---
  public async listComments(
    threadId: string,
    userId?: string,
  ): Promise<FlatCommentItem[]> {
    return this.executeWithFallback(
      async (client) => {
        const params: any[] = [threadId];
        let userVoteSelect = 'NULL::smallint AS "userVoteDirection"';
        if (userId) {
          params.push(userId);
          userVoteSelect = `(SELECT v.direction FROM votes v WHERE v.target_id = c.id AND v.user_id = $2 AND v.target_type = 'COMMENT') AS "userVoteDirection"`;
        }

        const query = `
          SELECT 
            c.id, c.thread_id AS "threadId", c.parent_id AS "parentId",
            c.path::text AS path, c.depth,
            c.upvotes, c.downvotes, c.net_score AS "netScore",
            c.is_collapsed_default AS "isCollapsed",
            c.created_at AS "createdAt", c.updated_at AS "updatedAt",
            c.content_ast AS "contentAst",
            c.author_id AS "authorId", u.username AS "authorUsername", u.avatar_url AS "authorAvatarUrl", u.karma_score AS "authorKarma",
            COALESCE((SELECT COUNT(*)::int FROM comments child WHERE child.parent_id = c.id AND child.is_deleted = FALSE), 0) AS "childCount",
            ${userVoteSelect}
          FROM comments c
          INNER JOIN users u ON u.id = c.author_id
          WHERE c.thread_id = $1 AND c.is_deleted = FALSE
          ORDER BY c.path ASC
        `;

        const res = await client.query(query, params);
        return res.rows.map((r) => {
          const childCount = Number(r.childCount);
          const contentAst = typeof r.contentAst === 'string' ? JSON.parse(r.contentAst) : r.contentAst;
          return {
            id: r.id,
            threadId: r.threadId,
            parentId: r.parentId || null,
            path: r.path,
            depth: Number(r.depth),
            hasChildren: childCount > 0,
            childCount,
            isCollapsed: Boolean(r.isCollapsed),
            visible: true,
            author: {
              id: r.authorId,
              username: r.authorUsername,
              avatarUrl: r.authorAvatarUrl || null,
              karmaScore: Number(r.authorKarma) || 0,
            },
            contentAst,
            upvotes: Number(r.upvotes),
            downvotes: Number(r.downvotes),
            netScore: Number(r.netScore),
            userVoteDirection: (r.userVoteDirection === 1 || r.userVoteDirection === -1
              ? r.userVoteDirection
              : null) as 1 | -1 | null,
            createdAt: new Date(r.createdAt).toISOString(),
            updatedAt: new Date(r.updatedAt).toISOString(),
          };
        });
      },
      () => this.fallbackStore.listComments(threadId, userId),
    );
  }

  public async createComment(input: {
    threadId: string;
    parentId?: string | null;
    contentAst: ContentAST;
    authorId: string;
    authorUsername: string;
    authorAvatarUrl?: string | null;
    karmaScore?: number;
  }): Promise<FlatCommentItem> {
    return this.executeWithFallback(
      async (client) => {
        let parentPath: string | null = null;
        let siblingsCount = 0;

        if (input.parentId) {
          const pRes = await client.query('SELECT path::text FROM comments WHERE id = $1', [input.parentId]);
          if (pRes.rows.length === 0) {
            throw new Error(`Bình luận cha không tồn tại (parentId: ${input.parentId})`);
          }
          parentPath = pRes.rows[0].path;
          const sRes = await client.query('SELECT COUNT(*)::int AS count FROM comments WHERE parent_id = $1', [input.parentId]);
          siblingsCount = Number(sRes.rows[0].count);
        } else {
          const sRes = await client.query('SELECT COUNT(*)::int AS count FROM comments WHERE thread_id = $1 AND parent_id IS NULL', [input.threadId]);
          siblingsCount = Number(sRes.rows[0].count);
        }

        const pathGen = LtreePathGenerator.generateNextPath(parentPath, siblingsCount);

        const insertQuery = `
          INSERT INTO comments (thread_id, parent_id, author_id, content_ast, path, depth, upvotes, downvotes, net_score)
          VALUES ($1, $2, $3, $4, $5::ltree, $6, 1, 0, 1)
          RETURNING id, thread_id AS "threadId", parent_id AS "parentId", path::text AS path, depth, upvotes, downvotes, net_score AS "netScore", created_at AS "createdAt", updated_at AS "updatedAt"
        `;

        const res = await client.query(insertQuery, [
          input.threadId,
          input.parentId || null,
          input.authorId,
          JSON.stringify(input.contentAst),
          pathGen.path,
          pathGen.depth,
        ]);
        const r = res.rows[0];

        // Increment thread counter comment_count
        await client.query('UPDATE thread_counters SET comment_count = comment_count + 1 WHERE thread_id = $1', [input.threadId]);

        // Auto-vote up
        await client.query(
          `INSERT INTO votes (user_id, target_id, target_type, direction) VALUES ($1, $2, 'COMMENT', 1) ON CONFLICT DO NOTHING`,
          [input.authorId, r.id],
        );

        return {
          id: r.id,
          threadId: r.threadId,
          parentId: r.parentId || null,
          path: r.path,
          depth: Number(r.depth),
          hasChildren: false,
          childCount: 0,
          isCollapsed: false,
          visible: true,
          author: {
            id: input.authorId,
            username: input.authorUsername,
            avatarUrl: input.authorAvatarUrl || null,
            karmaScore: input.karmaScore ?? 0,
          },
          contentAst: input.contentAst,
          upvotes: 1,
          downvotes: 0,
          netScore: 1,
          userVoteDirection: 1,
          createdAt: new Date(r.createdAt).toISOString(),
          updatedAt: new Date(r.updatedAt).toISOString(),
        };
      },
      () => this.fallbackStore.createComment(input),
    );
  }

  public async deleteComment(
    id: string,
    requesterId: string,
    isAdminOrMod: boolean,
  ): Promise<boolean> {
    return this.executeWithFallback(
      async (client) => {
        const check = await client.query('SELECT author_id, thread_id FROM comments WHERE id = $1', [id]);
        if (check.rows.length === 0) return false;
        if (check.rows[0].author_id !== requesterId && !isAdminOrMod) {
          throw new Error('Bạn không có quyền xóa bình luận này');
        }
        await client.query('UPDATE comments SET is_deleted = TRUE, updated_at = NOW() WHERE id = $1', [id]);
        await client.query('UPDATE thread_counters SET comment_count = GREATEST(0, comment_count - 1) WHERE thread_id = $1', [check.rows[0].thread_id]);
        return true;
      },
      () => this.fallbackStore.deleteComment(id, requesterId, isAdminOrMod),
    );
  }

  // --- VOTES ---
  public async voteThread(
    threadId: string,
    userId: string,
    direction: 1 | -1,
  ): Promise<{ upvotes: number; downvotes: number; netScore: number; userVote: 1 | -1 | null }> {
    return this.executeWithFallback(
      async (client) => {
        // Kiểm tra vote hiện tại
        const vRes = await client.query(
          `SELECT direction FROM votes WHERE user_id = $1 AND target_id = $2 AND target_type = 'THREAD'`,
          [userId, threadId],
        );

        let finalDirection: 1 | -1 | null = null;
        let upDelta = 0;
        let downDelta = 0;

        if (vRes.rows.length > 0) {
          const currentDir = vRes.rows[0].direction;
          if (currentDir === direction) {
            // Unvote
            await client.query(`DELETE FROM votes WHERE user_id = $1 AND target_id = $2 AND target_type = 'THREAD'`, [userId, threadId]);
            if (direction === 1) upDelta = -1;
            else downDelta = -1;
            finalDirection = null;
          } else {
            // Reverse direction
            await client.query(`UPDATE votes SET direction = $3 WHERE user_id = $1 AND target_id = $2 AND target_type = 'THREAD'`, [userId, threadId, direction]);
            if (direction === 1) {
              upDelta = 1;
              downDelta = -1;
            } else {
              upDelta = -1;
              downDelta = 1;
            }
            finalDirection = direction;
          }
        } else {
          // New vote
          await client.query(
            `INSERT INTO votes (user_id, target_id, target_type, direction) VALUES ($1, $2, 'THREAD', $3)`,
            [userId, threadId, direction],
          );
          if (direction === 1) upDelta = 1;
          else downDelta = 1;
          finalDirection = direction;
        }

        const netDelta = upDelta - downDelta;
        const updateRes = await client.query(
          `UPDATE thread_counters 
           SET upvotes = GREATEST(0, upvotes + $2),
               downvotes = GREATEST(0, downvotes + $3),
               net_score = net_score + $4,
               updated_at = NOW()
           WHERE thread_id = $1
           RETURNING upvotes, downvotes, net_score AS "netScore"`,
          [threadId, upDelta, downDelta, netDelta],
        );

        const row = updateRes.rows[0] || { upvotes: 0, downvotes: 0, netScore: 0 };

        // Async recompute hot score
        client.query('SELECT created_at FROM threads WHERE id = $1', [threadId]).then((tRes) => {
          if (tRes.rows.length > 0) {
            const hot = GravityDecayEngine.computeHotScore(Number(row.netScore), new Date(tRes.rows[0].created_at));
            client.query('UPDATE thread_counters SET hot_score = $2 WHERE thread_id = $1', [threadId, hot]).catch(() => {});
          }
        }).catch(() => {});

        return {
          upvotes: Number(row.upvotes),
          downvotes: Number(row.downvotes),
          netScore: Number(row.netScore),
          userVote: finalDirection,
        };
      },
      () => this.fallbackStore.voteThread(threadId, userId, direction),
    );
  }

  public async voteComment(
    commentId: string,
    userId: string,
    direction: 1 | -1,
  ): Promise<{ upvotes: number; downvotes: number; netScore: number; userVote: 1 | -1 | null }> {
    return this.executeWithFallback(
      async (client) => {
        const vRes = await client.query(
          `SELECT direction FROM votes WHERE user_id = $1 AND target_id = $2 AND target_type = 'COMMENT'`,
          [userId, commentId],
        );

        let finalDirection: 1 | -1 | null = null;
        let upDelta = 0;
        let downDelta = 0;

        if (vRes.rows.length > 0) {
          const currentDir = vRes.rows[0].direction;
          if (currentDir === direction) {
            await client.query(`DELETE FROM votes WHERE user_id = $1 AND target_id = $2 AND target_type = 'COMMENT'`, [userId, commentId]);
            if (direction === 1) upDelta = -1;
            else downDelta = -1;
            finalDirection = null;
          } else {
            await client.query(`UPDATE votes SET direction = $3 WHERE user_id = $1 AND target_id = $2 AND target_type = 'COMMENT'`, [userId, commentId, direction]);
            if (direction === 1) {
              upDelta = 1;
              downDelta = -1;
            } else {
              upDelta = -1;
              downDelta = 1;
            }
            finalDirection = direction;
          }
        } else {
          await client.query(
            `INSERT INTO votes (user_id, target_id, target_type, direction) VALUES ($1, $2, 'COMMENT', $3)`,
            [userId, commentId, direction],
          );
          if (direction === 1) upDelta = 1;
          else downDelta = 1;
          finalDirection = direction;
        }

        const netDelta = upDelta - downDelta;
        const updateRes = await client.query(
          `UPDATE comments 
           SET upvotes = GREATEST(0, upvotes + $2),
               downvotes = GREATEST(0, downvotes + $3),
               net_score = net_score + $4,
               updated_at = NOW()
           WHERE id = $1
           RETURNING upvotes, downvotes, net_score AS "netScore"`,
          [commentId, upDelta, downDelta, netDelta],
        );

        const row = updateRes.rows[0] || { upvotes: 0, downvotes: 0, netScore: 0 };
        return {
          upvotes: Number(row.upvotes),
          downvotes: Number(row.downvotes),
          netScore: Number(row.netScore),
          userVote: finalDirection,
        };
      },
      () => this.fallbackStore.voteComment(commentId, userId, direction),
    );
  }
}
