/**
 * @file moderation-service.ts
 * @description Core Moderation & System Administration Service coordinating reports queue,
 * shadowban enforcement, audit logging, system metrics, and administrative overrides.
 */

import type { ISessionStore } from '@acad/auth-service';
import type { SpaceEntity, ThreadEntity } from '@acad/community-service';
import type {
  AdminStats,
  AdminUserListItem,
  AuditLog,
  CreateReportInput,
  ModReport,
  ModReportStatus,
  ModReportTargetType,
  ResolveReportInput,
  UserRole,
  UserStatus,
} from '@acad/contracts';
import type {
  AuditLogEntity,
  IModerationRepository,
  ReportEntity,
} from '../repository/moderation-repository.js';

// ==============================================================================
// CUSTOM DOMAIN EXCEPTIONS (Ánh xạ chuẩn RFC 7807)
// ==============================================================================
export class ReportNotFoundError extends Error {
  constructor(reportId: string) {
    super(`Không tìm thấy báo cáo vi phạm với mã định danh: ${reportId}`);
    this.name = 'ReportNotFoundError';
  }
}

export class DuplicateReportError extends Error {
  constructor(targetType: string, targetId: string) {
    super(`Bạn đã gửi báo cáo vi phạm cho đối tượng ${targetType} (${targetId}) và đang chờ xử lý`);
    this.name = 'DuplicateReportError';
  }
}

export class InvalidReportActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidReportActionError';
  }
}

export class UnauthorizedAdminActionError extends Error {
  constructor(action: string) {
    super(`Bạn không đủ thẩm quyền quản trị để thực hiện hành động: ${action}`);
    this.name = 'UnauthorizedAdminActionError';
  }
}

export class TargetNotFoundError extends Error {
  constructor(targetType: string, targetId: string) {
    super(`Không tìm thấy đối tượng ${targetType} với mã định danh: ${targetId}`);
    this.name = 'TargetNotFoundError';
  }
}

export interface SecurityContext {
  ipAddress?: string | null | undefined;
  userAgent?: string | null | undefined;
}

export class ModerationService {
  constructor(
    private readonly repository: IModerationRepository,
    private readonly sessionStore?: ISessionStore | undefined,
  ) {}

  // ============================================================================
  // 1. MOD REPORT QUEUE
  // ============================================================================

  public async submitReport(
    reporterId: string,
    reporterUsername: string,
    input: CreateReportInput,
  ): Promise<ModReport> {
    // Prevent duplicate pending reports from the same reporter
    const existing = await this.repository.findExistingReport(
      reporterId,
      input.targetType,
      input.targetId,
    );
    if (existing && existing.status === 'PENDING') {
      throw new DuplicateReportError(input.targetType, input.targetId);
    }

    const created = await this.repository.createReport({
      reporterId,
      targetType: input.targetType,
      targetId: input.targetId,
      reason: input.reason,
    });

    const effectiveUsername =
      created.reporterUsername && created.reporterUsername !== 'Anonymous'
        ? created.reporterUsername
        : reporterUsername || 'Anonymous';

    return this.mapReportEntityToContract({
      ...created,
      reporterUsername: effectiveUsername,
    });
  }

  public async resolveReport(
    adminId: string,
    adminUsername: string,
    reportId: string,
    input: ResolveReportInput,
    context?: SecurityContext,
  ): Promise<ModReport> {
    const existing = await this.repository.findReportById(reportId);
    if (!existing) {
      throw new ReportNotFoundError(reportId);
    }

    const updated = await this.repository.updateReportStatus(
      reportId,
      input.status,
      adminId,
      input.note,
    );

    if (!updated) {
      throw new ReportNotFoundError(reportId);
    }

    // Write audit log
    await this.repository.createAuditLog({
      actorId: adminId,
      actorUsername: adminUsername,
      action: 'REPORT_RESOLVE',
      targetType: 'REPORT',
      targetId: reportId,
      metadata: {
        status: input.status,
        note: input.note || null,
        targetType: existing.targetType,
        targetId: existing.targetId,
      },
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    return this.mapReportEntityToContract(updated);
  }

  public async listReports(options?: {
    status?: ModReportStatus | undefined;
    targetType?: ModReportTargetType | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
  }): Promise<{ reports: ModReport[]; total: number }> {
    const result = await this.repository.listReports(options);
    return {
      reports: result.reports.map((r) => this.mapReportEntityToContract(r)),
      total: result.total,
    };
  }

  public async listReportsByReporter(reporterId: string): Promise<ModReport[]> {
    const list = await this.repository.listReportsByReporter(reporterId);
    return list.map((r) => this.mapReportEntityToContract(r));
  }

  // ============================================================================
  // 2. SYSTEM STATS & METRICS
  // ============================================================================

  public async getAdminStats(): Promise<AdminStats> {
    return this.repository.getSystemStats();
  }

  // ============================================================================
  // 3. USER MANAGEMENT & SESSIONS
  // ============================================================================

  public async listUsers(options?: {
    role?: UserRole | undefined;
    status?: UserStatus | undefined;
    search?: string | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
  }): Promise<{ users: AdminUserListItem[]; total: number }> {
    return this.repository.listUsers(options);
  }

  public async updateUserRole(
    adminId: string,
    adminUsername: string,
    targetUserId: string,
    newRole: UserRole,
    context?: SecurityContext,
  ): Promise<void> {
    const user = await this.repository.findUserById(targetUserId);
    if (!user) {
      throw new TargetNotFoundError('User', targetUserId);
    }
    const oldRole = user.role;

    await this.repository.updateUserRole(targetUserId, newRole);

    // Invalidate all active sessions to enforce new role permissions immediately
    if (this.sessionStore) {
      await this.sessionStore.revokeAllUserSessions(targetUserId);
    }

    await this.repository.createAuditLog({
      actorId: adminId,
      actorUsername: adminUsername,
      action: 'USER_ROLE_CHANGE',
      targetType: 'USER',
      targetId: targetUserId,
      metadata: {
        oldRole,
        newRole,
      },
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });
  }

  public async updateUserStatus(
    adminId: string,
    adminUsername: string,
    targetUserId: string,
    newStatus: UserStatus,
    reason?: string | undefined,
    context?: SecurityContext,
  ): Promise<void> {
    const user = await this.repository.findUserById(targetUserId);
    if (!user) {
      throw new TargetNotFoundError('User', targetUserId);
    }
    const oldStatus = user.status;

    await this.repository.updateUserStatus(targetUserId, newStatus);

    // If account suspended or deleted, revoke all active sessions immediately
    if (this.sessionStore && (newStatus === 'SUSPENDED' || newStatus === 'DELETED')) {
      await this.sessionStore.revokeAllUserSessions(targetUserId);
    }

    await this.repository.createAuditLog({
      actorId: adminId,
      actorUsername: adminUsername,
      action: 'USER_STATUS_CHANGE',
      targetType: 'USER',
      targetId: targetUserId,
      metadata: {
        oldStatus,
        newStatus,
        reason: reason || null,
      },
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });
  }

  public async revokeUserSessions(
    adminId: string,
    adminUsername: string,
    targetUserId: string,
    context?: SecurityContext,
  ): Promise<void> {
    const user = await this.repository.findUserById(targetUserId);
    if (!user) {
      throw new TargetNotFoundError('User', targetUserId);
    }

    if (this.sessionStore) {
      await this.sessionStore.revokeAllUserSessions(targetUserId);
    }

    await this.repository.createAuditLog({
      actorId: adminId,
      actorUsername: adminUsername,
      action: 'USER_SESSIONS_REVOKE',
      targetType: 'USER',
      targetId: targetUserId,
      metadata: {},
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });
  }

  // ============================================================================
  // 4. SPACES & THREADS ADMINISTRATIVE OVERRIDES
  // ============================================================================

  public async adminListSpaces(): Promise<SpaceEntity[]> {
    return this.repository.adminListSpaces();
  }

  public async deleteSpace(
    adminId: string,
    adminUsername: string,
    spaceId: string,
    reason?: string | undefined,
    context?: SecurityContext,
  ): Promise<boolean> {
    const deleted = await this.repository.deleteSpace(spaceId);
    if (!deleted) {
      throw new TargetNotFoundError('Space', spaceId);
    }

    await this.repository.createAuditLog({
      actorId: adminId,
      actorUsername: adminUsername,
      action: 'SPACE_DELETE',
      targetType: 'SPACE',
      targetId: spaceId,
      metadata: { reason: reason || null },
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    return true;
  }

  public async adminListThreads(options?: {
    spaceId?: string | undefined;
    search?: string | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
  }): Promise<{ threads: ThreadEntity[]; total: number }> {
    return this.repository.adminListThreads(options);
  }

  public async setThreadPinned(
    adminId: string,
    adminUsername: string,
    threadId: string,
    isPinned: boolean,
    context?: SecurityContext,
  ): Promise<void> {
    await this.repository.setThreadPinned(threadId, isPinned);

    await this.repository.createAuditLog({
      actorId: adminId,
      actorUsername: adminUsername,
      action: isPinned ? 'THREAD_PIN' : 'THREAD_UNPIN',
      targetType: 'THREAD',
      targetId: threadId,
      metadata: { isPinned },
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });
  }

  public async setThreadLocked(
    adminId: string,
    adminUsername: string,
    threadId: string,
    isLocked: boolean,
    context?: SecurityContext,
  ): Promise<void> {
    await this.repository.setThreadLocked(threadId, isLocked);

    await this.repository.createAuditLog({
      actorId: adminId,
      actorUsername: adminUsername,
      action: isLocked ? 'THREAD_LOCK' : 'THREAD_UNLOCK',
      targetType: 'THREAD',
      targetId: threadId,
      metadata: { isLocked },
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });
  }

  public async deleteThread(
    adminId: string,
    adminUsername: string,
    threadId: string,
    reason?: string | undefined,
    context?: SecurityContext,
  ): Promise<boolean> {
    const deleted = await this.repository.deleteThread(threadId);
    if (!deleted) {
      throw new TargetNotFoundError('Thread', threadId);
    }

    await this.repository.createAuditLog({
      actorId: adminId,
      actorUsername: adminUsername,
      action: 'THREAD_DELETE',
      targetType: 'THREAD',
      targetId: threadId,
      metadata: { reason: reason || null },
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    return true;
  }

  // ============================================================================
  // 5. AUDIT LOGS
  // ============================================================================

  public async listAuditLogs(options?: {
    actorId?: string | undefined;
    action?: string | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
  }): Promise<{ logs: AuditLog[]; total: number }> {
    const result = await this.repository.listAuditLogs(options);
    return {
      logs: result.logs.map((log) => this.mapAuditLogEntityToContract(log)),
      total: result.total,
    };
  }

  // ============================================================================
  // MAPPER HELPERS
  // ============================================================================

  private mapReportEntityToContract(entity: ReportEntity): ModReport {
    return {
      id: entity.id,
      reporterId: entity.reporterId,
      reporterUsername: entity.reporterUsername || 'anonymous',
      targetType: entity.targetType,
      targetId: entity.targetId,
      reason: entity.reason,
      status: entity.status,
      resolvedBy: entity.resolvedBy ?? null,
      resolvedAt: entity.resolvedAt ? entity.resolvedAt.toISOString() : null,
      createdAt: entity.createdAt.toISOString(),
    };
  }

  private mapAuditLogEntityToContract(entity: AuditLogEntity): AuditLog {
    return {
      id: entity.id,
      actorId: entity.actorId,
      actorUsername: entity.actorUsername,
      action: entity.action,
      targetType: entity.targetType,
      targetId: entity.targetId ?? null,
      metadata: entity.metadata || {},
      ipAddress: entity.ipAddress ?? null,
      userAgent: entity.userAgent ?? null,
      createdAt: entity.createdAt.toISOString(),
    };
  }
}
