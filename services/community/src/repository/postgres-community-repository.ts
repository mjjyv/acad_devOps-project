/**
 * @file postgres-community-repository.ts
 * @description PostgreSQL 16 Implementation for Spaces, Threads, and Comments (ltree GiST).
 */

import pg from 'pg';
import { CursorManager } from '../voting/cursor-manager.js';
import {
  type CommentEntity,
  type CreateFlairRepoData,
  DatabaseConnectionError,
  DuplicateFlairError,
  DuplicateSlugError,
  type FeedFilter,
  type ICommunityRepository,
  type SpaceEntity,
  type SpaceFlairEntity,
  type SpaceMembershipEntity,
  type ThreadCountersEntity,
  type ThreadEntity,
} from './community-repository.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(val: string): boolean {
  return UUID_REGEX.test(val);
}

export class PostgresCommunityRepository implements ICommunityRepository {
  public readonly handlesCountersViaDbTriggers = true;
  private pool: pg.Pool;

  constructor(poolOrConfig?: pg.Pool | { connectionString: string }) {
    if (poolOrConfig && 'query' in poolOrConfig) {
      this.pool = poolOrConfig;
    } else {
      const connectionString =
        (poolOrConfig as { connectionString?: string })?.connectionString ||
        process.env.DATABASE_URL ||
        'postgresql://postgres:postgres@localhost:5432/acad_dev?sslmode=disable';

      this.pool = new pg.Pool({
        connectionString,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });
    }

    this.pool.on('error', (err) => {
      console.error('[PostgresCommunityRepository] Lỗi kết nối Pool bất ngờ:', err);
    });
  }

  // --- Helpers for Mapping Rows ---

  private mapSpaceRow(row: Record<string, unknown>): SpaceEntity {
    return {
      id: String(row.id),
      name: String(row.name),
      slug: String(row.slug),
      description: (row.description as string | null) || null,
      iconUrl: (row.icon_url as string | null) || null,
      bannerUrl: (row.banner_url as string | null) || null,
      isPrivate: Boolean(row.is_private),
      rules: (row.rules as Array<{ title: string; description: string }>) || [],
      creatorId: String(row.creator_id),
      memberCount: parseInt(String(row.member_count ?? '0'), 10),
      threadCount: parseInt(String(row.thread_count ?? '0'), 10),
      createdAt: new Date(String(row.created_at)).toISOString(),
      updatedAt: new Date(String(row.updated_at)).toISOString(),
    };
  }

  private mapThreadRow(row: Record<string, unknown>): ThreadEntity {
    const rawContent = (row.content as string | null) || null;
    const rawSnippet = (row.content_snippet as string | null) || null;
    return {
      id: String(row.id),
      spaceId: String(row.space_id),
      authorId: String(row.author_id),
      flairId: (row.flair_id as string | null) || null,
      title: String(row.title),
      slug: String(row.slug),
      content: rawContent,
      contentSnippet: rawSnippet ?? (rawContent ? rawContent.slice(0, 220) : null),
      linkUrl: (row.link_url as string | null) || null,
      threadType: (row.thread_type as 'TEXT' | 'LINK' | 'MEDIA') || 'TEXT',
      upvotesCount: parseInt(String(row.c_upvotes ?? row.upvotes ?? row.upvotes_count ?? '0'), 10),
      downvotesCount: parseInt(
        String(row.c_downvotes ?? row.downvotes ?? row.downvotes_count ?? '0'),
        10,
      ),
      commentCount: parseInt(String(row.c_comment_count ?? row.comment_count ?? '0'), 10),
      isPinned: Boolean(row.is_pinned),
      isLocked: Boolean(row.is_locked),
      createdAt: new Date(String(row.created_at)).toISOString(),
      updatedAt: new Date(String(row.updated_at)).toISOString(),
      spaceSlug: (row.space_slug as string | null) || (row.spaceSlug as string | null) || undefined,
      spaceName: (row.space_name as string | null) || (row.spaceName as string | null) || undefined,
      spaceIsPrivate:
        row.space_is_private !== undefined ? Boolean(row.space_is_private) : undefined,
      authorUsername:
        (row.author_username as string | null) ||
        (row.authorUsername as string | null) ||
        undefined,
      authorAvatarUrl:
        (row.author_avatar_url as string | null) || (row.authorAvatarUrl as string | null) || null,
      flairName: (row.flair_name as string | null) || (row.flairName as string | null) || null,
      flairSlug: (row.flair_slug as string | null) || (row.flairSlug as string | null) || null,
      flairColorHex:
        (row.flair_color_hex as string | null) ||
        (row.flairColorHex as string | null) ||
        (row.flair_color as string | null) ||
        null,
      flairBackgroundHex:
        (row.flair_background_hex as string | null) ||
        (row.flairBackgroundHex as string | null) ||
        null,
    };
  }

  private mapCommentRow(row: Record<string, unknown>): CommentEntity {
    return {
      id: String(row.id),
      threadId: String(row.thread_id),
      authorId: String(row.author_id),
      parentId: (row.parent_id as string | null) || null,
      path: String(row.path),
      depth: parseInt(String(row.depth || '1'), 10),
      content: String(row.content),
      replyToUserId: (row.reply_to_user_id as string | null) || null,
      upvotesCount: parseInt(String(row.upvotes_count || '0'), 10),
      downvotesCount: parseInt(String(row.downvotes_count || '0'), 10),
      isDeleted: Boolean(row.is_deleted),
      createdAt: new Date(String(row.created_at)).toISOString(),
      updatedAt: new Date(String(row.updated_at)).toISOString(),
      authorUsername:
        (row.author_username as string | null) ||
        (row.authorUsername as string | null) ||
        undefined,
      authorAvatarUrl:
        (row.author_avatar_url as string | null) || (row.authorAvatarUrl as string | null) || null,
      authorKarmaScore: row.author_karma_score
        ? parseInt(String(row.author_karma_score), 10)
        : undefined,
      directRepliesCount: parseInt(String(row.direct_replies_count || '0'), 10),
      totalDescendantsCount: parseInt(String(row.total_descendants_count || '0'), 10),
    };
  }

  // --- Spaces Implementation ---

  public async createSpace(data: {
    name: string;
    slug: string;
    description?: string | null;
    iconUrl?: string | null;
    bannerUrl?: string | null;
    rules?: Array<{ title: string; description: string }>;
    creatorId: string;
    isPrivate?: boolean;
  }): Promise<SpaceEntity> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const query = `
        INSERT INTO spaces (name, slug, description, icon_url, banner_url, rules, creator_id, is_private, member_count)
        VALUES ($1, LOWER($2), $3, $4, $5, $6, $7, $8, 0)
        RETURNING *;
      `;
      const res = await client.query(query, [
        data.name,
        data.slug,
        data.description || null,
        data.iconUrl || null,
        data.bannerUrl || null,
        JSON.stringify(data.rules || []),
        data.creatorId,
        Boolean(data.isPrivate),
      ]);

      const space = this.mapSpaceRow(res.rows[0]);

      // Trigger trg_space_members_count tự động tăng member_count từ 0 -> 1 khi thêm CREATOR
      await client.query(
        `INSERT INTO space_memberships (space_id, user_id, role) VALUES ($1, $2, 'CREATOR');`,
        [space.id, data.creatorId],
      );
      space.memberCount = 1;

      await client.query('COMMIT');
      return space;
    } catch (err: unknown) {
      await client.query('ROLLBACK');
      const pgErr = err as { code?: string; detail?: string };
      if (pgErr.code === '23505') {
        throw new DuplicateSlugError(`Slug không gian "${data.slug}" đã được sử dụng`);
      }
      throw new DatabaseConnectionError(
        'Lỗi truy vấn cơ sở dữ liệu khi tạo không gian thảo luận',
        err,
      );
    } finally {
      client.release();
    }
  }

  public async findSpaceBySlug(slug: string): Promise<SpaceEntity | null> {
    try {
      const res = await this.pool.query(
        'SELECT * FROM spaces WHERE LOWER(slug) = LOWER($1) LIMIT 1;',
        [slug],
      );
      return res.rows[0] ? this.mapSpaceRow(res.rows[0]) : null;
    } catch (err) {
      throw new DatabaseConnectionError('Lỗi truy vấn tìm space theo slug', err);
    }
  }

  public async findSpaceById(id: string): Promise<SpaceEntity | null> {
    if (!isUuid(id)) return null;
    try {
      const res = await this.pool.query('SELECT * FROM spaces WHERE id = $1 LIMIT 1;', [id]);
      return res.rows[0] ? this.mapSpaceRow(res.rows[0]) : null;
    } catch (err) {
      throw new DatabaseConnectionError('Lỗi truy vấn tìm space theo id', err);
    }
  }

  public async listSpaces(options?: { limit?: number; offset?: number }): Promise<SpaceEntity[]> {
    try {
      const limit = options?.limit || 20;
      const offset = options?.offset || 0;
      const res = await this.pool.query(
        'SELECT * FROM spaces ORDER BY member_count DESC, created_at DESC LIMIT $1 OFFSET $2;',
        [limit, offset],
      );
      return res.rows.map((r) => this.mapSpaceRow(r));
    } catch (err) {
      throw new DatabaseConnectionError('Lỗi danh sách spaces', err);
    }
  }

  public async joinSpace(
    spaceId: string,
    userId: string,
    role: 'MEMBER' | 'MODERATOR' | 'CREATOR' = 'MEMBER',
  ): Promise<void> {
    try {
      // Trigger trg_space_members_count tự động cộng +1 vào spaces.member_count
      await this.pool.query(
        `INSERT INTO space_memberships (space_id, user_id, role)
         VALUES ($1, $2, $3)
         ON CONFLICT (space_id, user_id) DO NOTHING;`,
        [spaceId, userId, role],
      );
    } catch (err) {
      throw new DatabaseConnectionError('Lỗi tham gia không gian', err);
    }
  }

  public async leaveSpace(spaceId: string, userId: string): Promise<void> {
    try {
      // Trigger trg_space_members_count tự động trừ -1 khỏi spaces.member_count
      await this.pool.query('DELETE FROM space_memberships WHERE space_id = $1 AND user_id = $2;', [
        spaceId,
        userId,
      ]);
    } catch (err) {
      throw new DatabaseConnectionError('Lỗi rời khỏi không gian', err);
    }
  }

  public async getMembership(
    spaceId: string,
    userId: string,
  ): Promise<SpaceMembershipEntity | null> {
    try {
      const res = await this.pool.query(
        'SELECT * FROM space_memberships WHERE space_id = $1 AND user_id = $2 LIMIT 1;',
        [spaceId, userId],
      );
      if (!res.rows[0]) return null;
      return {
        spaceId: String(res.rows[0].space_id),
        userId: String(res.rows[0].user_id),
        role: res.rows[0].role as 'MEMBER' | 'MODERATOR' | 'CREATOR',
        joinedAt: new Date(String(res.rows[0].joined_at)).toISOString(),
      };
    } catch (err) {
      throw new DatabaseConnectionError('Lỗi kiểm tra quyền thành viên', err);
    }
  }

  // --- Flairs Implementation ---

  public async createFlair(spaceId: string, data: CreateFlairRepoData): Promise<SpaceFlairEntity> {
    try {
      const slugLower = data.slug.toLowerCase();
      const res = await this.pool.query(
        `INSERT INTO space_flairs (space_id, name, slug, color_hex, background_hex)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *;`,
        [
          spaceId,
          data.name,
          slugLower,
          data.colorHex ?? '#E1D9BC',
          data.backgroundHex ?? '#30364F',
        ],
      );
      const r = res.rows[0];
      return {
        id: String(r.id),
        spaceId: String(r.space_id),
        name: String(r.name),
        slug: String(r.slug),
        colorHex: String(r.color_hex),
        backgroundHex: String(r.background_hex),
        createdAt: new Date(String(r.created_at)).toISOString(),
      };
    } catch (err: unknown) {
      const pgErr = err as { code?: string };
      if (pgErr.code === '23505') {
        throw new DuplicateFlairError(`Flair "${data.name}" đã tồn tại trong không gian này`);
      }
      throw new DatabaseConnectionError('Lỗi tạo Flair', err);
    }
  }

  public async listFlairs(spaceId: string): Promise<SpaceFlairEntity[]> {
    try {
      const res = await this.pool.query(
        'SELECT * FROM space_flairs WHERE space_id = $1 ORDER BY name ASC;',
        [spaceId],
      );
      return res.rows.map((r) => ({
        id: String(r.id),
        spaceId: String(r.space_id),
        name: String(r.name),
        slug: String(r.slug),
        colorHex: String(r.color_hex),
        backgroundHex: String(r.background_hex),
        createdAt: new Date(String(r.created_at)).toISOString(),
      }));
    } catch (err) {
      throw new DatabaseConnectionError('Lỗi lấy danh sách Flairs', err);
    }
  }

  private static readonly THREAD_SELECT_FIELDS = `
    t.*,
    LEFT(t.content, 220) AS content_snippet,
    tc.upvotes AS c_upvotes,
    tc.downvotes AS c_downvotes,
    tc.comment_count AS c_comment_count,
    tc.net_score AS c_net_score,
    s.slug AS space_slug,
    s.name AS space_name,
    s.is_private AS space_is_private,
    u.username AS author_username,
    u.avatar_url AS author_avatar_url,
    f.name AS flair_name,
    f.slug AS flair_slug,
    f.color_hex AS flair_color_hex,
    f.background_hex AS flair_background_hex
  `;

  private static readonly THREAD_FROM_JOINS = `
    FROM threads t
    LEFT JOIN thread_counters tc ON t.id = tc.thread_id
    LEFT JOIN spaces s ON t.space_id = s.id
    LEFT JOIN users u ON t.author_id = u.id
    LEFT JOIN space_flairs f ON t.flair_id = f.id
  `;

  // --- Threads Implementation ---

  public async createThread(data: {
    spaceId: string;
    authorId: string;
    flairId?: string | null;
    title: string;
    slug: string;
    content?: string | null;
    linkUrl?: string | null;
    threadType?: 'TEXT' | 'LINK' | 'MEDIA';
  }): Promise<ThreadEntity> {
    try {
      // Triggers trg_threads_counter_maintenance & trg_init_thread_counters tự động cộng đếm và khởi tạo thread_counters
      const res = await this.pool.query(
        `INSERT INTO threads (space_id, author_id, flair_id, title, slug, content, link_url, thread_type)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id;`,
        [
          data.spaceId,
          data.authorId,
          data.flairId || null,
          data.title,
          data.slug,
          data.content || null,
          data.linkUrl || null,
          data.threadType || 'TEXT',
        ],
      );
      const createdId = String(res.rows[0].id);
      const fullThread = await this.findThreadById(createdId);
      if (!fullThread) {
        throw new DatabaseConnectionError('Không thể đọc lại bài viết sau khi tạo');
      }
      return fullThread;
    } catch (err) {
      throw new DatabaseConnectionError('Lỗi tạo bài viết', err);
    }
  }

  public async findThreadById(id: string): Promise<ThreadEntity | null> {
    if (!isUuid(id)) return null;
    try {
      const res = await this.pool.query(
        `SELECT ${PostgresCommunityRepository.THREAD_SELECT_FIELDS}
         ${PostgresCommunityRepository.THREAD_FROM_JOINS}
         WHERE t.id = $1 LIMIT 1;`,
        [id],
      );
      return res.rows[0] ? this.mapThreadRow(res.rows[0]) : null;
    } catch (err) {
      throw new DatabaseConnectionError('Lỗi tìm thread theo id', err);
    }
  }

  public async findThreadBySlug(slug: string): Promise<ThreadEntity | null> {
    try {
      const res = await this.pool.query(
        `SELECT ${PostgresCommunityRepository.THREAD_SELECT_FIELDS}
         ${PostgresCommunityRepository.THREAD_FROM_JOINS}
         WHERE t.slug = $1 LIMIT 1;`,
        [slug],
      );
      return res.rows[0] ? this.mapThreadRow(res.rows[0]) : null;
    } catch (err) {
      throw new DatabaseConnectionError('Lỗi tìm thread theo slug', err);
    }
  }

  public async listThreadsBySpace(
    spaceId: string,
    options?:
      | { flairId?: string | undefined; limit?: number | undefined; offset?: number | undefined }
      | undefined,
  ): Promise<ThreadEntity[]> {
    try {
      const limit = options?.limit || 20;
      const offset = options?.offset || 0;
      const params: unknown[] = [spaceId];
      let flairCondition = '';

      if (options?.flairId) {
        params.push(options.flairId);
        flairCondition = ` AND t.flair_id = $${params.length}`;
      }

      params.push(limit, offset);
      const query = `
        SELECT ${PostgresCommunityRepository.THREAD_SELECT_FIELDS}
        ${PostgresCommunityRepository.THREAD_FROM_JOINS}
        WHERE t.space_id = $1 ${flairCondition}
        ORDER BY t.is_pinned DESC, t.created_at DESC
        LIMIT $${params.length - 1} OFFSET $${params.length};
      `;

      const res = await this.pool.query(query, params);
      return res.rows.map((r) => this.mapThreadRow(r));
    } catch (err) {
      throw new DatabaseConnectionError('Lỗi lấy danh sách bài viết trong space', err);
    }
  }

  public async searchThreadsInSpace(
    spaceId: string,
    query: string,
    limit = 20,
  ): Promise<ThreadEntity[]> {
    try {
      const res = await this.pool.query(
        `SELECT ${PostgresCommunityRepository.THREAD_SELECT_FIELDS}
         ${PostgresCommunityRepository.THREAD_FROM_JOINS}
         WHERE t.space_id = $1 AND t.title ILIKE $2
         ORDER BY t.created_at DESC
         LIMIT $3;`,
        [spaceId, `%${query}%`, limit],
      );
      return res.rows.map((r) => this.mapThreadRow(r));
    } catch (err) {
      throw new DatabaseConnectionError('Lỗi tìm kiếm bài viết trong space', err);
    }
  }

  // --- Comments Implementation (ltree) ---

  public async createComment(data: {
    threadId: string;
    authorId: string;
    parentId?: string | null;
    path: string;
    depth: number;
    content: string;
    replyToUserId?: string | null;
  }): Promise<CommentEntity> {
    try {
      // Triggers trg_comments_counter_maintenance & trg_sync_comment_counter tự động đồng bộ comment_count
      const res = await this.pool.query(
        `WITH inserted AS (
           INSERT INTO comments (thread_id, author_id, parent_id, path, depth, content, reply_to_user_id)
           VALUES ($1, $2, $3, text2ltree($4), $5, $6, $7)
           RETURNING *
         )
         SELECT i.*,
                u.username AS author_username,
                u.avatar_url AS author_avatar_url,
                u.karma_score AS author_karma_score,
                0 AS direct_replies_count,
                0 AS total_descendants_count
         FROM inserted i
         LEFT JOIN users u ON i.author_id = u.id;`,
        [
          data.threadId,
          data.authorId,
          data.parentId || null,
          data.path,
          data.depth,
          data.content,
          data.replyToUserId || null,
        ],
      );
      return this.mapCommentRow(res.rows[0]);
    } catch (err) {
      throw new DatabaseConnectionError('Lỗi tạo bình luận', err);
    }
  }

  public async findCommentById(id: string): Promise<CommentEntity | null> {
    if (!isUuid(id)) return null;
    try {
      const res = await this.pool.query('SELECT * FROM comments WHERE id = $1 LIMIT 1;', [id]);
      return res.rows[0] ? this.mapCommentRow(res.rows[0]) : null;
    } catch (err) {
      throw new DatabaseConnectionError('Lỗi tìm bình luận theo id', err);
    }
  }

  public async listCommentsByThread(threadId: string): Promise<CommentEntity[]> {
    try {
      // 1 câu truy vấn duy nhất JOIN users và đếm số reply con đệ quy qua ltree GiST index
      // Khi chạm ngưỡng depth 8, chỉ đếm các hậu duệ thực sự có depth > c.depth hoặc parent_id = c.id
      const res = await this.pool.query(
        `SELECT c.*,
                u.username AS author_username,
                u.avatar_url AS author_avatar_url,
                u.karma_score AS author_karma_score,
                (SELECT COUNT(*) FROM comments r WHERE r.parent_id = c.id) AS direct_replies_count,
                (SELECT COUNT(*) FROM comments d
                 WHERE d.thread_id = c.thread_id
                   AND d.id <> c.id
                   AND ((d.path <@ c.path AND d.depth > c.depth) OR d.parent_id = c.id)
                ) AS total_descendants_count
         FROM comments c
         LEFT JOIN users u ON c.author_id = u.id
         WHERE c.thread_id = $1
         ORDER BY c.path ASC;`,
        [threadId],
      );
      return res.rows.map((r) => this.mapCommentRow(r));
    } catch (err) {
      throw new DatabaseConnectionError('Lỗi lấy cây bình luận ltree', err);
    }
  }

  public async countChildrenByParent(threadId: string, parentId?: string | null): Promise<number> {
    try {
      if (!parentId) {
        const res = await this.pool.query(
          'SELECT COUNT(*) FROM comments WHERE thread_id = $1 AND parent_id IS NULL;',
          [threadId],
        );
        return parseInt(String(res.rows[0].count), 10);
      }
      const res = await this.pool.query(
        'SELECT COUNT(*) FROM comments WHERE thread_id = $1 AND parent_id = $2;',
        [threadId, parentId],
      );
      return parseInt(String(res.rows[0].count), 10);
    } catch (err) {
      throw new DatabaseConnectionError('Lỗi đếm số bình luận con', err);
    }
  }

  public async softDeleteComment(commentId: string, _authorId: string): Promise<void> {
    try {
      await this.pool.query(
        `UPDATE comments
         SET is_deleted = TRUE,
             content = '[Bình luận đã bị xóa bởi tác giả]',
             updated_at = NOW()
         WHERE id = $1;`,
        [commentId],
      );
    } catch (err) {
      throw new DatabaseConnectionError('Lỗi xóa mềm bình luận', err);
    }
  }

  // Voting & Counters (Phase B3)
  public async upsertThreadCounters(counters: ThreadCountersEntity[]): Promise<void> {
    if (counters.length === 0) return;
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      for (const c of counters) {
        await client.query(
          `INSERT INTO thread_counters (thread_id, upvotes, downvotes, net_score, hot_score, wilson_score, comment_count, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
           ON CONFLICT (thread_id) DO UPDATE SET
             upvotes = EXCLUDED.upvotes,
             downvotes = EXCLUDED.downvotes,
             net_score = EXCLUDED.net_score,
             hot_score = EXCLUDED.hot_score,
             wilson_score = EXCLUDED.wilson_score,
             updated_at = NOW();`,
          [
            c.threadId,
            c.upvotes,
            c.downvotes,
            c.netScore,
            c.hotScore,
            c.wilsonScore,
            c.commentCount,
          ],
        );
        await client.query(
          'UPDATE threads SET upvotes_count = $1, downvotes_count = $2, updated_at = NOW() WHERE id = $3;',
          [c.upvotes, c.downvotes, c.threadId],
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw new DatabaseConnectionError('Lỗi cập nhật bộ đếm thread_counters', err);
    } finally {
      client.release();
    }
  }

  public async getThreadCounters(threadId: string): Promise<ThreadCountersEntity | null> {
    try {
      const res = await this.pool.query(
        'SELECT * FROM thread_counters WHERE thread_id = $1 LIMIT 1;',
        [threadId],
      );
      if (!res.rows[0]) return null;
      const r = res.rows[0];
      return {
        threadId: String(r.thread_id),
        upvotes: parseInt(String(r.upvotes), 10),
        downvotes: parseInt(String(r.downvotes), 10),
        netScore: parseInt(String(r.net_score), 10),
        hotScore: parseFloat(String(r.hot_score)),
        wilsonScore: parseFloat(String(r.wilson_score)),
        commentCount: parseInt(String(r.comment_count), 10),
        updatedAt: new Date(String(r.updated_at)),
      };
    } catch (err) {
      throw new DatabaseConnectionError('Lỗi truy vấn bộ đếm thread_counters', err);
    }
  }

  public async recordVote(
    targetId: string,
    targetType: 'THREAD' | 'COMMENT',
    userId: string,
    direction: number,
  ): Promise<void> {
    const table = targetType === 'THREAD' ? 'thread_votes' : 'comment_votes';
    const idColumn = targetType === 'THREAD' ? 'thread_id' : 'comment_id';
    try {
      if (direction === 0) {
        await this.pool.query(`DELETE FROM ${table} WHERE ${idColumn} = $1 AND user_id = $2;`, [
          targetId,
          userId,
        ]);
      } else {
        await this.pool.query(
          `INSERT INTO ${table} (${idColumn}, user_id, direction, updated_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (${idColumn}, user_id) DO UPDATE SET direction = EXCLUDED.direction, updated_at = NOW();`,
          [targetId, userId, direction],
        );
      }
    } catch (err) {
      throw new DatabaseConnectionError(`Lỗi ghi nhận biểu quyết trên ${table}`, err);
    }
  }

  public async getUserVote(
    targetId: string,
    targetType: 'THREAD' | 'COMMENT',
    userId: string,
  ): Promise<number> {
    const table = targetType === 'THREAD' ? 'thread_votes' : 'comment_votes';
    const idColumn = targetType === 'THREAD' ? 'thread_id' : 'comment_id';
    try {
      const res = await this.pool.query(
        `SELECT direction FROM ${table} WHERE ${idColumn} = $1 AND user_id = $2 LIMIT 1;`,
        [targetId, userId],
      );
      return res.rows[0] ? parseInt(String(res.rows[0].direction), 10) : 0;
    } catch (err) {
      throw new DatabaseConnectionError(`Lỗi truy vấn biểu quyết từ ${table}`, err);
    }
  }

  public async getUserCommentVotes(
    threadId: string,
    userId: string,
  ): Promise<Record<string, number>> {
    try {
      const res = await this.pool.query(
        `SELECT cv.comment_id, cv.direction
         FROM comment_votes cv
         INNER JOIN comments c ON cv.comment_id = c.id
         WHERE c.thread_id = $1 AND cv.user_id = $2;`,
        [threadId, userId],
      );
      const map: Record<string, number> = {};
      for (const row of res.rows) {
        map[String(row.comment_id)] = parseInt(String(row.direction), 10);
      }
      return map;
    } catch (err) {
      throw new DatabaseConnectionError('Lỗi truy vấn danh sách vote bình luận', err);
    }
  }

  public async toggleSaveThread(userId: string, threadId: string): Promise<boolean> {
    try {
      const check = await this.pool.query(
        'SELECT 1 FROM user_saved_threads WHERE user_id = $1 AND thread_id = $2 LIMIT 1;',
        [userId, threadId],
      );
      if (check.rows.length > 0) {
        await this.pool.query(
          'DELETE FROM user_saved_threads WHERE user_id = $1 AND thread_id = $2;',
          [userId, threadId],
        );
        return false;
      }
      await this.pool.query(
        'INSERT INTO user_saved_threads (user_id, thread_id) VALUES ($1, $2) ON CONFLICT DO NOTHING;',
        [userId, threadId],
      );
      return true;
    } catch (err) {
      throw new DatabaseConnectionError('Lỗi cập nhật đánh dấu lưu bài viết', err);
    }
  }

  public async isThreadSaved(userId: string, threadId: string): Promise<boolean> {
    try {
      const res = await this.pool.query(
        'SELECT 1 FROM user_saved_threads WHERE user_id = $1 AND thread_id = $2 LIMIT 1;',
        [userId, threadId],
      );
      return (res.rowCount ?? 0) > 0;
    } catch (err) {
      throw new DatabaseConnectionError('Lỗi kiểm tra bài viết đã lưu', err);
    }
  }

  public async listSavedThreads(
    userId: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<ThreadEntity[]> {
    try {
      const res = await this.pool.query(
        `SELECT ${PostgresCommunityRepository.THREAD_SELECT_FIELDS}
         FROM threads t
         INNER JOIN user_saved_threads s_user ON s_user.thread_id = t.id
         LEFT JOIN thread_counters tc ON t.id = tc.thread_id
         LEFT JOIN spaces s ON t.space_id = s.id
         LEFT JOIN users u ON t.author_id = u.id
         LEFT JOIN space_flairs f ON t.flair_id = f.id
         WHERE s_user.user_id = $1
         ORDER BY s_user.created_at DESC
         LIMIT $2 OFFSET $3;`,
        [userId, limit, offset],
      );
      return res.rows.map((r) => this.mapThreadRow(r));
    } catch (err) {
      throw new DatabaseConnectionError('Lỗi lấy danh sách bài viết đã lưu', err);
    }
  }

  public async updateUserKarma(userId: string, delta: number): Promise<void> {
    try {
      await this.pool.query(
        'UPDATE users SET karma_score = karma_score + $1, updated_at = NOW() WHERE id = $2;',
        [delta, userId],
      );
    } catch (err) {
      throw new DatabaseConnectionError('Lỗi cập nhật karma_score người dùng', err);
    }
  }

  public async refreshHotScores(): Promise<void> {
    try {
      await this.pool.query(
        `UPDATE thread_counters
         SET hot_score = calculate_hot_score(net_score, created_at),
             updated_at = NOW()
         WHERE created_at >= NOW() - INTERVAL '30 days';`,
      );
    } catch (err) {
      throw new DatabaseConnectionError('Lỗi làm mới hot_score theo phân rã thời gian', err);
    }
  }

  // Feeds Implementation
  public async listHomeFeedThreads(
    userId: string,
    options?: FeedFilter,
  ): Promise<{ items: ThreadEntity[]; nextCursor: string | null }> {
    try {
      const memberships = await this.pool.query(
        'SELECT space_id FROM space_memberships WHERE user_id = $1;',
        [userId],
      );
      const joinedSpaceIds = memberships.rows.map((r) => String(r.space_id));
      if (joinedSpaceIds.length === 0) {
        return { items: [], nextCursor: null };
      }
      return this.fetchFeedsWithCursor(options, joinedSpaceIds, false, userId);
    } catch (err) {
      throw new DatabaseConnectionError('Lỗi truy vấn Home Feed', err);
    }
  }

  public async listPopularFeedThreads(
    options?: FeedFilter,
  ): Promise<{ items: ThreadEntity[]; nextCursor: string | null }> {
    try {
      return this.fetchFeedsWithCursor(options, undefined, true);
    } catch (err) {
      throw new DatabaseConnectionError('Lỗi truy vấn Popular Feed', err);
    }
  }

  public async listSpaceFeedThreads(
    spaceId: string,
    options?: FeedFilter,
  ): Promise<{ items: ThreadEntity[]; nextCursor: string | null }> {
    try {
      return this.fetchFeedsWithCursor(options, [spaceId], false);
    } catch (err) {
      throw new DatabaseConnectionError('Lỗi truy vấn Space Feed', err);
    }
  }

  private async fetchFeedsWithCursor(
    options?: FeedFilter,
    spaceIds?: string[],
    excludePrivate = false,
    viewerId?: string,
  ): Promise<{ items: ThreadEntity[]; nextCursor: string | null }> {
    const sort = options?.sort ?? 'hot';
    const time = options?.time ?? 'all';
    const limit = Math.min(Math.max(options?.limit ?? 20, 1), 50);

    let scoreExpression =
      'calculate_hot_score(COALESCE(tc.net_score, (t.upvotes_count - t.downvotes_count)), COALESCE(tc.created_at, t.created_at))::numeric';
    if (sort === 'top') {
      scoreExpression = '(COALESCE(tc.net_score, (t.upvotes_count - t.downvotes_count)))::numeric';
    } else if (sort === 'best') {
      scoreExpression =
        'COALESCE(tc.wilson_score, calculate_wilson_score(t.upvotes_count, t.downvotes_count))::numeric';
    } else if (sort === 'new') {
      scoreExpression = 'FLOOR(EXTRACT(EPOCH FROM t.created_at) * 1000)::numeric';
    }

    const params: unknown[] = [];
    const whereClauses: string[] = ['1=1'];

    if (excludePrivate) {
      whereClauses.push('COALESCE(s.is_private, FALSE) = FALSE');
    }

    if (viewerId && isUuid(viewerId)) {
      params.push(viewerId);
      whereClauses.push(
        `(COALESCE(u.status::text, 'ACTIVE') <> 'SHADOWBANNED' OR t.author_id = $${params.length})`,
      );
    } else {
      whereClauses.push("COALESCE(u.status::text, 'ACTIVE') <> 'SHADOWBANNED'");
    }

    if (spaceIds && spaceIds.length > 0) {
      params.push(spaceIds);
      whereClauses.push(`t.space_id = ANY($${params.length})`);
    }

    if (options?.flairId && isUuid(options.flairId)) {
      params.push(options.flairId);
      whereClauses.push(`t.flair_id = $${params.length}`);
    }

    if (sort === 'top' && time !== 'all') {
      const windowIntervals: Record<string, string> = {
        day: '1 day',
        week: '7 days',
        month: '30 days',
        year: '365 days',
      };
      const interval = windowIntervals[time] ?? '1 day';
      whereClauses.push(`t.created_at >= NOW() - INTERVAL '${interval}'`);
    }

    const decoded = options?.cursor ? CursorManager.decode(options.cursor) : null;
    const baseCte = `
      WITH scored AS (
        SELECT ${PostgresCommunityRepository.THREAD_SELECT_FIELDS},
               ${scoreExpression} AS computed_score,
               FLOOR(EXTRACT(EPOCH FROM t.created_at) * 1000)::bigint AS created_at_ms
        ${PostgresCommunityRepository.THREAD_FROM_JOINS}
        WHERE ${whereClauses.join(' AND ')}
      )
    `;

    let query = '';
    if (decoded && isUuid(decoded.id)) {
      params.push(decoded.id);
      const cursorIdParamIndex = params.length;
      params.push(decoded.score);
      const cursorScoreParamIndex = params.length;
      params.push(decoded.createdAtMs);
      const cursorTimeParamIndex = params.length;
      params.push(limit + 1);
      const limitParamIndex = params.length;

      query = `
        ${baseCte},
        cursor_ref AS (
          SELECT computed_score, created_at_ms, id
          FROM scored
          WHERE id = $${cursorIdParamIndex}
          UNION ALL
          SELECT $${cursorScoreParamIndex}::numeric AS computed_score, $${cursorTimeParamIndex}::bigint AS created_at_ms, $${cursorIdParamIndex}::uuid AS id
          LIMIT 1
        )
        SELECT s.*
        FROM scored s, cursor_ref c
        WHERE (s.computed_score < c.computed_score)
           OR (s.computed_score = c.computed_score AND s.created_at_ms < c.created_at_ms)
           OR (s.computed_score = c.computed_score AND s.created_at_ms = c.created_at_ms AND s.id < c.id)
        ORDER BY s.computed_score DESC, s.created_at_ms DESC, s.id DESC
        LIMIT $${limitParamIndex};
      `;
    } else {
      params.push(limit + 1);
      const limitParamIndex = params.length;

      query = `
        ${baseCte}
        SELECT s.*
        FROM scored s
        ORDER BY s.computed_score DESC, s.created_at_ms DESC, s.id DESC
        LIMIT $${limitParamIndex};
      `;
    }

    const res = await this.pool.query(query, params);
    const hasMore = res.rows.length > limit;
    const pageRows = hasMore ? res.rows.slice(0, limit) : res.rows;
    const items = pageRows.map((r) => this.mapThreadRow(r));

    let nextCursor: string | null = null;
    if (hasMore && pageRows.length > 0) {
      const lastRow = pageRows[pageRows.length - 1];
      const score = parseFloat(String(lastRow.computed_score));
      const createdAtMs = parseInt(String(lastRow.created_at_ms), 10);
      const id = String(lastRow.id);
      nextCursor = CursorManager.encode(score, createdAtMs, id);
    }

    return {
      items,
      nextCursor,
    };
  }

  public async checkHealth(): Promise<boolean> {
    try {
      const res = await this.pool.query('SELECT 1;');
      return (res.rowCount ?? 0) > 0;
    } catch {
      return false;
    }
  }

  public async close(): Promise<void> {
    await this.pool.end();
  }
}
