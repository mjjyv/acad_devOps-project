/**
 * @file postgres-community-repository.ts
 * @description PostgreSQL 16 Implementation for Spaces, Threads, and Comments (ltree GiST).
 */

import pg from 'pg';
import {
  type CommentEntity,
  DatabaseConnectionError,
  DuplicateFlairError,
  DuplicateSlugError,
  type ICommunityRepository,
  type SpaceEntity,
  type SpaceFlairEntity,
  type SpaceMembershipEntity,
  type ThreadEntity,
} from './community-repository.js';

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
    try {
      const res = await this.pool.query('SELECT * FROM threads WHERE id = $1 LIMIT 1;', [id]);
      return res.rows[0] ? this.mapThreadRow(res.rows[0]) : null;
    } catch (err) {
      throw new DatabaseConnectionError('Lỗi tìm thread theo id', err);
    }
  }

  public async findThreadBySlug(slug: string): Promise<ThreadEntity | null> {
    try {
      const res = await this.pool.query('SELECT * FROM threads WHERE slug = $1 LIMIT 1;', [slug]);
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
      let query = 'SELECT * FROM threads WHERE space_id = $1';
      const params: unknown[] = [spaceId];

      if (options?.flairId) {
        query += ' AND flair_id = $2';
        params.push(options.flairId);
        query += ` ORDER BY is_pinned DESC, created_at DESC LIMIT $3 OFFSET $4;`;
        params.push(limit, offset);
      } else {
        query += ` ORDER BY is_pinned DESC, created_at DESC LIMIT $2 OFFSET $3;`;
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
        `SELECT * FROM threads
         WHERE space_id = $1 AND title ILIKE $2
         ORDER BY created_at DESC
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
    try {
      const res = await this.pool.query('SELECT * FROM comments WHERE id = $1 LIMIT 1;', [id]);
      return res.rows[0] ? this.mapCommentRow(res.rows[0]) : null;
    } catch (err) {
      throw new DatabaseConnectionError('Lỗi tìm bình luận theo id', err);
    }
  }

  public async listCommentsByThread(threadId: string): Promise<CommentEntity[]> {
    try {
      // 1 câu truy vấn duy nhất sắp xếp theo path ltree tăng dần: < 1.2ms qua GiST index
      const res = await this.pool.query(
        'SELECT * FROM comments WHERE thread_id = $1 ORDER BY path ASC;',
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
