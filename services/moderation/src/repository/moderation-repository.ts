import type { SpaceEntity, ThreadEntity } from '@acad/community-service';
import type {
  AdminStats,
  AdminUserListItem,
  ModReportStatus,
  ModReportTargetType,
  UserRole,
  UserStatus,
} from '@acad/contracts';

export class ModerationDatabaseError extends Error {
  constructor(
    message: string,
    public override readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'ModerationDatabaseError';
  }
}

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

export interface ModUserSummaryEntity {
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

  getSystemStats(): Promise<AdminStats>;

  listUsers(options?: {
    role?: UserRole | undefined;
    status?: UserStatus | undefined;
    search?: string | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
  }): Promise<{ users: AdminUserListItem[]; total: number }>;
  findUserById(userId: string): Promise<ModUserSummaryEntity | null>;
  updateUserRole(userId: string, role: UserRole): Promise<void>;
  updateUserStatus(userId: string, status: UserStatus): Promise<void>;
  revokeUserSessionsInDb?(userId: string): Promise<void>;

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
