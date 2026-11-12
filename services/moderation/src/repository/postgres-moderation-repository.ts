import type { SpaceEntity, ThreadEntity } from '@acad/community-service';
import type {
  AdminStats,
  AdminUserListItem,
  ModReportStatus,
  ModReportTargetType,
  UserRole,
  UserStatus,
} from '@acad/contracts';
import type pg from 'pg';
import { DuplicateReportError } from '../services/moderation-service.js';
import {
  type AuditLogEntity,
  type IModerationRepository,
  ModerationDatabaseError,
  type ModUserSummaryEntity,
  type ReportEntity,
} from './moderation-repository.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(val: string): boolean {
  return UUID_REGEX.test(val);
}

/** PostgreSQL 16 Moderation & Admin Hub Repository aligned with migration 000005 & 000006. */
export class PostgresModerationRepository implements IModerationRepository {
  constructor(private readonly pool: pg.Pool) {}

  private mapReportRow(row: Record<string, unknown>): ReportEntity {
    return {
      id: String(row.id),
      reporterId: String(row.reporter_id),
      reporterUsername: row.reporter_username ? String(row.reporter_username) : undefined,
      targetType: row.target_type as ModReportTargetType,
      targetId: String(row.target_id),
      reason: String(row.reason),
      status: row.status as ModReportStatus,
      resolvedBy: row.resolved_by ? String(row.resolved_by) : null,
      resolvedAt: row.resolved_at ? new Date(String(row.resolved_at)) : null,
      resolutionNote: row.resolution_note ? String(row.resolution_note) : null,
      createdAt: new Date(String(row.created_at)),
    };
  }

  private mapAuditLogRow(row: Record<string, unknown>): AuditLogEntity {
    return {
      id: String(row.id),
      actorId: String(row.actor_id),
      actorUsername: row.actor_username ? String(row.actor_username) : 'Unknown',
      action: String(row.action),
      targetType: String(row.target_type),
      targetId: row.target_id ? String(row.target_id) : null,
      metadata:
        typeof row.metadata === 'object' && row.metadata !== null
          ? (row.metadata as Record<string, unknown>)
          : {},
      ipAddress: row.ip_address ? String(row.ip_address) : null,
      userAgent: row.user_agent ? String(row.user_agent) : null,
      createdAt: new Date(String(row.created_at)),
    };
  }

  public async createReport(data: {
    reporterId: string;
    targetType: ModReportTargetType;
    targetId: string;
    reason: string;
  }): Promise<ReportEntity> {
    try {
      const res = await this.pool.query(
        `WITH inserted AS (
           INSERT INTO reports (reporter_id, target_type, target_id, reason, status)
           VALUES ($1, $2, $3, $4, 'PENDING')
           RETURNING *
         )
         SELECT i.*, u.username AS reporter_username
         FROM inserted i
         LEFT JOIN users u ON i.reporter_id = u.id;`,
        [data.reporterId, data.targetType, data.targetId, data.reason],
      );
      return this.mapReportRow(res.rows[0]);
    } catch (err: unknown) {
      const pgErr = err as { code?: string };
      if (pgErr.code === '23505') {
        throw new DuplicateReportError(data.targetType, data.targetId);
      }
      throw new ModerationDatabaseError('Lỗi tạo báo cáo vi phạm', err);
    }
  }

  public async findReportById(id: string): Promise<ReportEntity | null> {
    if (!isUuid(id)) return null;
    try {
      const res = await this.pool.query(
        `SELECT r.*, u.username AS reporter_username
         FROM reports r
         LEFT JOIN users u ON r.reporter_id = u.id
         WHERE r.id = $1 LIMIT 1;`,
        [id],
      );
      return res.rows[0] ? this.mapReportRow(res.rows[0]) : null;
    } catch (err) {
      throw new ModerationDatabaseError('Lỗi tìm báo cáo theo id', err);
    }
  }

  public async findExistingReport(
    reporterId: string,
    targetType: ModReportTargetType,
    targetId: string,
  ): Promise<ReportEntity | null> {
    if (!isUuid(reporterId) || !isUuid(targetId)) return null;
    try {
      const res = await this.pool.query(
        `SELECT r.*, u.username AS reporter_username
         FROM reports r
         LEFT JOIN users u ON r.reporter_id = u.id
         WHERE r.reporter_id = $1 AND r.target_type = $2 AND r.target_id = $3 AND r.status = 'PENDING'
         LIMIT 1;`,
        [reporterId, targetType, targetId],
      );
      return res.rows[0] ? this.mapReportRow(res.rows[0]) : null;
    } catch (err) {
      throw new ModerationDatabaseError('Lỗi kiểm tra báo cáo trùng lặp', err);
    }
  }

  public async listReports(options?: {
    status?: ModReportStatus | undefined;
    targetType?: ModReportTargetType | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
  }): Promise<{ reports: ReportEntity[]; total: number }> {
    try {
      const limit = options?.limit ?? 50;
      const offset = options?.offset ?? 0;
      const params: unknown[] = [];
      const conditions: string[] = [];

      if (options?.status) {
        params.push(options.status);
        conditions.push(`r.status = $${params.length}`);
      }
      if (options?.targetType) {
        params.push(options.targetType);
        conditions.push(`r.target_type = $${params.length}`);
      }

      const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const countRes = await this.pool.query(
        `SELECT COUNT(*)::int AS cnt FROM reports r ${whereSql};`,
        params,
      );
      const total = Number.parseInt(String(countRes.rows[0]?.cnt ?? 0), 10);

      params.push(limit, offset);
      const res = await this.pool.query(
        `SELECT r.*, u.username AS reporter_username
         FROM reports r
         LEFT JOIN users u ON r.reporter_id = u.id
         ${whereSql}
         ORDER BY r.created_at DESC
         LIMIT $${params.length - 1} OFFSET $${params.length};`,
        params,
      );

      return { reports: res.rows.map((r) => this.mapReportRow(r)), total };
    } catch (err) {
      throw new ModerationDatabaseError('Lỗi liệt kê báo cáo vi phạm', err);
    }
  }

  public async listReportsByReporter(reporterId: string): Promise<ReportEntity[]> {
    try {
      const res = await this.pool.query(
        `SELECT r.*, u.username AS reporter_username
         FROM reports r
         LEFT JOIN users u ON r.reporter_id = u.id
         WHERE r.reporter_id = $1
         ORDER BY r.created_at DESC;`,
        [reporterId],
      );
      return res.rows.map((r) => this.mapReportRow(r));
    } catch (err) {
      throw new ModerationDatabaseError('Lỗi liệt kê báo cáo của người dùng', err);
    }
  }

  public async updateReportStatus(
    id: string,
    status: 'RESOLVED' | 'DISMISSED',
    resolvedBy: string,
    resolutionNote?: string | null | undefined,
  ): Promise<ReportEntity | null> {
    if (!isUuid(id)) return null;
    try {
      const res = await this.pool.query(
        `WITH updated AS (
           UPDATE reports
           SET status = $2,
               resolved_by = $3,
               resolved_at = NOW(),
               resolution_note = $4
           WHERE id = $1
           RETURNING *
         )
         SELECT up.*, u.username AS reporter_username
         FROM updated up
         LEFT JOIN users u ON up.reporter_id = u.id;`,
        [id, status, resolvedBy, resolutionNote ?? null],
      );
      return res.rows[0] ? this.mapReportRow(res.rows[0]) : null;
    } catch (err) {
      throw new ModerationDatabaseError('Lỗi cập nhật xử lý báo cáo', err);
    }
  }

  public async countPendingReports(): Promise<number> {
    try {
      const res = await this.pool.query(
        `SELECT COUNT(*)::int AS cnt FROM reports WHERE status = 'PENDING';`,
      );
      return Number.parseInt(String(res.rows[0]?.cnt ?? 0), 10);
    } catch (err) {
      throw new ModerationDatabaseError('Lỗi đếm báo cáo chờ xử lý', err);
    }
  }

  public async createAuditLog(data: {
    actorId: string;
    actorUsername: string;
    action: string;
    targetType: string;
    targetId?: string | null | undefined;
    metadata?: Record<string, unknown> | undefined;
    ipAddress?: string | null | undefined;
    userAgent?: string | null | undefined;
  }): Promise<AuditLogEntity> {
    try {
      const safeTargetId = data.targetId && isUuid(data.targetId) ? data.targetId : null;
      const res = await this.pool.query(
        `INSERT INTO audit_logs (actor_id, action, target_type, target_id, metadata, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)
         RETURNING *;`,
        [
          data.actorId,
          data.action,
          data.targetType,
          safeTargetId,
          JSON.stringify(data.metadata ?? {}),
          data.ipAddress ?? null,
          data.userAgent ?? null,
        ],
      );
      return {
        ...this.mapAuditLogRow(res.rows[0]),
        actorUsername: data.actorUsername,
      };
    } catch (err) {
      throw new ModerationDatabaseError('Lỗi ghi vết nhật ký kiểm toán bất biến', err);
    }
  }

  public async listAuditLogs(options?: {
    actorId?: string | undefined;
    action?: string | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
  }): Promise<{ logs: AuditLogEntity[]; total: number }> {
    try {
      const limit = options?.limit ?? 50;
      const offset = options?.offset ?? 0;
      const params: unknown[] = [];
      const conditions: string[] = [];

      if (options?.actorId && isUuid(options.actorId)) {
        params.push(options.actorId);
        conditions.push(`a.actor_id = $${params.length}`);
      }
      if (options?.action) {
        params.push(options.action);
        conditions.push(`a.action = $${params.length}`);
      }

      const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const countRes = await this.pool.query(
        `SELECT COUNT(*)::int AS cnt FROM audit_logs a ${whereSql};`,
        params,
      );
      const total = Number.parseInt(String(countRes.rows[0]?.cnt ?? 0), 10);

      params.push(limit, offset);
      const res = await this.pool.query(
        `SELECT a.*, u.username AS actor_username
         FROM audit_logs a
         LEFT JOIN users u ON a.actor_id = u.id
         ${whereSql}
         ORDER BY a.created_at DESC
         LIMIT $${params.length - 1} OFFSET $${params.length};`,
        params,
      );
      return { logs: res.rows.map((r) => this.mapAuditLogRow(r)), total };
    } catch (err) {
      throw new ModerationDatabaseError('Lỗi liệt kê audit logs', err);
    }
  }

  public async getSystemStats(): Promise<AdminStats> {
    try {
      const res = await this.pool.query(`
        SELECT
          (SELECT COUNT(*)::int FROM users WHERE status = 'ACTIVE') AS active_users_count,
          (SELECT COUNT(*)::int FROM user_sessions WHERE is_revoked = FALSE AND expires_at > NOW()) AS active_sessions_count,
          (SELECT COUNT(*)::int FROM spaces) AS spaces_count,
          (SELECT COUNT(*)::int FROM threads) AS threads_count,
          (SELECT COUNT(*)::int FROM comments WHERE is_deleted = FALSE) AS comments_count,
          (SELECT COUNT(*)::int FROM reports WHERE status = 'PENDING') AS pending_reports_count;
      `);
      const r = res.rows[0];
      return {
        activeUsersCount: Number.parseInt(String(r.active_users_count), 10),
        activeSessionsCount: Number.parseInt(String(r.active_sessions_count), 10),
        spacesCount: Number.parseInt(String(r.spaces_count), 10),
        threadsCount: Number.parseInt(String(r.threads_count), 10),
        commentsCount: Number.parseInt(String(r.comments_count), 10),
        pendingReportsCount: Number.parseInt(String(r.pending_reports_count), 10),
      };
    } catch (err) {
      throw new ModerationDatabaseError('Lỗi tổng hợp thống kê Admin Hub', err);
    }
  }

  public async listUsers(options?: {
    role?: UserRole | undefined;
    status?: UserStatus | undefined;
    search?: string | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
  }): Promise<{ users: AdminUserListItem[]; total: number }> {
    try {
      const limit = options?.limit ?? 50;
      const offset = options?.offset ?? 0;
      const params: unknown[] = [];
      const conditions: string[] = [];

      if (options?.role) {
        params.push(options.role);
        conditions.push(`u.role = $${params.length}`);
      }
      if (options?.status) {
        params.push(options.status);
        conditions.push(`u.status = $${params.length}`);
      }
      if (options?.search?.trim()) {
        params.push(`%${options.search.trim()}%`);
        conditions.push(`(u.username ILIKE $${params.length} OR u.email ILIKE $${params.length})`);
      }

      const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const countRes = await this.pool.query(
        `SELECT COUNT(*)::int AS cnt FROM users u ${whereSql};`,
        params,
      );
      const total = Number.parseInt(String(countRes.rows[0]?.cnt ?? 0), 10);

      params.push(limit, offset);
      const res = await this.pool.query(
        `SELECT u.*,
                (SELECT COUNT(*)::int FROM user_sessions us WHERE us.user_id = u.id AND us.is_revoked = FALSE AND us.expires_at > NOW()) AS sessions_count
         FROM users u
         ${whereSql}
         ORDER BY u.created_at DESC
         LIMIT $${params.length - 1} OFFSET $${params.length};`,
        params,
      );

      return {
        users: res.rows.map((r) => ({
          id: String(r.id),
          username: String(r.username),
          email: String(r.email),
          role: r.role as UserRole,
          status: r.status as UserStatus,
          karmaScore: Number.parseInt(String(r.karma_score ?? 0), 10),
          threadsCount: Number.parseInt(String(r.threads_count ?? 0), 10),
          sessionsCount: Number.parseInt(String(r.sessions_count ?? 0), 10),
          avatarUrl: r.avatar_url ? String(r.avatar_url) : null,
          createdAt: new Date(String(r.created_at)).toISOString(),
        })),
        total,
      };
    } catch (err) {
      throw new ModerationDatabaseError('Lỗi liệt kê danh sách người dùng quản trị', err);
    }
  }

  public async findUserById(userId: string): Promise<ModUserSummaryEntity | null> {
    if (!isUuid(userId)) return null;
    try {
      const res = await this.pool.query('SELECT * FROM users WHERE id = $1 LIMIT 1;', [userId]);
      if (!res.rows[0]) return null;
      const r = res.rows[0];
      return {
        id: String(r.id),
        username: String(r.username),
        email: String(r.email),
        role: r.role as UserRole,
        status: r.status as UserStatus,
        karmaScore: Number.parseInt(String(r.karma_score ?? 0), 10),
        avatarUrl: r.avatar_url ? String(r.avatar_url) : null,
        bio: r.bio ? String(r.bio) : null,
        createdAt: new Date(String(r.created_at)),
        updatedAt: new Date(String(r.updated_at)),
      };
    } catch (err) {
      throw new ModerationDatabaseError('Lỗi tìm người dùng quản trị', err);
    }
  }

  public async updateUserRole(userId: string, role: UserRole): Promise<void> {
    try {
      await this.pool.query('UPDATE users SET role = $2, updated_at = NOW() WHERE id = $1;', [
        userId,
        role,
      ]);
    } catch (err) {
      throw new ModerationDatabaseError('Lỗi cập nhật vai trò người dùng', err);
    }
  }

  public async updateUserStatus(userId: string, status: UserStatus): Promise<void> {
    try {
      await this.pool.query('UPDATE users SET status = $2, updated_at = NOW() WHERE id = $1;', [
        userId,
        status,
      ]);
    } catch (err) {
      throw new ModerationDatabaseError('Lỗi cập nhật trạng thái tài khoản', err);
    }
  }

  public async revokeUserSessionsInDb(userId: string): Promise<void> {
    if (!isUuid(userId)) return;
    try {
      await this.pool.query(
        'UPDATE user_sessions SET is_revoked = TRUE, updated_at = NOW() WHERE user_id = $1 AND is_revoked = FALSE;',
        [userId],
      );
    } catch (err) {
      throw new ModerationDatabaseError('Lỗi thu hồi phiên làm việc trong PostgreSQL', err);
    }
  }

  public async adminListSpaces(): Promise<SpaceEntity[]> {
    try {
      const res = await this.pool.query(
        'SELECT * FROM spaces ORDER BY member_count DESC, created_at DESC;',
      );
      return res.rows.map((r) => ({
        id: String(r.id),
        name: String(r.name),
        slug: String(r.slug),
        topic: String(r.topic ?? 'DevOps & SRE'),
        description: r.description ? String(r.description) : null,
        iconUrl: r.icon_url ? String(r.icon_url) : null,
        bannerUrl: r.banner_url ? String(r.banner_url) : null,
        rules: Array.isArray(r.rules)
          ? (r.rules as Array<{ title: string; description: string }>)
          : [],
        isPrivate: Boolean(r.is_private),
        creatorId: String(r.creator_id),
        memberCount: Number.parseInt(String(r.member_count ?? 0), 10),
        threadCount: Number.parseInt(String(r.thread_count ?? 0), 10),
        createdAt: new Date(String(r.created_at)).toISOString(),
        updatedAt: new Date(String(r.updated_at)).toISOString(),
      }));
    } catch (err) {
      throw new ModerationDatabaseError('Lỗi liệt kê toàn bộ không gian', err);
    }
  }

  public async deleteSpace(spaceId: string): Promise<boolean> {
    if (!isUuid(spaceId)) return false;
    try {
      const res = await this.pool.query('DELETE FROM spaces WHERE id = $1;', [spaceId]);
      return (res.rowCount ?? 0) > 0;
    } catch (err) {
      throw new ModerationDatabaseError('Lỗi xóa không gian thảo luận', err);
    }
  }

  public async adminListThreads(options?: {
    spaceId?: string | undefined;
    search?: string | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
  }): Promise<{ threads: ThreadEntity[]; total: number }> {
    try {
      const limit = options?.limit ?? 50;
      const offset = options?.offset ?? 0;
      const params: unknown[] = [];
      const conditions: string[] = [];

      if (options?.spaceId && isUuid(options.spaceId)) {
        params.push(options.spaceId);
        conditions.push(`t.space_id = $${params.length}`);
      }
      if (options?.search?.trim()) {
        params.push(`%${options.search.trim()}%`);
        conditions.push(`t.title ILIKE $${params.length}`);
      }

      const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const countRes = await this.pool.query(
        `SELECT COUNT(*)::int AS cnt FROM threads t ${whereSql};`,
        params,
      );
      const total = Number.parseInt(String(countRes.rows[0]?.cnt ?? 0), 10);

      params.push(limit, offset);
      const res = await this.pool.query(
        `SELECT t.*, s.slug AS space_slug, s.name AS space_name, u.username AS author_username
         FROM threads t
         LEFT JOIN spaces s ON t.space_id = s.id
         LEFT JOIN users u ON t.author_id = u.id
         ${whereSql}
         ORDER BY t.created_at DESC
         LIMIT $${params.length - 1} OFFSET $${params.length};`,
        params,
      );

      const threads: ThreadEntity[] = res.rows.map((r) => ({
        id: String(r.id),
        spaceId: String(r.space_id),
        spaceSlug: r.space_slug ? String(r.space_slug) : undefined,
        spaceName: r.space_name ? String(r.space_name) : undefined,
        authorId: String(r.author_id),
        authorUsername: r.author_username ? String(r.author_username) : undefined,
        flairId: r.flair_id ? String(r.flair_id) : null,
        title: String(r.title),
        slug: String(r.slug),
        content: r.content !== null && r.content !== undefined ? String(r.content) : null,
        linkUrl: r.link_url ? String(r.link_url) : null,
        threadType: (r.thread_type as 'TEXT' | 'LINK' | 'MEDIA') || 'TEXT',
        upvotesCount: Number.parseInt(String(r.upvotes_count ?? 0), 10),
        downvotesCount: Number.parseInt(String(r.downvotes_count ?? 0), 10),
        commentCount: Number.parseInt(String(r.comment_count ?? 0), 10),
        isPinned: Boolean(r.is_pinned),
        isLocked: Boolean(r.is_locked),
        createdAt: new Date(String(r.created_at)).toISOString(),
        updatedAt: new Date(String(r.updated_at)).toISOString(),
      }));

      return { threads, total };
    } catch (err) {
      throw new ModerationDatabaseError('Lỗi liệt kê bài viết quản trị', err);
    }
  }

  public async setThreadPinned(threadId: string, isPinned: boolean): Promise<void> {
    try {
      await this.pool.query(
        'UPDATE threads SET is_pinned = $2, updated_at = NOW() WHERE id = $1;',
        [threadId, isPinned],
      );
    } catch (err) {
      throw new ModerationDatabaseError('Lỗi ghim/bỏ ghim bài viết', err);
    }
  }

  public async setThreadLocked(threadId: string, isLocked: boolean): Promise<void> {
    try {
      await this.pool.query(
        'UPDATE threads SET is_locked = $2, updated_at = NOW() WHERE id = $1;',
        [threadId, isLocked],
      );
    } catch (err) {
      throw new ModerationDatabaseError('Lỗi khóa/mở khóa bài viết', err);
    }
  }

  public async deleteThread(threadId: string): Promise<boolean> {
    if (!isUuid(threadId)) return false;
    try {
      const res = await this.pool.query('DELETE FROM threads WHERE id = $1;', [threadId]);
      return (res.rowCount ?? 0) > 0;
    } catch (err) {
      throw new ModerationDatabaseError('Lỗi xóa bài viết', err);
    }
  }
}
