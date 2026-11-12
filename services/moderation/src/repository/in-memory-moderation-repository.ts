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
import type {
  AuditLogEntity,
  IModerationRepository,
  ModUserSummaryEntity,
  ReportEntity,
} from './moderation-repository.js';

/** High-speed isolated In-Memory Moderation Repository for Unit Testing. */
export class InMemoryModerationRepository implements IModerationRepository {
  private readonly reports = new Map<string, ReportEntity>();
  private readonly auditLogs: AuditLogEntity[] = [];
  private readonly users = new Map<string, ModUserSummaryEntity>();
  private readonly spaces = new Map<string, SpaceEntity>();
  private readonly threads = new Map<string, ThreadEntity>();

  public seedUser(user: ModUserSummaryEntity): void {
    this.users.set(user.id, { ...user });
  }

  public seedSpace(space: SpaceEntity): void {
    this.spaces.set(space.id, { ...space });
  }

  public seedThread(thread: ThreadEntity): void {
    this.threads.set(thread.id, { ...thread });
  }

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
      reporterUsername: reporter?.username,
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
    if (options?.status) items = items.filter((r) => r.status === options.status);
    if (options?.targetType) items = items.filter((r) => r.targetType === options.targetType);

    items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 50;
    return {
      reports: items.slice(offset, offset + limit),
      total: items.length,
    };
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
    const r = this.reports.get(id);
    if (!r) return null;
    r.status = status;
    r.resolvedBy = resolvedBy;
    r.resolvedAt = new Date();
    r.resolutionNote = resolutionNote ?? null;
    return r;
  }

  public async countPendingReports(): Promise<number> {
    let cnt = 0;
    for (const r of this.reports.values()) {
      if (r.status === 'PENDING') cnt += 1;
    }
    return cnt;
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
    const entry: AuditLogEntity = {
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
    this.auditLogs.unshift(entry);
    return entry;
  }

  public async listAuditLogs(options?: {
    actorId?: string | undefined;
    action?: string | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
  }): Promise<{ logs: AuditLogEntity[]; total: number }> {
    let items = [...this.auditLogs];
    if (options?.actorId) items = items.filter((l) => l.actorId === options.actorId);
    if (options?.action) items = items.filter((l) => l.action === options.action);

    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 50;
    return { logs: items.slice(offset, offset + limit), total: items.length };
  }

  public async getSystemStats(): Promise<AdminStats> {
    return {
      activeUsersCount: Array.from(this.users.values()).filter((u) => u.status === 'ACTIVE').length,
      activeSessionsCount: 0,
      spacesCount: this.spaces.size,
      threadsCount: this.threads.size,
      commentsCount: 0,
      pendingReportsCount: await this.countPendingReports(),
    };
  }

  public async listUsers(options?: {
    role?: UserRole | undefined;
    status?: UserStatus | undefined;
    search?: string | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
  }): Promise<{ users: AdminUserListItem[]; total: number }> {
    let items = Array.from(this.users.values());
    if (options?.role) items = items.filter((u) => u.role === options.role);
    if (options?.status) items = items.filter((u) => u.status === options.status);
    if (options?.search) {
      const q = options.search.toLowerCase();
      items = items.filter(
        (u) => u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
      );
    }

    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 50;
    const sliced = items.slice(offset, offset + limit).map((u) => ({
      id: u.id,
      username: u.username,
      email: u.email,
      role: u.role,
      status: u.status,
      karmaScore: u.karmaScore,
      threadsCount: Array.from(this.threads.values()).filter((t) => t.authorId === u.id).length,
      sessionsCount: 0,
      avatarUrl: u.avatarUrl ?? null,
      createdAt: u.createdAt.toISOString(),
    }));

    return { users: sliced, total: items.length };
  }

  public async findUserById(userId: string): Promise<ModUserSummaryEntity | null> {
    return this.users.get(userId) ?? null;
  }

  public async updateUserRole(userId: string, role: UserRole): Promise<void> {
    const u = this.users.get(userId);
    if (u) {
      u.role = role;
      u.updatedAt = new Date();
    }
  }

  public async updateUserStatus(userId: string, status: UserStatus): Promise<void> {
    const u = this.users.get(userId);
    if (u) {
      u.status = status;
      u.updatedAt = new Date();
    }
  }

  public async adminListSpaces(): Promise<SpaceEntity[]> {
    return Array.from(this.spaces.values());
  }

  public async deleteSpace(spaceId: string): Promise<boolean> {
    return this.spaces.delete(spaceId);
  }

  public async adminListThreads(options?: {
    spaceId?: string | undefined;
    search?: string | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
  }): Promise<{ threads: ThreadEntity[]; total: number }> {
    let items = Array.from(this.threads.values());
    if (options?.spaceId) items = items.filter((t) => t.spaceId === options.spaceId);
    if (options?.search) {
      const q = options.search.toLowerCase();
      items = items.filter((t) => t.title.toLowerCase().includes(q));
    }
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 50;
    return { threads: items.slice(offset, offset + limit), total: items.length };
  }

  public async setThreadPinned(threadId: string, isPinned: boolean): Promise<void> {
    const t = this.threads.get(threadId);
    if (t) t.isPinned = isPinned;
  }

  public async setThreadLocked(threadId: string, isLocked: boolean): Promise<void> {
    const t = this.threads.get(threadId);
    if (t) t.isLocked = isLocked;
  }

  public async deleteThread(threadId: string): Promise<boolean> {
    return this.threads.delete(threadId);
  }
}
