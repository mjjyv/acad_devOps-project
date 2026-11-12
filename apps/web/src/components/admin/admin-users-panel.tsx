'use client';

import type { AdminUserListItem, UserRole, UserStatus } from '@acad/contracts';
import Link from 'next/link';
import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { extractApiErrorMessage } from '@/lib/api/client';
import { ModerationApi } from '@/lib/api/moderation';
import { useUI } from '@/lib/store/ui-context';
import { CheckIcon, DeviceIcon, SearchIcon, ShieldIcon } from '../ui/icons';

interface AdminUsersPanelProps {
  currentUserId?: string;
}

const ROLE_OPTIONS: Array<{ value: 'ALL' | UserRole; label: string }> = [
  { value: 'ALL', label: 'Tất cả vai trò' },
  { value: 'USER', label: 'USER' },
  { value: 'SPACE_MOD', label: 'SPACE_MOD' },
  { value: 'GLOBAL_MOD', label: 'GLOBAL_MOD' },
  { value: 'ADMIN', label: 'ADMIN' },
];

const STATUS_OPTIONS: Array<{ value: 'ALL' | UserStatus; label: string }> = [
  { value: 'ALL', label: 'Tất cả trạng thái' },
  { value: 'ACTIVE', label: 'ACTIVE' },
  { value: 'SUSPENDED', label: 'SUSPENDED' },
  { value: 'SHADOWBANNED', label: 'SHADOWBANNED' },
];

const EDITABLE_ROLES: Array<'USER' | 'SPACE_MOD' | 'GLOBAL_MOD' | 'ADMIN'> = [
  'USER',
  'SPACE_MOD',
  'GLOBAL_MOD',
  'ADMIN',
];

const EDITABLE_STATUSES: Array<'ACTIVE' | 'SUSPENDED' | 'SHADOWBANNED'> = [
  'ACTIVE',
  'SUSPENDED',
  'SHADOWBANNED',
];

export function AdminUsersPanel({ currentUserId }: AdminUsersPanelProps) {
  const { showToast } = useUI();
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | UserStatus>('ALL');
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const limit = 20;

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [reasonDrafts, setReasonDrafts] = useState<Record<string, string>>({});
  const [statusDrafts, setStatusDrafts] = useState<
    Record<string, 'ACTIVE' | 'SUSPENDED' | 'SHADOWBANNED'>
  >({});

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await ModerationApi.getUsers({
        search: searchQuery || undefined,
        role: roleFilter === 'ALL' ? undefined : roleFilter,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        limit,
        offset,
      });
      setUsers(Array.isArray(res.users) ? res.users : []);
      setTotal(res.total ?? 0);
    } catch (err) {
      setErrorMsg(extractApiErrorMessage(err, 'Không thể tải danh sách người dùng'));
    } finally {
      setLoading(false);
    }
  }, [searchQuery, roleFilter, statusFilter, offset]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    setOffset(0);
    setSearchQuery(searchInput.trim());
  };

  const handleRoleChange = async (
    targetUser: AdminUserListItem,
    nextRole: 'USER' | 'SPACE_MOD' | 'GLOBAL_MOD' | 'ADMIN',
  ) => {
    if (nextRole === targetUser.role) return;
    try {
      setBusyUserId(targetUser.id);
      const res = await ModerationApi.updateUserRole(targetUser.id, nextRole);
      setUsers((prev) => prev.map((u) => (u.id === targetUser.id ? { ...u, role: res.role } : u)));
      showToast(`Đã cập nhật vai trò u/${targetUser.username} thành ${res.role}`, 'success');
    } catch (err) {
      showToast(extractApiErrorMessage(err, 'Không thể cập nhật vai trò người dùng'), 'error');
    } finally {
      setBusyUserId(null);
    }
  };

  const handleStatusSave = async (targetUser: AdminUserListItem) => {
    const fallbackStatus =
      targetUser.status === 'ACTIVE' ||
      targetUser.status === 'SUSPENDED' ||
      targetUser.status === 'SHADOWBANNED'
        ? targetUser.status
        : 'ACTIVE';
    const nextStatus = statusDrafts[targetUser.id] ?? fallbackStatus;
    const reason = reasonDrafts[targetUser.id]?.trim();
    try {
      setBusyUserId(targetUser.id);
      const res = await ModerationApi.updateUserStatus(
        targetUser.id,
        nextStatus,
        reason || undefined,
      );
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, status: res.status } : u)),
      );
      showToast(`Đã cập nhật trạng thái u/${targetUser.username}: ${res.status}`, 'success');
    } catch (err) {
      showToast(extractApiErrorMessage(err, 'Không thể cập nhật trạng thái người dùng'), 'error');
    } finally {
      setBusyUserId(null);
    }
  };

  const handleRevokeSessions = async (targetUser: AdminUserListItem) => {
    try {
      setBusyUserId(targetUser.id);
      await ModerationApi.revokeUserSessions(targetUser.id);
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, sessionsCount: 0 } : u)),
      );
      showToast(`Đã thu hồi toàn bộ phiên đăng nhập của u/${targetUser.username}`, 'success');
    } catch (err) {
      showToast(extractApiErrorMessage(err, 'Không thể thu hồi phiên đăng nhập'), 'error');
    } finally {
      setBusyUserId(null);
    }
  };

  const statusColor = (st: UserStatus) => {
    if (st === 'ACTIVE') return 'var(--color-success)';
    if (st === 'SUSPENDED') return 'var(--color-danger)';
    return 'var(--color-warning)';
  };

  return (
    <div
      data-testid="admin-users-panel"
      style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
    >
      {/* Filter Toolbar */}
      <form
        onSubmit={handleSearchSubmit}
        className="surface-card"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 16px',
        }}
      >
        <div
          style={{
            flex: '1 1 220px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--bg-subtle)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            padding: '0 10px',
          }}
        >
          <SearchIcon size={15} />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Tìm username hoặc email..."
            data-testid="admin-users-search"
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: '13px',
              padding: '7px 0',
            }}
          />
        </div>

        <select
          aria-label="Lọc theo vai trò"
          value={roleFilter}
          onChange={(e) => {
            setOffset(0);
            setRoleFilter(e.target.value as 'ALL' | UserRole);
          }}
          className="input-field"
          style={{ width: 'auto', minWidth: '140px', fontSize: '12.5px', padding: '7px 10px' }}
        >
          {ROLE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <select
          aria-label="Lọc theo trạng thái"
          value={statusFilter}
          onChange={(e) => {
            setOffset(0);
            setStatusFilter(e.target.value as 'ALL' | UserStatus);
          }}
          className="input-field"
          style={{ width: 'auto', minWidth: '150px', fontSize: '12.5px', padding: '7px 10px' }}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <button
          type="submit"
          className="btn-primary"
          style={{ fontSize: '12.5px', padding: '7px 14px' }}
        >
          Tìm kiếm
        </button>
      </form>

      <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', paddingLeft: '2px' }}>
        Hiển thị {users.length} / {total} tài khoản
      </div>

      {loading && (
        <div
          className="surface-card"
          style={{ padding: '20px', color: 'var(--text-muted)', fontSize: '13.5px' }}
        >
          Đang tải danh sách người dùng...
        </div>
      )}

      {!loading && errorMsg && (
        <div
          className="surface-card"
          style={{
            padding: '16px',
            borderColor: 'var(--color-danger)',
            color: 'var(--color-danger)',
            fontSize: '13.5px',
          }}
        >
          {errorMsg}
        </div>
      )}

      {!loading && !errorMsg && users.length === 0 && (
        <div
          className="surface-card"
          style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}
        >
          Không tìm thấy tài khoản nào khớp bộ lọc.
        </div>
      )}

      {!loading &&
        !errorMsg &&
        users.map((u) => {
          const isSelf = u.id === currentUserId;
          const isBusy = busyUserId === u.id;
          const selectedStatus =
            statusDrafts[u.id] ??
            (u.status === 'ACTIVE' || u.status === 'SUSPENDED' || u.status === 'SHADOWBANNED'
              ? u.status
              : 'ACTIVE');

          return (
            <article
              key={u.id}
              data-testid={`user-row-${u.username}`}
              className="surface-card"
              style={{
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}
                  >
                    <Link
                      href={`/u/${u.username}`}
                      style={{
                        fontWeight: 700,
                        fontSize: '14.5px',
                        color: 'var(--text-primary)',
                        textDecoration: 'none',
                      }}
                    >
                      u/{u.username}
                    </Link>
                    {isSelf && (
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 7px',
                          borderRadius: '999px',
                          backgroundColor: 'var(--bg-pill)',
                          color: 'var(--color-brand)',
                        }}
                      >
                        Bạn
                      </span>
                    )}
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '999px',
                        backgroundColor: 'var(--bg-subtle)',
                        color: 'var(--text-secondary)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      {u.role}
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '999px',
                        backgroundColor: 'var(--bg-subtle)',
                        color: statusColor(u.status),
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      {u.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                    {u.email} · {u.karmaScore} karma · {u.threadsCount} bài viết · {u.sessionsCount}{' '}
                    phiên hoạt động
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    disabled={isBusy || isSelf}
                    data-testid={`user-revoke-btn-${u.username}`}
                    onClick={() => handleRevokeSessions(u)}
                    className="btn-ghost"
                    style={{
                      fontSize: '12px',
                      padding: '6px 10px',
                      border: '1px solid var(--border-subtle)',
                      opacity: isSelf ? 0.5 : 1,
                    }}
                    title={
                      isSelf
                        ? 'Không thể thu hồi phiên hiện tại của chính bạn tại đây'
                        : 'Thu hồi toàn bộ phiên đăng nhập'
                    }
                  >
                    <DeviceIcon size={14} />
                    <span>Thu hồi phiên ({u.sessionsCount})</span>
                  </button>
                </div>
              </div>

              {/* Controls Row */}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: '10px',
                  paddingTop: '10px',
                  borderTop: '1px solid var(--border-divider)',
                }}
              >
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12.5px',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <ShieldIcon size={14} />
                  <span>Vai trò:</span>
                  <select
                    data-testid={`user-role-select-${u.username}`}
                    disabled={isBusy || isSelf}
                    value={u.role}
                    onChange={(e) =>
                      handleRoleChange(
                        u,
                        e.target.value as 'USER' | 'SPACE_MOD' | 'GLOBAL_MOD' | 'ADMIN',
                      )
                    }
                    className="input-field"
                    style={{ width: 'auto', fontSize: '12px', padding: '5px 8px' }}
                  >
                    {EDITABLE_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </label>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12.5px',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <span>Trạng thái:</span>
                  <select
                    data-testid={`user-status-select-${u.username}`}
                    disabled={isBusy || isSelf}
                    value={selectedStatus}
                    onChange={(e) =>
                      setStatusDrafts((prev) => ({
                        ...prev,
                        [u.id]: e.target.value as 'ACTIVE' | 'SUSPENDED' | 'SHADOWBANNED',
                      }))
                    }
                    className="input-field"
                    style={{ width: 'auto', fontSize: '12px', padding: '5px 8px' }}
                  >
                    {EDITABLE_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </label>

                <input
                  type="text"
                  disabled={isBusy || isSelf}
                  placeholder="Lý do thay đổi trạng thái (tùy chọn)..."
                  value={reasonDrafts[u.id] ?? ''}
                  onChange={(e) => setReasonDrafts((prev) => ({ ...prev, [u.id]: e.target.value }))}
                  className="input-field"
                  style={{ flex: '1 1 180px', fontSize: '12px', padding: '5px 10px' }}
                />

                <button
                  type="button"
                  disabled={isBusy || isSelf}
                  data-testid={`user-status-save-${u.username}`}
                  onClick={() => handleStatusSave(u)}
                  className="btn-primary"
                  style={{ fontSize: '12px', padding: '5px 12px', opacity: isSelf ? 0.5 : 1 }}
                >
                  <CheckIcon size={13} />
                  <span>Cập nhật</span>
                </button>
              </div>
            </article>
          );
        })}

      {/* Pagination */}
      {total > limit && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: '6px',
          }}
        >
          <button
            type="button"
            disabled={offset === 0 || loading}
            onClick={() => setOffset((o) => Math.max(0, o - limit))}
            className="btn-ghost"
            style={{ fontSize: '12.5px' }}
          >
            Trang trước
          </button>
          <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
            Trang {Math.floor(offset / limit) + 1} / {Math.ceil(total / limit)}
          </span>
          <button
            type="button"
            disabled={offset + limit >= total || loading}
            onClick={() => setOffset((o) => o + limit)}
            className="btn-ghost"
            style={{ fontSize: '12.5px' }}
          >
            Trang sau
          </button>
        </div>
      )}
    </div>
  );
}
