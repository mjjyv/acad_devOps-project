import type pg from 'pg';
import { CursorManager } from '../voting/cursor-manager.js';
import {
  type CommentEntity,
  CommunityDatabaseError,
  type CreateFlairRepoData,
  DuplicateFlairError,
  DuplicateSlugError,
  type FeedFilter,
  type ICommunityRepository,
  type SpaceEntity,
  type SpaceFlairEntity,
  type SpaceMembershipEntity,
  type SpaceMembershipRoleDb,
  type SpaceTopicStats,
  type ThreadCountersEntity,
  type ThreadEntity,
} from './community-repository.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(val: string): boolean {
  return UUID_REGEX.test(val);
}

/** PostgreSQL 16 Repository aligned with migrations 000002, 000003, 000006 and 000007. */
export class PostgresCommunityRepository implements ICommunityRepository {
  public readonly handlesCountersViaDbTriggers = true;

  private static readonly THREAD_SELECT_FIELDS = `
    t.*,
    s.slug AS space_slug,
    s.name AS space_name,
    s.is_private AS space_is_private,
    u.username AS author_username,
    u.avatar_url AS author_avatar_url,
    u.status AS author_status,
    f.name AS flair_name,
    f.slug AS flair_slug,
    f.color_hex AS flair_color_hex,
    f.background_hex AS flair_background_hex,
    COALESCE(tc.upvotes, t.upvotes_count) AS resolved_upvotes,
    COALESCE(tc.downvotes, t.downvotes_count) AS resolved_downvotes,
    COALESCE(tc.comment_count, t.comment_count) AS resolved_comment_count
  `;

  private static readonly THREAD_FROM_JOINS = `
    FROM threads t
    LEFT JOIN spaces s ON t.space_id = s.id
    LEFT JOIN users u ON t.author_id = u.id
    LEFT JOIN space_flairs f ON t.flair_id = f.id
    LEFT JOIN thread_counters tc ON t.id = tc.thread_id
  `;

  constructor(private readonly pool: pg.Pool) {}

  private mapSpaceRow(row: Record<string, unknown>): SpaceEntity {
    return {
      id: String(row.id),
      name: String(row.name),
      slug: String(row.slug),
      topic: String(row.topic ?? 'DevOps & SRE'),
      description: row.description ? String(row.description) : null,
      iconUrl: row.icon_url ? String(row.icon_url) : null,
      bannerUrl: row.banner_url ? String(row.banner_url) : null,
      rules: Array.isArray(row.rules)
        ? (row.rules as Array<{ title: string; description: string }>)
        : [],
      isPrivate: Boolean(row.is_private),
      creatorId: String(row.creator_id),
      memberCount: Number.parseInt(String(row.member_count ?? 0), 10),
      threadCount: Number.parseInt(String(row.thread_count ?? 0), 10),
      createdAt: new Date(String(row.created_at)).toISOString(),
      updatedAt: new Date(String(row.updated_at)).toISOString(),
    };
  }

  private mapFlairRow(row: Record<string, unknown>): SpaceFlairEntity {
    return {
      id: String(row.id),
      spaceId: String(row.space_id),
      name: String(row.name),
      slug: String(row.slug),
      colorHex: String(row.color_hex ?? '#E1D9BC'),
      backgroundHex: String(row.background_hex ?? '#30364F'),
      createdAt: new Date(String(row.created_at)).toISOString(),
    };
  }

  private mapThreadRow(row: Record<string, unknown>): ThreadEntity {
    return {
      id: String(row.id),
      spaceId: String(row.space_id),
      spaceSlug: row.space_slug ? String(row.space_slug) : undefined,
      spaceName: row.space_name ? String(row.space_name) : undefined,
      spaceIsPrivate:
        row.space_is_private !== undefined ? Boolean(row.space_is_private) : undefined,
      authorId: String(row.author_id),
      authorUsername: row.author_username ? String(row.author_username) : undefined,
      authorAvatarUrl: row.author_avatar_url ? String(row.author_avatar_url) : null,
      authorStatus: row.author_status ? String(row.author_status) : 'ACTIVE',
      flairId: row.flair_id ? String(row.flair_id) : null,
      flairName: row.flair_name ? String(row.flair_name) : null,
      flairSlug: row.flair_slug ? String(row.flair_slug) : null,
      flairColorHex: row.flair_color_hex ? String(row.flair_color_hex) : null,
      flairBackgroundHex: row.flair_background_hex ? String(row.flair_background_hex) : null,
      title: String(row.title),
      slug: String(row.slug),
      content: row.content !== null && row.content !== undefined ? String(row.content) : null,
      linkUrl: row.link_url ? String(row.link_url) : null,
      mediaUrls: Array.isArray(row.media_urls) ? row.media_urls.map((u) => String(u)) : [],
      threadType: (row.thread_type as 'TEXT' | 'LINK' | 'MEDIA') || 'TEXT',
      upvotesCount: Number.parseInt(String(row.resolved_upvotes ?? row.upvotes_count ?? 0), 10),
      downvotesCount: Number.parseInt(
        String(row.resolved_downvotes ?? row.downvotes_count ?? 0),
        10,
      ),
      commentCount: Number.parseInt(
        String(row.resolved_comment_count ?? row.comment_count ?? 0),
        10,
      ),
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
      authorUsername: row.author_username ? String(row.author_username) : undefined,
      authorAvatarUrl: row.author_avatar_url ? String(row.author_avatar_url) : null,
      authorKarmaScore:
        row.author_karma_score !== undefined
          ? Number.parseInt(String(row.author_karma_score), 10)
          : undefined,
      parentId: row.parent_id ? String(row.parent_id) : null,
      path: String(row.path),
      depth: Number.parseInt(String(row.depth ?? 1), 10),
      content: String(row.content),
      replyToUserId: row.reply_to_user_id ? String(row.reply_to_user_id) : null,
      replyToUsername: row.reply_to_username ? String(row.reply_to_username) : null,
      upvotesCount: Number.parseInt(String(row.upvotes_count ?? 0), 10),
      downvotesCount: Number.parseInt(String(row.downvotes_count ?? 0), 10),
      isDeleted: Boolean(row.is_deleted),
      createdAt: new Date(String(row.created_at)).toISOString(),
      updatedAt: new Date(String(row.updated_at)).toISOString(),
      directRepliesCount:
        row.direct_replies_count !== undefined
          ? Number.parseInt(String(row.direct_replies_count), 10)
          : undefined,
      totalDescendantsCount:
        row.total_descendants_count !== undefined
          ? Number.parseInt(String(row.total_descendants_count), 10)
          : undefined,
    };
  }

  // --- Spaces ---

  public async createSpace(data: {
    name: string;
    slug: string;
    topic?: string;
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

      const res = await client.query(
        `INSERT INTO spaces (name, slug, topic, description, icon_url, banner_url, rules, creator_id, is_private, member_count)
         VALUES ($1, LOWER($2), $3, $4, $5, $6, $7, $8, $9, 0)
         RETURNING *;`,
        [
          data.name,
          data.slug,
          data.topic || 'DevOps & SRE',
          data.description || null,
          data.iconUrl || null,
          data.bannerUrl || null,
          JSON.stringify(data.rules || []),
          data.creatorId,
          Boolean(data.isPrivate),
        ],
      );

      const space = this.mapSpaceRow(res.rows[0]);
      // Trigger trg_space_members_count updates member_count 0 -> 1
      await client.query(
        `INSERT INTO space_memberships (space_id, user_id, role) VALUES ($1, $2, 'CREATOR');`,
        [space.id, data.creatorId],
      );
      space.memberCount = 1;

      await client.query('COMMIT');
      return space;
    } catch (err: unknown) {
      await client.query('ROLLBACK');
      const pgErr = err as { code?: string };
      if (pgErr.code === '23505') {
        throw new DuplicateSlugError(`Slug không gian "${data.slug}" đã được sử dụng`);
      }
      throw new CommunityDatabaseError('Lỗi tạo không gian thảo luận trên PostgreSQL', err);
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
      throw new CommunityDatabaseError('Lỗi tìm không gian theo slug', err);
    }
  }

  public async findSpaceById(id: string): Promise<SpaceEntity | null> {
    if (!isUuid(id)) return null;
    try {
      const res = await this.pool.query('SELECT * FROM spaces WHERE id = $1 LIMIT 1;', [id]);
      return res.rows[0] ? this.mapSpaceRow(res.rows[0]) : null;
    } catch (err) {
      throw new CommunityDatabaseError('Lỗi tìm không gian theo id', err);
    }
  }

  public async listSpaces(options?: {
    limit?: number;
    offset?: number;
    topic?: string;
    q?: string;
  }): Promise<SpaceEntity[]> {
    try {
      const limit = options?.limit ?? 20;
      const offset = options?.offset ?? 0;
      const topicFilter = options?.topic?.trim() || null;
      const qFilter = options?.q?.trim() ? `%${options.q.trim()}%` : null;

      const params: unknown[] = [limit, offset];
      const conditions: string[] = [];

      if (topicFilter) {
        params.push(topicFilter);
        conditions.push(`topic = $${params.length}`);
      }
      if (qFilter) {
        params.push(qFilter);
        const p = `$${params.length}`;
        conditions.push(
          `(name ILIKE ${p} OR slug ILIKE ${p} OR COALESCE(description, '') ILIKE ${p})`,
        );
      }

      const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const res = await this.pool.query(
        `SELECT * FROM spaces ${whereSql} ORDER BY member_count DESC, created_at DESC LIMIT $1 OFFSET $2;`,
        params,
      );
      return res.rows.map((r) => this.mapSpaceRow(r));
    } catch (err) {
      throw new CommunityDatabaseError('Lỗi liệt kê spaces', err);
    }
  }

  public async listSpaceTopics(): Promise<SpaceTopicStats[]> {
    try {
      const res = await this.pool.query(
        `SELECT topic, COUNT(*)::int AS spaces_count, COALESCE(SUM(member_count), 0)::int AS total_members
         FROM spaces
         WHERE is_private = FALSE
         GROUP BY topic
         ORDER BY total_members DESC, spaces_count DESC, topic ASC;`,
      );
      return res.rows.map((r) => ({
        topic: String(r.topic),
        spacesCount: Number.parseInt(String(r.spaces_count), 10),
        totalMembers: Number.parseInt(String(r.total_members), 10),
      }));
    } catch (err) {
      throw new CommunityDatabaseError('Lỗi thống kê chủ đề không gian', err);
    }
  }

  public async joinSpace(
    spaceId: string,
    userId: string,
    role: SpaceMembershipRoleDb = 'MEMBER',
  ): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO space_memberships (space_id, user_id, role)
         VALUES ($1, $2, $3)
         ON CONFLICT (space_id, user_id) DO NOTHING;`,
        [spaceId, userId, role],
      );
    } catch (err) {
      throw new CommunityDatabaseError('Lỗi tham gia không gian', err);
    }
  }

  public async leaveSpace(spaceId: string, userId: string): Promise<void> {
    try {
      await this.pool.query('DELETE FROM space_memberships WHERE space_id = $1 AND user_id = $2;', [
        spaceId,
        userId,
      ]);
    } catch (err) {
      throw new CommunityDatabaseError('Lỗi rời không gian', err);
    }
  }

  public async getMembership(
    spaceId: string,
    userId: string,
  ): Promise<SpaceMembershipEntity | null> {
    if (!isUuid(spaceId) || !isUuid(userId)) return null;
    try {
      const res = await this.pool.query(
        'SELECT * FROM space_memberships WHERE space_id = $1 AND user_id = $2 LIMIT 1;',
        [spaceId, userId],
      );
      if (!res.rows[0]) return null;
      return {
        spaceId: String(res.rows[0].space_id),
        userId: String(res.rows[0].user_id),
        role: res.rows[0].role as SpaceMembershipRoleDb,
        joinedAt: new Date(String(res.rows[0].joined_at)).toISOString(),
      };
    } catch (err) {
      throw new CommunityDatabaseError('Lỗi kiểm tra thành viên không gian', err);
    }
  }

  // --- Flairs ---

  public async createFlair(spaceId: string, data: CreateFlairRepoData): Promise<SpaceFlairEntity> {
    try {
      const slugLower = data.slug.toLowerCase();
      const res = await this.pool.query(
        `INSERT INTO space_flairs (space_id, name, slug, color_hex, background_hex)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *;`,
        [spaceId, data.name, slugLower, data.colorHex, data.backgroundHex],
      );
      return this.mapFlairRow(res.rows[0]);
    } catch (err: unknown) {
      const pgErr = err as { code?: string };
      if (pgErr.code === '23505') {
        throw new DuplicateFlairError(
          `Nhãn "${data.slug}" đã tồn tại trong không gian thảo luận này`,
        );
      }
      throw new CommunityDatabaseError('Lỗi tạo nhãn không gian', err);
    }
  }

  public async listFlairs(spaceId: string): Promise<SpaceFlairEntity[]> {
    try {
      const res = await this.pool.query(
        'SELECT * FROM space_flairs WHERE space_id = $1 ORDER BY created_at ASC;',
        [spaceId],
      );
      return res.rows.map((r) => this.mapFlairRow(r));
    } catch (err) {
      throw new CommunityDatabaseError('Lỗi liệt kê nhãn không gian', err);
    }
  }

  // --- Threads ---

  public async createThread(data: {
    spaceId: string;
    authorId: string;
    flairId?: string | null;
    title: string;
    slug: string;
    content?: string | null;
    linkUrl?: string | null;
    mediaUrls?: string[] | undefined;
    threadType: 'TEXT' | 'LINK' | 'MEDIA';
  }): Promise<ThreadEntity> {
    try {
      const res = await this.pool.query(
        `WITH inserted AS (
           INSERT INTO threads (space_id, author_id, flair_id, title, slug, content, link_url, media_urls, thread_type)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)
           RETURNING *
         )
         SELECT ${PostgresCommunityRepository.THREAD_SELECT_FIELDS.replace(/\bt\./g, 'i.')}
         FROM inserted i
         LEFT JOIN spaces s ON i.space_id = s.id
         LEFT JOIN users u ON i.author_id = u.id
         LEFT JOIN space_flairs f ON i.flair_id = f.id
         LEFT JOIN thread_counters tc ON i.id = tc.thread_id;`,
        [
          data.spaceId,
          data.authorId,
          data.flairId || null,
          data.title,
          data.slug,
          data.content || null,
          data.linkUrl || null,
          JSON.stringify(data.mediaUrls ?? []),
          data.threadType,
        ],
      );
      return this.mapThreadRow(res.rows[0]);
    } catch (err: unknown) {
      const pgErr = err as { code?: string };
      if (pgErr.code === '23505') {
        throw new DuplicateSlugError(`Slug bài viết "${data.slug}" đã tồn tại`);
      }
      throw new CommunityDatabaseError('Lỗi tạo bài viết mới', err);
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
      throw new CommunityDatabaseError('Lỗi tìm bài viết theo id', err);
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
      throw new CommunityDatabaseError('Lỗi tìm bài viết theo slug', err);
    }
  }

  public async listThreadsBySpace(
    spaceId: string,
    options?: {
      limit?: number | undefined;
      offset?: number | undefined;
      flairId?: string | undefined;
      viewerId?: string | undefined;
    },
  ): Promise<ThreadEntity[]> {
    try {
      const limit = options?.limit ?? 20;
      const offset = options?.offset ?? 0;
      const params: unknown[] = [spaceId, limit, offset];
      const conditions = ['t.space_id = $1'];

      if (options?.viewerId && isUuid(options.viewerId)) {
        params.push(options.viewerId);
        conditions.push(
          `(COALESCE(u.status::text, 'ACTIVE') <> 'SHADOWBANNED' OR t.author_id = $${params.length})`,
        );
      } else {
        conditions.push(`COALESCE(u.status::text, 'ACTIVE') <> 'SHADOWBANNED'`);
      }

      if (options?.flairId && isUuid(options.flairId)) {
        params.push(options.flairId);
        conditions.push(`t.flair_id = $${params.length}`);
      }

      const res = await this.pool.query(
        `SELECT ${PostgresCommunityRepository.THREAD_SELECT_FIELDS}
         ${PostgresCommunityRepository.THREAD_FROM_JOINS}
         WHERE ${conditions.join(' AND ')}
         ORDER BY t.is_pinned DESC, t.created_at DESC
         LIMIT $2 OFFSET $3;`,
        params,
      );
      return res.rows.map((r) => this.mapThreadRow(r));
    } catch (err) {
      throw new CommunityDatabaseError('Lỗi liệt kê bài viết trong space', err);
    }
  }

  public async searchThreadsInSpace(
    spaceId: string,
    query: string,
    limit = 20,
    viewerId?: string,
  ): Promise<ThreadEntity[]> {
    try {
      const pattern = `%${query.trim()}%`;
      const params: unknown[] = [spaceId, pattern, limit];
      let shadowCondition = `COALESCE(u.status::text, 'ACTIVE') <> 'SHADOWBANNED'`;
      if (viewerId && isUuid(viewerId)) {
        params.push(viewerId);
        shadowCondition = `(COALESCE(u.status::text, 'ACTIVE') <> 'SHADOWBANNED' OR t.author_id = $4)`;
      }

      const res = await this.pool.query(
        `SELECT ${PostgresCommunityRepository.THREAD_SELECT_FIELDS}
         ${PostgresCommunityRepository.THREAD_FROM_JOINS}
         WHERE t.space_id = $1
           AND ${shadowCondition}
           AND (t.title ILIKE $2 OR COALESCE(t.content, '') ILIKE $2)
         ORDER BY t.created_at DESC
         LIMIT $3;`,
        params,
      );
      return res.rows.map((r) => this.mapThreadRow(r));
    } catch (err) {
      throw new CommunityDatabaseError('Lỗi tìm kiếm bài viết trong space', err);
    }
  }

  // --- Comments (ltree) ---

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
                ru.username AS reply_to_username,
                0 AS direct_replies_count,
                0 AS total_descendants_count
         FROM inserted i
         LEFT JOIN users u ON i.author_id = u.id
         LEFT JOIN users ru ON i.reply_to_user_id = ru.id;`,
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
      throw new CommunityDatabaseError('Lỗi tạo bình luận ltree', err);
    }
  }

  public async findCommentById(id: string): Promise<CommentEntity | null> {
    if (!isUuid(id)) return null;
    try {
      const res = await this.pool.query(
        `SELECT c.*, u.username AS author_username, u.avatar_url AS author_avatar_url, u.karma_score AS author_karma_score
         FROM comments c
         LEFT JOIN users u ON c.author_id = u.id
         WHERE c.id = $1 LIMIT 1;`,
        [id],
      );
      return res.rows[0] ? this.mapCommentRow(res.rows[0]) : null;
    } catch (err) {
      throw new CommunityDatabaseError('Lỗi tìm bình luận theo id', err);
    }
  }

  public async listCommentsByThread(threadId: string): Promise<CommentEntity[]> {
    try {
      const res = await this.pool.query(
        `SELECT c.*,
                u.username AS author_username,
                u.avatar_url AS author_avatar_url,
                u.karma_score AS author_karma_score,
                ru.username AS reply_to_username,
                (SELECT COUNT(*) FROM comments r WHERE r.parent_id = c.id) AS direct_replies_count,
                (SELECT COUNT(*) FROM comments d
                 WHERE d.thread_id = c.thread_id
                   AND d.id <> c.id
                   AND ((d.path <@ c.path AND d.depth > c.depth) OR d.parent_id = c.id)
                ) AS total_descendants_count
         FROM comments c
         LEFT JOIN users u ON c.author_id = u.id
         LEFT JOIN users ru ON c.reply_to_user_id = ru.id
         WHERE c.thread_id = $1
         ORDER BY c.path ASC, c.created_at ASC;`,
        [threadId],
      );
      return res.rows.map((r) => this.mapCommentRow(r));
    } catch (err) {
      throw new CommunityDatabaseError('Lỗi lấy cây bình luận ltree', err);
    }
  }

  public async countChildrenByParent(threadId: string, parentId?: string | null): Promise<number> {
    try {
      const res = parentId
        ? await this.pool.query(
            'SELECT COUNT(*)::int AS cnt FROM comments WHERE thread_id = $1 AND parent_id = $2;',
            [threadId, parentId],
          )
        : await this.pool.query(
            'SELECT COUNT(*)::int AS cnt FROM comments WHERE thread_id = $1 AND parent_id IS NULL;',
            [threadId],
          );
      return Number.parseInt(String(res.rows[0].cnt), 10);
    } catch (err) {
      throw new CommunityDatabaseError('Lỗi đếm số bình luận con', err);
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
      throw new CommunityDatabaseError('Lỗi xóa mềm bình luận', err);
    }
  }

  // --- Voting & Counters (Phase B3) ---

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
      throw new CommunityDatabaseError('Lỗi đồng bộ bộ đếm thread_counters', err);
    } finally {
      client.release();
    }
  }

  public async getThreadCounters(threadId: string): Promise<ThreadCountersEntity | null> {
    if (!isUuid(threadId)) return null;
    try {
      const res = await this.pool.query(
        'SELECT * FROM thread_counters WHERE thread_id = $1 LIMIT 1;',
        [threadId],
      );
      if (!res.rows[0]) return null;
      const r = res.rows[0];
      return {
        threadId: String(r.thread_id),
        upvotes: Number.parseInt(String(r.upvotes), 10),
        downvotes: Number.parseInt(String(r.downvotes), 10),
        netScore: Number.parseInt(String(r.net_score), 10),
        hotScore: Number.parseFloat(String(r.hot_score)),
        wilsonScore: Number.parseFloat(String(r.wilson_score)),
        commentCount: Number.parseInt(String(r.comment_count), 10),
        updatedAt: new Date(String(r.updated_at)),
      };
    } catch (err) {
      throw new CommunityDatabaseError('Lỗi truy vấn bộ đếm thread_counters', err);
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
      throw new CommunityDatabaseError(`Lỗi ghi nhận biểu quyết trên ${table}`, err);
    }
  }

  public async getUserVote(
    targetId: string,
    targetType: 'THREAD' | 'COMMENT',
    userId: string,
  ): Promise<number> {
    if (!isUuid(targetId) || !isUuid(userId)) return 0;
    const table = targetType === 'THREAD' ? 'thread_votes' : 'comment_votes';
    const idColumn = targetType === 'THREAD' ? 'thread_id' : 'comment_id';
    try {
      const res = await this.pool.query(
        `SELECT direction FROM ${table} WHERE ${idColumn} = $1 AND user_id = $2 LIMIT 1;`,
        [targetId, userId],
      );
      return res.rows[0] ? Number.parseInt(String(res.rows[0].direction), 10) : 0;
    } catch (err) {
      throw new CommunityDatabaseError(`Lỗi truy vấn phiếu bầu từ ${table}`, err);
    }
  }

  public async getUserCommentVotes(
    threadId: string,
    userId: string,
  ): Promise<Record<string, number>> {
    if (!isUuid(threadId) || !isUuid(userId)) return {};
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
        map[String(row.comment_id)] = Number.parseInt(String(row.direction), 10);
      }
      return map;
    } catch (err) {
      throw new CommunityDatabaseError('Lỗi truy vấn danh sách vote bình luận', err);
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
        'INSERT INTO user_saved_threads (user_id, thread_id) VALUES ($1, $2);',
        [userId, threadId],
      );
      return true;
    } catch (err) {
      throw new CommunityDatabaseError('Lỗi lưu/bỏ lưu bài viết', err);
    }
  }

  public async isThreadSaved(userId: string, threadId: string): Promise<boolean> {
    if (!isUuid(userId) || !isUuid(threadId)) return false;
    try {
      const res = await this.pool.query(
        'SELECT 1 FROM user_saved_threads WHERE user_id = $1 AND thread_id = $2 LIMIT 1;',
        [userId, threadId],
      );
      return res.rows.length > 0;
    } catch (err) {
      throw new CommunityDatabaseError('Lỗi kiểm tra trạng thái lưu bài viết', err);
    }
  }

  public async listSavedThreads(userId: string, limit = 20, offset = 0): Promise<ThreadEntity[]> {
    try {
      const res = await this.pool.query(
        `SELECT ${PostgresCommunityRepository.THREAD_SELECT_FIELDS}
         FROM user_saved_threads ust
         INNER JOIN threads t ON ust.thread_id = t.id
         LEFT JOIN spaces s ON t.space_id = s.id
         LEFT JOIN users u ON t.author_id = u.id
         LEFT JOIN space_flairs f ON t.flair_id = f.id
         LEFT JOIN thread_counters tc ON t.id = tc.thread_id
         WHERE ust.user_id = $1
           AND (COALESCE(u.status::text, 'ACTIVE') <> 'SHADOWBANNED' OR t.author_id = $1)
         ORDER BY ust.created_at DESC
         LIMIT $2 OFFSET $3;`,
        [userId, limit, offset],
      );
      return res.rows.map((r) => this.mapThreadRow(r));
    } catch (err) {
      throw new CommunityDatabaseError('Lỗi liệt kê bài viết đã lưu', err);
    }
  }

  public async updateUserKarma(userId: string, delta: number): Promise<void> {
    if (delta === 0) return;
    try {
      await this.pool.query(
        'UPDATE users SET karma_score = karma_score + $1, updated_at = NOW() WHERE id = $2;',
        [delta, userId],
      );
    } catch (err) {
      throw new CommunityDatabaseError('Lỗi cập nhật điểm Karma tác giả', err);
    }
  }

  public async refreshHotScores(): Promise<void> {
    try {
      await this.pool.query(
        `UPDATE thread_counters
         SET hot_score = calculate_hot_score(net_score, created_at),
             updated_at = NOW();`,
      );
    } catch (err) {
      throw new CommunityDatabaseError('Lỗi làm mới hot_score', err);
    }
  }

  public async listHomeFeedThreads(
    userId: string,
    options?: FeedFilter,
  ): Promise<{ items: ThreadEntity[]; nextCursor: string | null }> {
    try {
      const memRes = await this.pool.query(
        'SELECT space_id FROM space_memberships WHERE user_id = $1;',
        [userId],
      );
      const joinedSpaceIds = memRes.rows.map((r) => String(r.space_id));
      if (joinedSpaceIds.length === 0) {
        return { items: [], nextCursor: null };
      }
      return this.fetchFeedsWithCursor(options, joinedSpaceIds, false, userId);
    } catch (err) {
      throw new CommunityDatabaseError('Lỗi truy vấn Home Feed', err);
    }
  }

  public async listPopularFeedThreads(
    options?: FeedFilter,
    viewerId?: string,
  ): Promise<{ items: ThreadEntity[]; nextCursor: string | null }> {
    try {
      return this.fetchFeedsWithCursor(options, undefined, true, viewerId);
    } catch (err) {
      throw new CommunityDatabaseError('Lỗi truy vấn Popular Feed', err);
    }
  }

  public async listSpaceFeedThreads(
    spaceId: string,
    options?: FeedFilter,
    viewerId?: string,
  ): Promise<{ items: ThreadEntity[]; nextCursor: string | null }> {
    try {
      return this.fetchFeedsWithCursor(options, [spaceId], false, viewerId);
    } catch (err) {
      throw new CommunityDatabaseError('Lỗi truy vấn Space Feed', err);
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

    if (options?.q?.trim()) {
      params.push(`%${options.q.trim()}%`);
      whereClauses.push(
        `(t.title ILIKE $${params.length} OR COALESCE(t.content, '') ILIKE $${params.length})`,
      );
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
      const score = Number.parseFloat(String(lastRow.computed_score));
      const createdAtMs = Number.parseInt(String(lastRow.created_at_ms), 10);
      const id = String(lastRow.id);
      nextCursor = CursorManager.encode(score, createdAtMs, id);
    }

    return { items, nextCursor };
  }

  public async checkHealth(): Promise<boolean> {
    try {
      const res = await this.pool.query('SELECT 1;');
      return (res.rowCount ?? 0) > 0;
    } catch {
      return false;
    }
  }
}
