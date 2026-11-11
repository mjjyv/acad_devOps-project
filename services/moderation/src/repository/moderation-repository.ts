/**
 * @file moderation-repository.ts
 * @description Data Access Layer for Moderation, Mod Queue, Audit Logs, and Admin Hub.
 */

import { randomUUID } from 'node:crypto';
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

export interface ReportEntity {
  id: string;
  reporterId: string;
  reporterUsername?: string | undefined;
  targetType: ModReportTargetType;
  targetId: string;
  reason: string;
  status: ModReportStatus;
  resolvedBy?: string | null | undefined;
  resolvedAt?: Date | null | undefined;
  resolutionNote?: string | null | undefined;
  createdAt: Date;
}

export interface AuditLogEntity {
  id: string;
  actorId: string;
  actorUsername: string;
  action: string;
  targetType: string;
  targetId?: string | null | undefined;
  metadata: Record<string, unknown>;
  ipAddress?: string | null | undefined;
  userAgent?: string | null | undefined;
  createdAt: Date;
}

export interface UserSummaryEntity {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  karmaScore: number;
  avatarUrl?: string | null | undefined;
  bio?: string | null | undefined;
  createdAt: Date;
  updatedAt: Date;
}

export interface IModerationRepository {
  // Reports
  createReport(data: {
    reporterId: string;
    targetType: ModReportTargetType;
    targetId: string;
    reason: string;
  }): Promise<ReportEntity>;
  findReportById(id: string): Promise<ReportEntity | null>;
  findExistingReport(
    reporterId: string,
    targetType: ModReportTargetType,
    targetId: string,
  ): Promise<ReportEntity | null>;
  listReports(options?: {
    status?: ModReportStatus | undefined;
    targetType?: ModReportTargetType | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
  }): Promise<{ reports: ReportEntity[]; total: number }>;
  listReportsByReporter(reporterId: string): Promise<ReportEntity[]>;
  updateReportStatus(
    id: string,
    status: 'RESOLVED' | 'DISMISSED',
    resolvedBy: string,
    resolutionNote?: string | null | undefined,
  ): Promise<ReportEntity | null>;
  countPendingReports(): Promise<number>;

  // Audit Logs
  createAuditLog(data: {
    actorId: string;
    actorUsername: string;
    action: string;
    targetType: string;
    targetId?: string | null | undefined;
    metadata?: Record<string, unknown> | undefined;
    ipAddress?: string | null | undefined;
    userAgent?: string | null | undefined;
  }): Promise<AuditLogEntity>;
  listAuditLogs(options?: {
    actorId?: string | undefined;
    action?: string | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
  }): Promise<{ logs: AuditLogEntity[]; total: number }>;

  // Admin Stats
  getSystemStats(): Promise<AdminStats>;

  // Admin User Management
  listUsers(options?: {
    role?: UserRole | undefined;
    status?: UserStatus | undefined;
    search?: string | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
  }): Promise<{ users: AdminUserListItem[]; total: number }>;
  findUserById(userId: string): Promise<UserSummaryEntity | null>;
  updateUserRole(userId: string, role: UserRole): Promise<void>;
  updateUserStatus(userId: string, status: UserStatus): Promise<void>;

  // Admin Spaces & Threads
  adminListSpaces(): Promise<SpaceEntity[]>;
  deleteSpace(spaceId: string): Promise<boolean>;
  adminListThreads(options?: {
    spaceId?: string | undefined;
    search?: string | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
  }): Promise<{ threads: ThreadEntity[]; total: number }>;
  setThreadPinned(threadId: string, isPinned: boolean): Promise<void>;
  setThreadLocked(threadId: string, isLocked: boolean): Promise<void>;
  deleteThread(threadId: string): Promise<boolean>;
}

/**
 * InMemoryModerationRepository: Triển khai kiểm thử tốc độ cao trong bộ nhớ.
 */
export class InMemoryModerationRepository implements IModerationRepository {
  private reports = new Map<string, ReportEntity>();
  private auditLogs: AuditLogEntity[] = [];
  private users = new Map<string, UserSummaryEntity>();
  private spaces = new Map<string, SpaceEntity>();
  private threads = new Map<string, ThreadEntity>();
  private commentsCount = 0;
  private activeSessionsCount = 0;

  // Seeding helpers for tests
  public seedUser(user: UserSummaryEntity): void {
    this.users.set(user.id, user);
  }

  public getUser(id: string): UserSummaryEntity | undefined {
    return this.users.get(id);
  }

  public getThread(id: string): ThreadEntity | undefined {
    return this.threads.get(id);
  }

  public hasThread(id: string): boolean {
    return this.threads.has(id);
  }

  public hasSpace(id: string): boolean {
    return this.spaces.has(id);
  }

  public seedSpace(space: SpaceEntity): void {
    this.spaces.set(space.id, space);
  }

  public seedThread(thread: ThreadEntity): void {
    this.threads.set(thread.id, thread);
  }

  public setCommentsCount(count: number): void {
    this.commentsCount = count;
  }

  public setActiveSessionsCount(count: number): void {
    this.activeSessionsCount = count;
  }

  // --- Reports ---
  public async createReport(data: {
    reporterId: string;
    targetType: ModReportTargetType;
    targetId: string;
    reason: string;
  }): Promise<ReportEntity> {
    const reporter = this.users.get(data.reporterId);
    const report: ReportEntity = {
      id: randomUUID(),
      reporterId: data.reporterId,
      reporterUsername: reporter?.username ?? 'Anonymous',
      targetType: data.targetType,
      targetId: data.targetId,
      reason: data.reason,
      status: 'PENDING',
      resolvedBy: null,
      resolvedAt: null,
      resolutionNote: null,
      createdAt: new Date(),
    };
    this.reports.set(report.id, report);
    return report;
  }

  public async findReportById(id: string): Promise<ReportEntity | null> {
    return this.reports.get(id) ?? null;
  }

  public async findExistingReport(
    reporterId: string,
    targetType: ModReportTargetType,
    targetId: string,
  ): Promise<ReportEntity | null> {
    for (const r of this.reports.values()) {
      if (
        r.reporterId === reporterId &&
        r.targetType === targetType &&
        r.targetId === targetId &&
        r.status === 'PENDING'
      ) {
        return r;
      }
    }
    return null;
  }

  public async listReports(options?: {
    status?: ModReportStatus | undefined;
    targetType?: ModReportTargetType | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
  }): Promise<{ reports: ReportEntity[]; total: number }> {
    let items = Array.from(this.reports.values());
    if (options?.status) {
      items = items.filter((r) => r.status === options.status);
    }
    if (options?.targetType) {
      items = items.filter((r) => r.targetType === options.targetType);
    }
    items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = items.length;
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 50;
    const paginated = items.slice(offset, offset + limit);

    return { reports: paginated, total };
  }

  public async listReportsByReporter(reporterId: string): Promise<ReportEntity[]> {
    return Array.from(this.reports.values())
      .filter((r) => r.reporterId === reporterId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  public async updateReportStatus(
    id: string,
    status: 'RESOLVED' | 'DISMISSED',
    resolvedBy: string,
    resolutionNote?: string | null | undefined,
  ): Promise<ReportEntity | null> {
    const report = this.reports.get(id);
    if (!report) return null;

    report.status = status;
    report.resolvedBy = resolvedBy;
    report.resolvedAt = new Date();
    report.resolutionNote = resolutionNote ?? null;
    return report;
  }

  public async countPendingReports(): Promise<number> {
    return Array.from(this.reports.values()).filter((r) => r.status === 'PENDING').length;
  }

  // --- Audit Logs ---
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
    const log: AuditLogEntity = {
      id: randomUUID(),
      actorId: data.actorId,
      actorUsername: data.actorUsername,
      action: data.action,
      targetType: data.targetType,
      targetId: data.targetId ?? null,
      metadata: data.metadata ?? {},
      ipAddress: data.ipAddress ?? null,
      userAgent: data.userAgent ?? null,
      createdAt: new Date(),
    };
    this.auditLogs.unshift(log);
    return log;
  }

  public async listAuditLogs(options?: {
    actorId?: string | undefined;
    action?: string | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
  }): Promise<{ logs: AuditLogEntity[]; total: number }> {
    let items = [...this.auditLogs];
    if (options?.actorId) {
      items = items.filter((l) => l.actorId === options.actorId);
    }
    if (options?.action) {
      items = items.filter((l) => l.action === options.action);
    }

    const total = items.length;
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 50;
    return { logs: items.slice(offset, offset + limit), total };
  }

  // --- Admin Stats ---
  public async getSystemStats(): Promise<AdminStats> {
    const activeUsersCount = Array.from(this.users.values()).filter(
      (u) => u.status === 'ACTIVE',
    ).length;
    const pendingReportsCount = await this.countPendingReports();

    return {
      activeUsersCount,
      activeSessionsCount: this.activeSessionsCount,
      spacesCount: this.spaces.size,
      threadsCount: this.threads.size,
      commentsCount: this.commentsCount,
      pendingReportsCount,
    };
  }

  // --- User Management ---
  public async listUsers(options?: {
    role?: UserRole | undefined;
    status?: UserStatus | undefined;
    search?: string | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
  }): Promise<{ users: AdminUserListItem[]; total: number }> {
    let list = Array.from(this.users.values());
    if (options?.role) {
      list = list.filter((u) => u.role === options.role);
    }
    if (options?.status) {
      list = list.filter((u) => u.status === options.status);
    }
    if (options?.search) {
      const q = options.search.toLowerCase();
      list = list.filter(
        (u) => u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
      );
    }
    list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = list.length;
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 50;

    // Tính toán số threadsCount cho từng người dùng
    const userThreadCounts: Record<string, number> = {};
    for (const t of this.threads.values()) {
      userThreadCounts[t.authorId] = (userThreadCounts[t.authorId] ?? 0) + 1;
    }

    const items: AdminUserListItem[] = list.slice(offset, offset + limit).map((u) => ({
      id: u.id,
      username: u.username,
      email: u.email,
      role: u.role,
      status: u.status,
      karmaScore: u.karmaScore,
      threadsCount: userThreadCounts[u.id] ?? 0,
      sessionsCount: 1,
      avatarUrl: u.avatarUrl ?? null,
      createdAt: u.createdAt.toISOString(),
    }));

    return { users: items, total };
  }

  public async findUserById(userId: string): Promise<UserSummaryEntity | null> {
    return this.users.get(userId) ?? null;
  }

  public async updateUserRole(userId: string, role: UserRole): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.role = role;
      user.updatedAt = new Date();
    }
  }

  public async updateUserStatus(userId: string, status: UserStatus): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.status = status;
      user.updatedAt = new Date();
    }
  }

  // --- Spaces & Threads Override ---
  public async adminListSpaces(): Promise<SpaceEntity[]> {
    return Array.from(this.spaces.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  public async deleteSpace(spaceId: string): Promise<boolean> {
    const existed = this.spaces.delete(spaceId);
    if (existed) {
      // Xóa cascade các thread thuộc space
      for (const [tid, t] of this.threads.entries()) {
        if (t.spaceId === spaceId) {
          this.threads.delete(tid);
        }
      }
    }
    return existed;
  }

  public async adminListThreads(options?: {
    spaceId?: string | undefined;
    search?: string | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
  }): Promise<{ threads: ThreadEntity[]; total: number }> {
    let list = Array.from(this.threads.values());
    if (options?.spaceId) {
      list = list.filter((t) => t.spaceId === options.spaceId);
    }
    if (options?.search) {
      const q = options.search.toLowerCase();
      list = list.filter(
        (t) => t.title.toLowerCase().includes(q) || t.content?.toLowerCase().includes(q),
      );
    }
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = list.length;
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 50;
    return { threads: list.slice(offset, offset + limit), total };
  }

  public async setThreadPinned(threadId: string, isPinned: boolean): Promise<void> {
    const thread = this.threads.get(threadId);
    if (thread) {
      thread.isPinned = isPinned;
      thread.updatedAt = new Date().toISOString();
    }
  }

  public async setThreadLocked(threadId: string, isLocked: boolean): Promise<void> {
    const thread = this.threads.get(threadId);
    if (thread) {
      thread.isLocked = isLocked;
      thread.updatedAt = new Date().toISOString();
    }
  }

  public async deleteThread(threadId: string): Promise<boolean> {
    return this.threads.delete(threadId);
  }
}

/**
 * PostgresModerationRepository: Triển khai trực tiếp trên PostgreSQL 16 cho Production.
 */
export class PostgresModerationRepository implements IModerationRepository {
  constructor(private pool: pg.Pool) {}

  public async createReport(data: {
    reporterId: string;
    targetType: ModReportTargetType;
    targetId: string;
    reason: string;
  }): Promise<ReportEntity> {
    const query = `
      INSERT INTO reports (reporter_id, target_type, target_id, reason, status)
      VALUES ($1, $2, $3, $4, 'PENDING')
      RETURNING id, reporter_id, target_type, target_id, reason, status, resolved_by, resolved_at, resolution_note, created_at
    `;

    let r: Record<string, unknown>;
    try {
      const res = await this.pool.query(query, [
        data.reporterId,
        data.targetType,
        data.targetId,
        data.reason,
      ]);
      r = res.rows[0];
    } catch (err: unknown) {
      const pgErr = err as { code?: string };
      if (pgErr?.code === '23505') {
        throw new DuplicateReportError(data.targetType, data.targetId);
      }
      throw err;
    }

    const uRes = await this.pool.query('SELECT username FROM users WHERE id = $1', [
      data.reporterId,
    ]);
    const username = uRes.rows[0]?.username ?? 'Anonymous';

    return {
      id: r.id as string,
      reporterId: r.reporter_id as string,
      reporterUsername: username,
      targetType: r.target_type as ModReportTargetType,
      targetId: r.target_id as string,
      reason: r.reason as string,
      status: r.status as ModReportStatus,
      resolvedBy: (r.resolved_by as string | null) ?? null,
      resolvedAt: r.resolved_at ? new Date(r.resolved_at as string | Date) : null,
      resolutionNote: (r.resolution_note as string | null) ?? null,
      createdAt: new Date(r.created_at as string | Date),
    };
  }

  public async findReportById(id: string): Promise<ReportEntity | null> {
    const query = `
      SELECT r.*, u.username AS reporter_username
      FROM reports r
      LEFT JOIN users u ON r.reporter_id = u.id
      WHERE r.id = $1
    `;
    const res = await this.pool.query(query, [id]);
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      id: r.id,
      reporterId: r.reporter_id,
      reporterUsername: r.reporter_username,
      targetType: r.target_type,
      targetId: r.target_id,
      reason: r.reason,
      status: r.status,
      resolvedBy: r.resolved_by,
      resolvedAt: r.resolved_at ? new Date(r.resolved_at) : null,
      resolutionNote: r.resolution_note,
      createdAt: new Date(r.created_at),
    };
  }

  public async findExistingReport(
    reporterId: string,
    targetType: ModReportTargetType,
    targetId: string,
  ): Promise<ReportEntity | null> {
    const query = `
      SELECT id FROM reports
      WHERE reporter_id = $1 AND target_type = $2 AND target_id = $3 AND status = 'PENDING'
      LIMIT 1
    `;
    const res = await this.pool.query(query, [reporterId, targetType, targetId]);
    if (res.rows.length === 0) return null;
    return this.findReportById(res.rows[0].id);
  }

  public async listReports(options?: {
    status?: ModReportStatus | undefined;
    targetType?: ModReportTargetType | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
  }): Promise<{ reports: ReportEntity[]; total: number }> {
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

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await this.pool.query(
      `SELECT COUNT(*)::int AS total FROM reports r ${whereClause}`,
      params,
    );
    const total = countRes.rows[0]?.total ?? 0;

    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;
    params.push(limit, offset);

    const query = `
      SELECT r.*, u.username AS reporter_username
      FROM reports r
      LEFT JOIN users u ON r.reporter_id = u.id
      ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;
    const res = await this.pool.query(query, params);

    const reports: ReportEntity[] = res.rows.map((r) => ({
      id: r.id,
      reporterId: r.reporter_id,
      reporterUsername: r.reporter_username,
      targetType: r.target_type,
      targetId: r.target_id,
      reason: r.reason,
      status: r.status,
      resolvedBy: r.resolved_by,
      resolvedAt: r.resolved_at ? new Date(r.resolved_at) : null,
      resolutionNote: r.resolution_note,
      createdAt: new Date(r.created_at),
    }));

    return { reports, total };
  }

  public async listReportsByReporter(reporterId: string): Promise<ReportEntity[]> {
    const query = `
      SELECT r.*, u.username AS reporter_username
      FROM reports r
      LEFT JOIN users u ON r.reporter_id = u.id
      WHERE r.reporter_id = $1
      ORDER BY r.created_at DESC
    `;
    const res = await this.pool.query(query, [reporterId]);
    return res.rows.map((r) => ({
      id: r.id,
      reporterId: r.reporter_id,
      reporterUsername: r.reporter_username,
      targetType: r.target_type,
      targetId: r.target_id,
      reason: r.reason,
      status: r.status,
      resolvedBy: r.resolved_by,
      resolvedAt: r.resolved_at ? new Date(r.resolved_at) : null,
      resolutionNote: r.resolution_note,
      createdAt: new Date(r.created_at),
    }));
  }

  public async updateReportStatus(
    id: string,
    status: 'RESOLVED' | 'DISMISSED',
    resolvedBy: string,
    resolutionNote?: string | null | undefined,
  ): Promise<ReportEntity | null> {
    const query = `
      UPDATE reports
      SET status = $1, resolved_by = $2, resolved_at = NOW(), resolution_note = $3
      WHERE id = $4
      RETURNING *
    `;
    const res = await this.pool.query(query, [status, resolvedBy, resolutionNote ?? null, id]);
    if (res.rows.length === 0) return null;
    return this.findReportById(id);
  }

  public async countPendingReports(): Promise<number> {
    const res = await this.pool.query(
      "SELECT COUNT(*)::int AS count FROM reports WHERE status = 'PENDING'",
    );
    return res.rows[0]?.count ?? 0;
  }

  // --- Audit Logs ---
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
    const query = `
      INSERT INTO audit_logs (actor_id, action, target_type, target_id, metadata, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const res = await this.pool.query(query, [
      data.actorId,
      data.action,
      data.targetType,
      data.targetId ?? null,
      JSON.stringify(data.metadata ?? {}),
      data.ipAddress ?? null,
      data.userAgent ?? null,
    ]);
    const r = res.rows[0];
    return {
      id: r.id,
      actorId: r.actor_id,
      actorUsername: data.actorUsername,
      action: r.action,
      targetType: r.target_type,
      targetId: r.target_id,
      metadata: r.metadata ?? {},
      ipAddress: r.ip_address,
      userAgent: r.user_agent,
      createdAt: new Date(r.created_at),
    };
  }

  public async listAuditLogs(options?: {
    actorId?: string | undefined;
    action?: string | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
  }): Promise<{ logs: AuditLogEntity[]; total: number }> {
    const params: unknown[] = [];
    const conditions: string[] = [];

    if (options?.actorId) {
      params.push(options.actorId);
      conditions.push(`a.actor_id = $${params.length}`);
    }
    if (options?.action) {
      params.push(options.action);
      conditions.push(`a.action = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const countRes = await this.pool.query(
      `SELECT COUNT(*)::int AS total FROM audit_logs a ${whereClause}`,
      params,
    );
    const total = countRes.rows[0]?.total ?? 0;

    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;
    params.push(limit, offset);

    const query = `
      SELECT a.*, u.username AS actor_username
      FROM audit_logs a
      LEFT JOIN users u ON a.actor_id = u.id
      ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;
    const res = await this.pool.query(query, params);

    const logs: AuditLogEntity[] = res.rows.map((r) => ({
      id: r.id,
      actorId: r.actor_id,
      actorUsername: r.actor_username ?? 'System',
      action: r.action,
      targetType: r.target_type,
      targetId: r.target_id,
      metadata: r.metadata ?? {},
      ipAddress: r.ip_address,
      userAgent: r.user_agent,
      createdAt: new Date(r.created_at),
    }));

    return { logs, total };
  }

  // --- Admin Stats ---
  public async getSystemStats(): Promise<AdminStats> {
    const statsQuery = `
      SELECT
        (SELECT COUNT(*)::int FROM users WHERE status = 'ACTIVE') AS active_users,
        (SELECT COUNT(*)::int FROM user_sessions WHERE grace_period_expires_at IS NULL OR grace_period_expires_at > NOW()) AS active_sessions,
        (SELECT COUNT(*)::int FROM spaces) AS spaces_count,
        (SELECT COUNT(*)::int FROM threads) AS threads_count,
        (SELECT COUNT(*)::int FROM comments WHERE is_deleted = false) AS comments_count,
        (SELECT COUNT(*)::int FROM reports WHERE status = 'PENDING') AS pending_reports
    `;
    const res = await this.pool.query(statsQuery);
    const r = res.rows[0] ?? {};

    return {
      activeUsersCount: r.active_users ?? 0,
      activeSessionsCount: r.active_sessions ?? 0,
      spacesCount: r.spaces_count ?? 0,
      threadsCount: r.threads_count ?? 0,
      commentsCount: r.comments_count ?? 0,
      pendingReportsCount: r.pending_reports ?? 0,
    };
  }

  // --- User Management ---
  public async listUsers(options?: {
    role?: UserRole | undefined;
    status?: UserStatus | undefined;
    search?: string | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
  }): Promise<{ users: AdminUserListItem[]; total: number }> {
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
    if (options?.search) {
      params.push(`%${options.search}%`);
      conditions.push(`(u.username ILIKE $${params.length} OR u.email ILIKE $${params.length})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const countRes = await this.pool.query(
      `SELECT COUNT(*)::int AS total FROM users u ${whereClause}`,
      params,
    );
    const total = countRes.rows[0]?.total ?? 0;

    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;
    params.push(limit, offset);

    const query = `
      SELECT u.id, u.username, u.email, u.role, u.status, u.karma_score, u.avatar_url, u.created_at,
             (SELECT COUNT(*)::int FROM threads t WHERE t.author_id = u.id) AS threads_count,
             (SELECT COUNT(*)::int FROM user_sessions s WHERE s.user_id = u.id) AS sessions_count
      FROM users u
      ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;
    const res = await this.pool.query(query, params);

    const users: AdminUserListItem[] = res.rows.map((r) => ({
      id: r.id,
      username: r.username,
      email: r.email,
      role: r.role,
      status: r.status,
      karmaScore: r.karma_score ?? 0,
      threadsCount: r.threads_count ?? 0,
      sessionsCount: r.sessions_count ?? 0,
      avatarUrl: r.avatar_url,
      createdAt: new Date(r.created_at).toISOString(),
    }));

    return { users, total };
  }

  public async findUserById(userId: string): Promise<UserSummaryEntity | null> {
    const res = await this.pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      id: r.id,
      username: r.username,
      email: r.email,
      role: r.role,
      status: r.status,
      karmaScore: r.karma_score ?? 0,
      avatarUrl: r.avatar_url,
      bio: r.bio,
      createdAt: new Date(r.created_at),
      updatedAt: new Date(r.updated_at),
    };
  }

  public async updateUserRole(userId: string, role: UserRole): Promise<void> {
    await this.pool.query('UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2', [
      role,
      userId,
    ]);
  }

  public async updateUserStatus(userId: string, status: UserStatus): Promise<void> {
    await this.pool.query('UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2', [
      status,
      userId,
    ]);
  }

  // --- Spaces & Threads Override ---
  public async adminListSpaces(): Promise<SpaceEntity[]> {
    const res = await this.pool.query(
      'SELECT * FROM spaces ORDER BY member_count DESC, created_at DESC',
    );
    return res.rows.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      description: r.description,
      iconUrl: r.icon_url ?? null,
      bannerUrl: r.banner_url,
      rules: r.rules ?? [],
      creatorId: r.creator_id,
      memberCount: r.member_count ?? 1,
      threadCount: r.thread_count ?? 0,
      isPrivate: Boolean(r.is_private),
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString(),
    }));
  }

  public async deleteSpace(spaceId: string): Promise<boolean> {
    const res = await this.pool.query('DELETE FROM spaces WHERE id = $1', [spaceId]);
    return (res.rowCount ?? 0) > 0;
  }

  public async adminListThreads(options?: {
    spaceId?: string | undefined;
    search?: string | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
  }): Promise<{ threads: ThreadEntity[]; total: number }> {
    const params: unknown[] = [];
    const conditions: string[] = [];

    if (options?.spaceId) {
      params.push(options.spaceId);
      conditions.push(`t.space_id = $${params.length}`);
    }
    if (options?.search) {
      params.push(`%${options.search}%`);
      conditions.push(`(t.title ILIKE $${params.length} OR t.content ILIKE $${params.length})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const countRes = await this.pool.query(
      `SELECT COUNT(*)::int AS total FROM threads t ${whereClause}`,
      params,
    );
    const total = countRes.rows[0]?.total ?? 0;

    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;
    params.push(limit, offset);

    const query = `
      SELECT
        t.*,
        COALESCE(tc.upvotes, t.upvotes_count) AS effective_upvotes,
        COALESCE(tc.downvotes, t.downvotes_count) AS effective_downvotes,
        COALESCE(tc.comment_count, t.comment_count) AS effective_comment_count
      FROM threads t
      LEFT JOIN thread_counters tc ON t.id = tc.thread_id
      ${whereClause}
      ORDER BY t.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;
    const res = await this.pool.query(query, params);

    const threads: ThreadEntity[] = res.rows.map((r) => ({
      id: r.id,
      spaceId: r.space_id,
      authorId: r.author_id,
      flairId: r.flair_id,
      title: r.title,
      slug: r.slug,
      content: r.content,
      linkUrl: r.link_url,
      threadType: r.thread_type,
      upvotesCount: r.effective_upvotes ?? r.upvotes_count ?? 0,
      downvotesCount: r.effective_downvotes ?? r.downvotes_count ?? 0,
      commentCount: r.effective_comment_count ?? r.comment_count ?? 0,
      isPinned: r.is_pinned ?? false,
      isLocked: r.is_locked ?? false,
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString(),
    }));

    return { threads, total };
  }

  public async setThreadPinned(threadId: string, isPinned: boolean): Promise<void> {
    await this.pool.query('UPDATE threads SET is_pinned = $1, updated_at = NOW() WHERE id = $2', [
      isPinned,
      threadId,
    ]);
  }

  public async setThreadLocked(threadId: string, isLocked: boolean): Promise<void> {
    await this.pool.query('UPDATE threads SET is_locked = $1, updated_at = NOW() WHERE id = $2', [
      isLocked,
      threadId,
    ]);
  }

  public async deleteThread(threadId: string): Promise<boolean> {
    const res = await this.pool.query('DELETE FROM threads WHERE id = $1', [threadId]);
    return (res.rowCount ?? 0) > 0;
  }
}
