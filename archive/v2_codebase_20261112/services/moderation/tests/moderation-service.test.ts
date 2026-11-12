/**
 * @file moderation-service.test.ts
 * @description Comprehensive unit tests for ModerationService and InMemoryModerationRepository.
 */

import { randomUUID } from 'node:crypto';
import type { ISessionStore } from '@acad/auth-service';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  InMemoryModerationRepository,
  type ReportEntity,
} from '../src/repository/moderation-repository.js';
import {
  DuplicateReportError,
  ModerationService,
  ReportNotFoundError,
  TargetNotFoundError,
} from '../src/services/moderation-service.js';

describe('ModerationService Unit Tests', () => {
  let repository: InMemoryModerationRepository;
  let mockSessionStore: ISessionStore;
  let service: ModerationService;

  const adminId = randomUUID();
  const adminUsername = 'root_admin';
  const reporterId = randomUUID();
  const reporterUsername = 'user_whistleblower';
  const targetThreadId = randomUUID();
  const targetCommentId = randomUUID();
  const targetUserId = randomUUID();

  beforeEach(() => {
    repository = new InMemoryModerationRepository();

    // Mock session store
    mockSessionStore = {
      createSession: vi.fn(),
      findSessionByTokenHash: vi.fn(),
      findSessionById: vi.fn(),
      updateSessionToken: vi.fn(),
      revokeSession: vi.fn(),
      revokeAllUserSessions: vi.fn().mockResolvedValue(undefined),
      cleanExpiredSessions: vi.fn(),
    } as unknown as ISessionStore;

    // Seed dummy user in repository
    repository.seedUser({
      id: targetUserId,
      username: 'bad_actor',
      email: 'bad@example.com',
      role: 'USER',
      status: 'ACTIVE',
      karmaScore: 10,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    service = new ModerationService(repository, mockSessionStore);
  });

  describe('1. Mod Report Queue Submission & Deduplication', () => {
    it('should submit a valid thread report successfully', async () => {
      const report = await service.submitReport(reporterId, reporterUsername, {
        targetType: 'THREAD',
        targetId: targetThreadId,
        reason: 'Spamming commercial links',
      });

      expect(report.id).toBeDefined();
      expect(report.reporterId).toBe(reporterId);
      expect(report.reporterUsername).toBe(reporterUsername);
      expect(report.targetType).toBe('THREAD');
      expect(report.targetId).toBe(targetThreadId);
      expect(report.reason).toBe('Spamming commercial links');
      expect(report.status).toBe('PENDING');
      expect(report.resolvedBy).toBeNull();
      expect(report.resolvedAt).toBeNull();
    });

    it('should submit a comment report successfully', async () => {
      const report = await service.submitReport(reporterId, reporterUsername, {
        targetType: 'COMMENT',
        targetId: targetCommentId,
        reason: 'Harassment and personal attacks',
      });

      expect(report.targetType).toBe('COMMENT');
      expect(report.status).toBe('PENDING');
    });

    it('should throw DuplicateReportError when submitting duplicate pending report', async () => {
      await service.submitReport(reporterId, reporterUsername, {
        targetType: 'THREAD',
        targetId: targetThreadId,
        reason: 'Duplicate check 1',
      });

      await expect(
        service.submitReport(reporterId, reporterUsername, {
          targetType: 'THREAD',
          targetId: targetThreadId,
          reason: 'Duplicate check 2',
        }),
      ).rejects.toThrow(DuplicateReportError);
    });

    it('should allow reporting same target again after previous report is RESOLVED or DISMISSED', async () => {
      const report1 = await service.submitReport(reporterId, reporterUsername, {
        targetType: 'THREAD',
        targetId: targetThreadId,
        reason: 'First issue',
      });

      await service.resolveReport(adminId, adminUsername, report1.id, {
        status: 'RESOLVED',
        note: 'Thread taken down',
      });

      const report2 = await service.submitReport(reporterId, reporterUsername, {
        targetType: 'THREAD',
        targetId: targetThreadId,
        reason: 'Second issue after resolution',
      });

      expect(report2.id).toBeDefined();
      expect(report2.id).not.toBe(report1.id);
    });
  });

  describe('2. Mod Queue Resolution & Audit Logging', () => {
    let pendingReport: ReportEntity;

    beforeEach(async () => {
      pendingReport = await repository.createReport({
        reporterId,
        targetType: 'THREAD',
        targetId: targetThreadId,
        reason: 'Violates community guidelines',
      });
    });

    it('should resolve a pending report and generate an audit log', async () => {
      const resolved = await service.resolveReport(
        adminId,
        adminUsername,
        pendingReport.id,
        {
          status: 'RESOLVED',
          note: 'Content removed and warning issued',
        },
        { ipAddress: '127.0.0.1', userAgent: 'Vitest/2.0' },
      );

      expect(resolved.status).toBe('RESOLVED');
      expect(resolved.resolvedBy).toBe(adminId);
      expect(resolved.resolvedAt).toBeDefined();

      // Check audit logs
      const audit = await service.listAuditLogs({ action: 'REPORT_RESOLVE' });
      expect(audit.total).toBe(1);
      expect(audit.logs[0].actorId).toBe(adminId);
      expect(audit.logs[0].actorUsername).toBe(adminUsername);
      expect(audit.logs[0].targetId).toBe(pendingReport.id);
      expect(audit.logs[0].metadata).toEqual({
        status: 'RESOLVED',
        note: 'Content removed and warning issued',
        targetType: 'THREAD',
        targetId: targetThreadId,
      });
    });

    it('should dismiss a pending report and generate an audit log', async () => {
      const dismissed = await service.resolveReport(adminId, adminUsername, pendingReport.id, {
        status: 'DISMISSED',
        note: 'False alarm / does not violate policy',
      });

      expect(dismissed.status).toBe('DISMISSED');
      expect(dismissed.resolvedBy).toBe(adminId);

      const audit = await service.listAuditLogs({ action: 'REPORT_RESOLVE' });
      expect(audit.total).toBe(1);
      expect(audit.logs[0].metadata).toMatchObject({ status: 'DISMISSED' });
    });

    it('should throw ReportNotFoundError when report does not exist', async () => {
      await expect(
        service.resolveReport(adminId, adminUsername, randomUUID(), { status: 'RESOLVED' }),
      ).rejects.toThrow(ReportNotFoundError);
    });

    it('should list reports with filters and pagination', async () => {
      // Create another report
      await repository.createReport({
        reporterId: randomUUID(),
        targetType: 'COMMENT',
        targetId: randomUUID(),
        reason: 'Another violation',
      });

      const all = await service.listReports();
      expect(all.total).toBe(2);

      const threadOnly = await service.listReports({ targetType: 'THREAD' });
      expect(threadOnly.total).toBe(1);
      expect(threadOnly.reports[0].targetType).toBe('THREAD');

      const commentOnly = await service.listReports({ targetType: 'COMMENT' });
      expect(commentOnly.total).toBe(1);
      expect(commentOnly.reports[0].targetType).toBe('COMMENT');
    });

    it('should list reports submitted by a specific reporter', async () => {
      const myReports = await service.listReportsByReporter(reporterId);
      expect(myReports.length).toBe(1);
      expect(myReports[0].id).toBe(pendingReport.id);
    });
  });

  describe('3. Admin User Management & Force Session Revocation', () => {
    it('should update user role and immediately revoke all user sessions', async () => {
      await service.updateUserRole(adminId, adminUsername, targetUserId, 'GLOBAL_MOD', {
        ipAddress: '10.0.0.1',
      });

      const updated = await repository.findUserById(targetUserId);
      expect(updated?.role).toBe('GLOBAL_MOD');
      expect(mockSessionStore.revokeAllUserSessions).toHaveBeenCalledWith(targetUserId);

      // Verify audit log
      const audit = await service.listAuditLogs({ action: 'USER_ROLE_CHANGE' });
      expect(audit.total).toBe(1);
      expect(audit.logs[0].metadata).toEqual({
        oldRole: 'USER',
        newRole: 'GLOBAL_MOD',
      });
    });

    it('should update user status to SHADOWBANNED and create audit log without session revocation', async () => {
      await service.updateUserStatus(
        adminId,
        adminUsername,
        targetUserId,
        'SHADOWBANNED',
        'Silent spammer',
      );

      const updated = await repository.findUserById(targetUserId);
      expect(updated?.status).toBe('SHADOWBANNED');
      // Shadowbanned users stay logged in unaware
      expect(mockSessionStore.revokeAllUserSessions).not.toHaveBeenCalled();

      const audit = await service.listAuditLogs({ action: 'USER_STATUS_CHANGE' });
      expect(audit.total).toBe(1);
      expect(audit.logs[0].metadata).toEqual({
        oldStatus: 'ACTIVE',
        newStatus: 'SHADOWBANNED',
        reason: 'Silent spammer',
      });
    });

    it('should update user status to SUSPENDED and immediately revoke all active sessions', async () => {
      await service.updateUserStatus(
        adminId,
        adminUsername,
        targetUserId,
        'SUSPENDED',
        'Severe harassment',
      );

      const updated = await repository.findUserById(targetUserId);
      expect(updated?.status).toBe('SUSPENDED');
      expect(mockSessionStore.revokeAllUserSessions).toHaveBeenCalledWith(targetUserId);
    });

    it('should force revoke user sessions on demand', async () => {
      await service.revokeUserSessions(adminId, adminUsername, targetUserId);

      expect(mockSessionStore.revokeAllUserSessions).toHaveBeenCalledWith(targetUserId);
      const audit = await service.listAuditLogs({ action: 'USER_SESSIONS_REVOKE' });
      expect(audit.total).toBe(1);
      expect(audit.logs[0].targetId).toBe(targetUserId);
    });

    it('should throw TargetNotFoundError when user does not exist', async () => {
      const nonExistent = randomUUID();
      await expect(
        service.updateUserRole(adminId, adminUsername, nonExistent, 'ADMIN'),
      ).rejects.toThrow(TargetNotFoundError);

      await expect(
        service.updateUserStatus(adminId, adminUsername, nonExistent, 'SUSPENDED'),
      ).rejects.toThrow(TargetNotFoundError);
    });

    it('should list users with pagination and search filter', async () => {
      const result = await service.listUsers({ search: 'bad_actor' });
      expect(result.total).toBe(1);
      expect(result.users[0].username).toBe('bad_actor');
    });
  });

  describe('4. Administrative Overrides for Threads and Spaces', () => {
    const threadId = randomUUID();
    const spaceId = randomUUID();

    beforeEach(() => {
      // Seed dummy thread and space
      repository.seedThread({
        id: threadId,
        spaceId,
        authorId: targetUserId,
        title: 'Controversial Topic',
        content: 'Details here',
        type: 'TEXT',
        url: null,
        isPinned: false,
        isLocked: false,
        upvotes: 0,
        downvotes: 0,
        score: 0,
        commentCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      repository.seedSpace({
        id: spaceId,
        name: 'tech',
        slug: 'tech',
        description: 'Tech discussion',
        rules: null,
        ownerId: adminId,
        memberCount: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });

    it('should pin and unpin thread with audit logs', async () => {
      await service.setThreadPinned(adminId, adminUsername, threadId, true);
      let thread = repository.getThread(threadId);
      expect(thread?.isPinned).toBe(true);

      await service.setThreadPinned(adminId, adminUsername, threadId, false);
      thread = repository.getThread(threadId);
      expect(thread?.isPinned).toBe(false);

      const logs = await service.listAuditLogs({ limit: 10 });
      expect(logs.total).toBe(2);
      expect(logs.logs.map((l) => l.action)).toContain('THREAD_PIN');
      expect(logs.logs.map((l) => l.action)).toContain('THREAD_UNPIN');
    });

    it('should lock and unlock thread comments with audit logs', async () => {
      await service.setThreadLocked(adminId, adminUsername, threadId, true);
      let thread = repository.getThread(threadId);
      expect(thread?.isLocked).toBe(true);

      await service.setThreadLocked(adminId, adminUsername, threadId, false);
      thread = repository.getThread(threadId);
      expect(thread?.isLocked).toBe(false);

      const logs = await service.listAuditLogs({ limit: 10 });
      expect(logs.logs.map((l) => l.action)).toContain('THREAD_LOCK');
      expect(logs.logs.map((l) => l.action)).toContain('THREAD_UNLOCK');
    });

    it('should delete thread and record audit log', async () => {
      const deleted = await service.deleteThread(
        adminId,
        adminUsername,
        threadId,
        'Violated copyright',
      );
      expect(deleted).toBe(true);
      expect(repository.hasThread(threadId)).toBe(false);

      const audit = await service.listAuditLogs({ action: 'THREAD_DELETE' });
      expect(audit.total).toBe(1);
      expect(audit.logs[0].metadata).toEqual({ reason: 'Violated copyright' });
    });

    it('should delete space and record audit log', async () => {
      const deleted = await service.deleteSpace(
        adminId,
        adminUsername,
        spaceId,
        'Abandoned and harmful',
      );
      expect(deleted).toBe(true);
      expect(repository.hasSpace(spaceId)).toBe(false);

      const audit = await service.listAuditLogs({ action: 'SPACE_DELETE' });
      expect(audit.total).toBe(1);
      expect(audit.logs[0].metadata).toEqual({ reason: 'Abandoned and harmful' });
    });

    it('should throw TargetNotFoundError when deleting non-existent thread or space', async () => {
      await expect(service.deleteThread(adminId, adminUsername, randomUUID())).rejects.toThrow(
        TargetNotFoundError,
      );

      await expect(service.deleteSpace(adminId, adminUsername, randomUUID())).rejects.toThrow(
        TargetNotFoundError,
      );
    });
  });

  describe('5. System Stats Aggregation', () => {
    it('should compute comprehensive system statistics', async () => {
      await repository.createReport({
        reporterId,
        targetType: 'THREAD',
        targetId: targetThreadId,
        reason: 'Pending report',
      });

      const stats = await service.getAdminStats();
      expect(stats.activeUsersCount).toBeGreaterThanOrEqual(1);
      expect(stats.pendingReportsCount).toBeGreaterThanOrEqual(1);
      expect(stats.threadsCount).toBeGreaterThanOrEqual(0);
      expect(stats.spacesCount).toBeGreaterThanOrEqual(0);
    });
  });
});
