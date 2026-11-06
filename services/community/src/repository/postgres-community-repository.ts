/**
 * @file postgres-community-repository.ts
 * @description PostgreSQL 16 Implementation for Spaces, Threads, and Comments (ltree GiST).
 */

import pg from 'pg';
import { CursorManager } from '../voting/cursor-manager.js';
import { GravityDecayEngine } from '../voting/gravity-decay.js';
import { WilsonScoreEngine } from '../voting/wilson-score.js';
import {
  type CommentEntity,
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
      avatarUrl: (row.avatar_url as string | null) || null,
      bannerUrl: (row.banner_url as string | null) || null,
      rules: (row.rules as Array<{ title: string; description: string }>) || [],
      creatorId: String(row.creator_id),
      memberCount: parseInt(String(row.member_count || '1'), 10),
      threadCount: parseInt(String(row.thread_count || '0'), 10),
      createdAt: new Date(String(row.created_at)).toISOString(),
      updatedAt: new Date(String(row.updated_at)).toISOString(),
    };
  }

  private mapThreadRow(row: Record<string, unknown>): ThreadEntity {
    return {
      id: String(row.id),
      spaceId: String(row.space_id),
      authorId: String(row.author_id),
      flairId: (row.flair_id as string | null) || null,
      title: String(row.title),
      slug: String(row.slug),
      content: (row.content as string | null) || null,
      linkUrl: (row.link_url as string | null) || null,
      threadType: (row.thread_type as 'TEXT' | 'LINK' | 'MEDIA') || 'TEXT',
      upvotesCount: parseInt(String(row.upvotes_count || '0'), 10),
      downvotesCount: parseInt(String(row.downvotes_count || '0'), 10),
      commentCount: parseInt(String(row.comment_count || '0'), 10),
      isPinned: Boolean(row.is_pinned),
      isLocked: Boolean(row.is_locked),
      createdAt: new Date(String(row.created_at)).toISOString(),
      updatedAt: new Date(String(row.updated_at)).toISOString(),
      spaceSlug: (row.space_slug as string | null) || (row.spaceSlug as string | null) || undefined,
      spaceName: (row.space_name as string | null) || (row.spaceName as string | null) || undefined,
      authorUsername:
        (row.author_username as string | null) ||
        (row.authorUsername as string | null) ||
        undefined,
      authorAvatarUrl:
        (row.author_avatar_url as string | null) || (row.authorAvatarUrl as string | null) || null,
      flairName: (row.flair_name as string | null) || (row.flairName as string | null) || null,
      flairColor: (row.flair_color as string | null) || (row.flairColor as string | null) || null,
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
        (row.author_username as string | null) || (row.authorUsername as string | null) || undefined,
      authorAvatarUrl:
        (row.author_avatar_url as string | null) || (row.authorAvatarUrl as string | null) || null,
      authorKarmaScore: row.author_karma_score
        ? parseInt(String(row.author_karma_score), 10)
        : undefined,
    };
  }

  // --- Spaces Implementation ---

  public async createSpace(data: {
    name: string;
    slug: string;
    description?: string | null;
    avatarUrl?: string | null;
    bannerUrl?: string | null;
    rules?: Array<{ title: string; description: string }>;
    creatorId: string;
  }): Promise<SpaceEntity> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const query = `
        INSERT INTO spaces (name, slug, description, avatar_url, banner_url, rules, creator_id, member_count)
        VALUES ($1, LOWER($2), $3, $4, $5, $6, $7, 1)
        RETURNING *;
      `;
      const res = await client.query(query, [
        data.name,
        data.slug,
        data.description || null,
        data.avatarUrl || null,
        data.bannerUrl || null,
        JSON.stringify(data.rules || []),
        data.creatorId,
      ]);

      const space = this.mapSpaceRow(res.rows[0]);

      // Tự động gán quyền CREATOR cho người lập
      await client.query(
        `INSERT INTO space_memberships (space_id, user_id, role) VALUES ($1, $2, 'CREATOR');`,
        [space.id, data.creatorId],
      );

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
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const insertRes = await client.query(
        `INSERT INTO space_memberships (space_id, user_id, role)
         VALUES ($1, $2, $3)
         ON CONFLICT (space_id, user_id) DO NOTHING;`,
        [spaceId, userId, role],
      );

      if ((insertRes.rowCount ?? 0) > 0 && role !== 'CREATOR') {
        await client.query('UPDATE spaces SET member_count = member_count + 1 WHERE id = $1;', [
          spaceId,
        ]);
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw new DatabaseConnectionError('Lỗi tham gia không gian', err);
    } finally {
      client.release();
    }
  }

  public async leaveSpace(spaceId: string, userId: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const delRes = await client.query(
        'DELETE FROM space_memberships WHERE space_id = $1 AND user_id = $2;',
        [spaceId, userId],
      );

      if ((delRes.rowCount ?? 0) > 0) {
        await client.query(
          'UPDATE spaces SET member_count = GREATEST(1, member_count - 1) WHERE id = $1;',
          [spaceId],
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw new DatabaseConnectionError('Lỗi rời khỏi không gian', err);
    } finally {
      client.release();
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

  public async createFlair(
    spaceId: string,
    name: string,
    color: string = '#FF4500',
  ): Promise<SpaceFlairEntity> {
    try {
      const res = await this.pool.query(
        `INSERT INTO space_flairs (space_id, name, color)
         VALUES ($1, $2, $3)
         RETURNING *;`,
        [spaceId, name, color],
      );
      const r = res.rows[0];
      return {
        id: String(r.id),
        spaceId: String(r.space_id),
        name: String(r.name),
        color: String(r.color),
        createdAt: new Date(String(r.created_at)).toISOString(),
      };
    } catch (err: unknown) {
      const pgErr = err as { code?: string };
      if (pgErr.code === '23505') {
        throw new DuplicateFlairError(`Flair "${name}" đã tồn tại trong không gian này`);
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
        color: String(r.color),
        createdAt: new Date(String(r.created_at)).toISOString(),
      }));
    } catch (err) {
      throw new DatabaseConnectionError('Lỗi lấy danh sách Flairs', err);
    }
  }

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
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const res = await client.query(
        `INSERT INTO threads (space_id, author_id, flair_id, title, slug, content, link_url, thread_type)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *;`,
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

      await client.query('UPDATE spaces SET thread_count = thread_count + 1 WHERE id = $1;', [
        data.spaceId,
      ]);
      await client.query('COMMIT');
      return this.mapThreadRow(res.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      throw new DatabaseConnectionError('Lỗi tạo bài viết', err);
    } finally {
      client.release();
    }
  }

  public async findThreadById(id: string): Promise<ThreadEntity | null> {
    if (!isUuid(id)) return null;
    try {
      const res = await this.pool.query(
        `SELECT t.*,
                s.slug AS space_slug,
                s.name AS space_name,
                u.username AS author_username,
                u.avatar_url AS author_avatar_url,
                f.name AS flair_name,
                f.color AS flair_color
         FROM threads t
         LEFT JOIN spaces s ON t.space_id = s.id
         LEFT JOIN users u ON t.author_id = u.id
         LEFT JOIN space_flairs f ON t.flair_id = f.id
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
        `SELECT t.*,
                s.slug AS space_slug,
                s.name AS space_name,
                u.username AS author_username,
                u.avatar_url AS author_avatar_url,
                f.name AS flair_name,
                f.color AS flair_color
         FROM threads t
         LEFT JOIN spaces s ON t.space_id = s.id
         LEFT JOIN users u ON t.author_id = u.id
         LEFT JOIN space_flairs f ON t.flair_id = f.id
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
      let query = `
        SELECT t.*,
               s.slug AS space_slug,
               s.name AS space_name,
               u.username AS author_username,
               u.avatar_url AS author_avatar_url,
               f.name AS flair_name,
               f.color AS flair_color
        FROM threads t
        LEFT JOIN spaces s ON t.space_id = s.id
        LEFT JOIN users u ON t.author_id = u.id
        LEFT JOIN space_flairs f ON t.flair_id = f.id
        WHERE t.space_id = $1`;
      const params: unknown[] = [spaceId];

      if (options?.flairId) {
        query += ' AND t.flair_id = $2';
        params.push(options.flairId);
        query += ` ORDER BY t.is_pinned DESC, t.created_at DESC LIMIT $3 OFFSET $4;`;
        params.push(limit, offset);
      } else {
        query += ` ORDER BY t.is_pinned DESC, t.created_at DESC LIMIT $2 OFFSET $3;`;
        params.push(limit, offset);
      }

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
      // Sử dụng toán tử Trigram similarity hoặc ILIKE kết hợp GIN index
      const res = await this.pool.query(
        `SELECT t.*,
                s.slug AS space_slug,
                s.name AS space_name,
                u.username AS author_username,
                u.avatar_url AS author_avatar_url,
                f.name AS flair_name,
                f.color AS flair_color
         FROM threads t
         LEFT JOIN spaces s ON t.space_id = s.id
         LEFT JOIN users u ON t.author_id = u.id
         LEFT JOIN space_flairs f ON t.flair_id = f.id
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
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const res = await client.query(
        `INSERT INTO comments (thread_id, author_id, parent_id, path, depth, content, reply_to_user_id)
         VALUES ($1, $2, $3, text2ltree($4), $5, $6, $7)
         RETURNING *;`,
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

      await client.query('UPDATE threads SET comment_count = comment_count + 1 WHERE id = $1;', [
        data.threadId,
      ]);
      await client.query('COMMIT');
      return this.mapCommentRow(res.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      throw new DatabaseConnectionError('Lỗi tạo bình luận', err);
    } finally {
      client.release();
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
      // 1 câu truy vấn duy nhất JOIN users sắp xếp theo path ltree tăng dần: < 1.2ms qua GiST index
      const res = await this.pool.query(
        `SELECT c.*,
                u.username AS author_username,
                u.avatar_url AS author_avatar_url,
                u.karma_score AS author_karma_score
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
        `SELECT t.*,
                s.slug AS space_slug,
                s.name AS space_name,
                u.username AS author_username,
                u.avatar_url AS author_avatar_url,
                f.name AS flair_name,
                f.color AS flair_color
         FROM threads t
         INNER JOIN user_saved_threads s_user ON s_user.thread_id = t.id
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
      return this.fetchFeedsWithCursor(
        options,
        joinedSpaceIds.length > 0 ? joinedSpaceIds : undefined,
      );
    } catch (err) {
      throw new DatabaseConnectionError('Lỗi truy vấn Home Feed', err);
    }
  }

  public async listPopularFeedThreads(
    options?: FeedFilter,
  ): Promise<{ items: ThreadEntity[]; nextCursor: string | null }> {
    try {
      return this.fetchFeedsWithCursor(options);
    } catch (err) {
      throw new DatabaseConnectionError('Lỗi truy vấn Popular Feed', err);
    }
  }

  public async listSpaceFeedThreads(
    spaceId: string,
    options?: FeedFilter,
  ): Promise<{ items: ThreadEntity[]; nextCursor: string | null }> {
    try {
      return this.fetchFeedsWithCursor(options, [spaceId]);
    } catch (err) {
      throw new DatabaseConnectionError('Lỗi truy vấn Space Feed', err);
    }
  }

  private async fetchFeedsWithCursor(
    options?: FeedFilter,
    spaceIds?: string[],
  ): Promise<{ items: ThreadEntity[]; nextCursor: string | null }> {
    const sort = options?.sort ?? 'hot';
    const time = options?.time ?? 'all';
    const limit = options?.limit ?? 20;

    let sql = `
      SELECT t.*,
             s.slug AS space_slug,
             s.name AS space_name,
             u.username AS author_username,
             u.avatar_url AS author_avatar_url,
             f.name AS flair_name,
             f.color AS flair_color,
             COALESCE(tc.upvotes, t.upvotes_count) as c_upvotes,
             COALESCE(tc.downvotes, t.downvotes_count) as c_downvotes,
             COALESCE(tc.net_score, (t.upvotes_count - t.downvotes_count)) as c_net_score,
             COALESCE(tc.hot_score, 0) as c_hot_score,
             COALESCE(tc.wilson_score, 0) as c_wilson_score
      FROM threads t
      LEFT JOIN spaces s ON t.space_id = s.id
      LEFT JOIN users u ON t.author_id = u.id
      LEFT JOIN space_flairs f ON t.flair_id = f.id
      LEFT JOIN thread_counters tc ON tc.thread_id = t.id
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (spaceIds && spaceIds.length > 0) {
      params.push(spaceIds);
      sql += ` AND t.space_id = ANY($${params.length})`;
    }

    if (sort === 'top' && time !== 'all') {
      const windowIntervals: Record<string, string> = {
        day: '1 day',
        week: '7 days',
        month: '30 days',
        year: '365 days',
      };
      const interval = windowIntervals[time] ?? '1 day';
      sql += ` AND t.created_at >= NOW() - INTERVAL '${interval}'`;
    }

    const res = await this.pool.query(sql, params);
    const threads = res.rows.map((r) => this.mapThreadRow(r));

    const scoredList = threads.map((t) => {
      const createdAtMs = new Date(t.createdAt).getTime();
      let score = 0;
      if (sort === 'hot') {
        score = GravityDecayEngine.computeHotScore(
          t.upvotesCount - t.downvotesCount,
          new Date(t.createdAt),
        );
      } else if (sort === 'best') {
        score = WilsonScoreEngine.computeWilsonScore(t.upvotesCount, t.downvotesCount);
      } else if (sort === 'top') {
        score = t.upvotesCount - t.downvotesCount;
      } else {
        score = createdAtMs;
      }
      return { thread: t, score, createdAtMs, id: t.id };
    });

    scoredList.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.createdAtMs !== a.createdAtMs) return b.createdAtMs - a.createdAtMs;
      return b.id.localeCompare(a.id);
    });

    let startIndex = 0;
    if (options?.cursor) {
      const decoded = CursorManager.decode(options.cursor);
      if (decoded) {
        const found = scoredList.findIndex((item) => {
          if (item.score < decoded.score) return true;
          if (item.score === decoded.score && item.createdAtMs < decoded.createdAtMs) return true;
          if (
            item.score === decoded.score &&
            item.createdAtMs === decoded.createdAtMs &&
            item.id < decoded.id
          ) {
            return true;
          }
          return false;
        });
        startIndex = found !== -1 ? found : scoredList.length;
      }
    }

    const pageItems = scoredList.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < scoredList.length;
    let nextCursor: string | null = null;
    if (hasMore && pageItems.length > 0) {
      const last = pageItems[pageItems.length - 1];
      if (last) {
        nextCursor = CursorManager.encode(last.score, last.createdAtMs, last.id);
      }
    }

    return {
      items: pageItems.map((p) => p.thread),
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
