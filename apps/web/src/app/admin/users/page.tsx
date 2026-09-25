'use client';

import React, { useEffect, useState } from 'react';
import { AdminSystemStats, UserProfile, UserRole, UserStatus } from '@acad/contracts';
import { webAuth } from '../../../lib/auth-client';

export default function AdminUsersDashboardPage() {
  const [stats, setStats] = useState<AdminSystemStats | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);

  const [roleFilter, setRoleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadData = async (targetPage = page) => {
    try {
      setLoading(true);
      setErrorMessage(null);

      const [statsData, usersData] = await Promise.all([
        webAuth.adminGetStats().catch(() => null),
        webAuth.adminListUsers({
          page: targetPage,
          limit: 15,
          role: (roleFilter || undefined) as UserRole | undefined,
          status: (statusFilter || undefined) as UserStatus | undefined,
          search: searchQuery || undefined,
        }),
      ]);

      if (statsData) setStats(statsData);
      setUsers(usersData.users);
      setTotal(usersData.total);
      setPage(usersData.page);
      setTotalPages(usersData.totalPages || 1);
    } catch (err: any) {
      setErrorMessage(err.message || 'Không thể tải dữ liệu quản trị');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(1);
  }, [roleFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData(1);
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      setActionLoadingId(userId);
      await webAuth.adminUpdateRole(userId, newRole);
      setActionMessage(`Đã cập nhật vai trò thành ${newRole} và thu hồi phiên cũ.`);
      await loadData();
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Cập nhật vai trò thất bại');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleStatus = async (user: UserProfile) => {
    const newStatus: UserStatus = user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    const actionText = newStatus === 'SUSPENDED' ? 'khóa tài khoản' : 'kích hoạt lại tài khoản';

    if (!confirm(`Bạn có chắc chắn muốn ${actionText} của ${user.username}?`)) return;

    try {
      setActionLoadingId(user.id);
      await webAuth.adminUpdateStatus(user.id, newStatus);
      setActionMessage(`Đã ${actionText} thành công cho ${user.username}.`);
      await loadData();
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Cập nhật trạng thái thất bại');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRevokeSessions = async (user: UserProfile) => {
    if (!confirm(`Cưỡng chế đăng xuất tất cả thiết bị của ${user.username}?`)) return;

    try {
      setActionLoadingId(user.id);
      await webAuth.adminRevokeUserSessions(user.id);
      setActionMessage(`Đã thu hồi toàn bộ phiên đăng nhập của ${user.username}.`);
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Thu hồi phiên thất bại');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div>
      {/* HEADER */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: '#f8fafc' }}>
          🛡️ Quản Lý Người Dùng & Phân Quyền Hệ Thống
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '0.95rem', margin: 0 }}>
          Theo dõi tài khoản người dùng, thăng cấp/hạ cấp vai trò, khóa tài khoản vi phạm và xử lý sự cố an ninh.
        </p>
      </div>

      {/* KPI METRIC CARDS */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2rem',
        }}
      >
        <div style={{ padding: '1.25rem', backgroundColor: '#131926', borderRadius: '10px', border: '1px solid #1e293b' }}>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600, marginBottom: '0.5rem' }}>
            TỔNG SỐ THÀNH VIÊN
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#f8fafc' }}>
            {stats ? stats.totalUsers : '—'}
          </div>
        </div>

        <div style={{ padding: '1.25rem', backgroundColor: '#131926', borderRadius: '10px', border: '1px solid #1e293b' }}>
          <div style={{ fontSize: '0.8rem', color: '#6ee7b7', fontWeight: 600, marginBottom: '0.5rem' }}>
            ĐANG HOẠT ĐỘNG (ACTIVE)
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#10b981' }}>
            {stats ? stats.activeUsers : '—'}
          </div>
        </div>

        <div style={{ padding: '1.25rem', backgroundColor: '#131926', borderRadius: '10px', border: '1px solid #1e293b' }}>
          <div style={{ fontSize: '0.8rem', color: '#fca5a5', fontWeight: 600, marginBottom: '0.5rem' }}>
            TẠM KHÓA (SUSPENDED)
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#ef4444' }}>
            {stats ? stats.suspendedUsers : '—'}
          </div>
        </div>

        <div style={{ padding: '1.25rem', backgroundColor: '#131926', borderRadius: '10px', border: '1px solid #1e293b' }}>
          <div style={{ fontSize: '0.8rem', color: '#fde047', fontWeight: 600, marginBottom: '0.5rem' }}>
            QUẢN TRỊ / ĐIỀU HÀNH
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#eab308' }}>
            {stats ? (stats.adminUsers + stats.moderatorUsers) : '—'}
          </div>
        </div>
      </div>

      {/* ALERTS */}
      {actionMessage && (
        <div style={{ padding: '0.85rem 1.25rem', backgroundColor: '#064e3b', color: '#6ee7b7', borderRadius: '8px', border: '1px solid #059669', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          ✓ {actionMessage}
        </div>
      )}

      {errorMessage && (
        <div style={{ padding: '0.85rem 1.25rem', backgroundColor: '#450a0a', color: '#fca5a5', borderRadius: '8px', border: '1px solid #ef4444', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          ✕ {errorMessage}
        </div>
      )}

      {/* SEARCH & FILTERS BAR */}
      <div
        style={{
          backgroundColor: '#131926',
          padding: '1.25rem',
          borderRadius: '10px',
          border: '1px solid #1e293b',
          marginBottom: '1.5rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.5rem', flex: '1', minWidth: '280px' }}>
          <input
            type="text"
            placeholder="Tìm theo username hoặc email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: '1',
              padding: '0.6rem 1rem',
              backgroundColor: '#0b0f17',
              border: '1px solid #334155',
              borderRadius: '6px',
              color: '#f8fafc',
              fontSize: '0.9rem',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            style={{
              padding: '0.6rem 1.2rem',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            Tìm kiếm
          </button>
        </form>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{
              padding: '0.6rem 0.9rem',
              backgroundColor: '#0b0f17',
              border: '1px solid #334155',
              borderRadius: '6px',
              color: '#f8fafc',
              fontSize: '0.875rem',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="">Tất cả Vai trò</option>
            <option value="USER">USER (Thành viên)</option>
            <option value="SPACE_MOD">SPACE_MOD (Điều hành Không gian)</option>
            <option value="GLOBAL_MOD">GLOBAL_MOD (Điều hành Toàn cục)</option>
            <option value="ADMIN">ADMIN (Quản trị viên)</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '0.6rem 0.9rem',
              backgroundColor: '#0b0f17',
              border: '1px solid #334155',
              borderRadius: '6px',
              color: '#f8fafc',
              fontSize: '0.875rem',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="">Tất cả Trạng thái</option>
            <option value="ACTIVE">ACTIVE (Hoạt động)</option>
            <option value="SUSPENDED">SUSPENDED (Tạm khóa)</option>
          </select>
        </div>
      </div>

      {/* USERS TABLE */}
      <div style={{ backgroundColor: '#131926', borderRadius: '10px', border: '1px solid #1e293b', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#1a2234', color: '#94a3b8', borderBottom: '1px solid #1e293b' }}>
              <th style={{ padding: '0.85rem 1.25rem' }}>Người dùng</th>
              <th style={{ padding: '0.85rem 1rem' }}>Karma</th>
              <th style={{ padding: '0.85rem 1rem' }}>Vai trò</th>
              <th style={{ padding: '0.85rem 1rem' }}>Trạng thái</th>
              <th style={{ padding: '0.85rem 1rem' }}>Ngày tham gia</th>
              <th style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                  Đang nạp dữ liệu...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                  Không tìm thấy người dùng phù hợp.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid #1e293b' }}>
                  {/* USER INFO */}
                  <td style={{ padding: '1rem 1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          backgroundColor: u.role === 'ADMIN' ? '#dc2626' : '#2563eb',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.9rem',
                          fontWeight: 700,
                        }}
                      >
                        {u.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: '#f8fafc' }}>{u.username}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{u.email}</div>
                      </div>
                    </div>
                  </td>

                  {/* KARMA */}
                  <td style={{ padding: '1rem' }}>
                    <span style={{ padding: '0.15rem 0.5rem', backgroundColor: '#064e3b', color: '#6ee7b7', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 }}>
                      ⭐ {u.karmaScore}
                    </span>
                  </td>

                  {/* ROLE SELECT */}
                  <td style={{ padding: '1rem' }}>
                    <select
                      value={u.role}
                      disabled={actionLoadingId === u.id}
                      onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                      style={{
                        padding: '0.35rem 0.6rem',
                        backgroundColor: '#0b0f17',
                        border: '1px solid #334155',
                        borderRadius: '6px',
                        color: u.role === 'ADMIN' ? '#f87171' : u.role.includes('MOD') ? '#fde047' : '#94a3b8',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <option value="USER">USER</option>
                      <option value="SPACE_MOD">SPACE_MOD</option>
                      <option value="GLOBAL_MOD">GLOBAL_MOD</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </td>

                  {/* STATUS BADGE */}
                  <td style={{ padding: '1rem' }}>
                    <span
                      style={{
                        padding: '0.2rem 0.6rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        backgroundColor: u.status === 'ACTIVE' ? '#065f46' : '#7f1d1d',
                        color: u.status === 'ACTIVE' ? '#a7f3d0' : '#fca5a5',
                      }}
                    >
                      {u.status}
                    </span>
                  </td>

                  {/* JOIN DATE */}
                  <td style={{ padding: '1rem', color: '#94a3b8', fontSize: '0.8rem' }}>
                    {new Date(u.createdAt).toLocaleDateString('vi-VN')}
                  </td>

                  {/* ACTIONS */}
                  <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => handleToggleStatus(u)}
                        disabled={actionLoadingId === u.id}
                        style={{
                          padding: '0.35rem 0.75rem',
                          borderRadius: '6px',
                          backgroundColor: u.status === 'ACTIVE' ? '#450a0a' : '#064e3b',
                          color: u.status === 'ACTIVE' ? '#fca5a5' : '#6ee7b7',
                          border: `1px solid ${u.status === 'ACTIVE' ? '#ef4444' : '#10b981'}`,
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {u.status === 'ACTIVE' ? 'Khóa' : 'Kích hoạt'}
                      </button>

                      <button
                        onClick={() => handleRevokeSessions(u)}
                        disabled={actionLoadingId === u.id}
                        title="Thu hồi toàn bộ phiên đăng nhập"
                        style={{
                          padding: '0.35rem 0.6rem',
                          borderRadius: '6px',
                          backgroundColor: '#1e293b',
                          color: '#94a3b8',
                          border: '1px solid #334155',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                        }}
                      >
                        Đăng xuất
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* PAGINATION */}
        <div
          style={{
            padding: '1rem 1.25rem',
            borderTop: '1px solid #1e293b',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.85rem',
            color: '#94a3b8',
          }}
        >
          <div>
            Hiển thị <strong>{users.length}</strong> trên tổng số <strong>{total}</strong> thành viên
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              onClick={() => loadData(page - 1)}
              disabled={page <= 1 || loading}
              style={{
                padding: '0.4rem 0.8rem',
                backgroundColor: '#1e293b',
                color: page <= 1 ? '#475569' : '#f8fafc',
                border: '1px solid #334155',
                borderRadius: '6px',
                cursor: page <= 1 ? 'not-allowed' : 'pointer',
              }}
            >
              Trang trước
            </button>
            <span>Trang {page} / {totalPages}</span>
            <button
              onClick={() => loadData(page + 1)}
              disabled={page >= totalPages || loading}
              style={{
                padding: '0.4rem 0.8rem',
                backgroundColor: '#1e293b',
                color: page >= totalPages ? '#475569' : '#f8fafc',
                border: '1px solid #334155',
                borderRadius: '6px',
                cursor: page >= totalPages ? 'not-allowed' : 'pointer',
              }}
            >
              Trang sau
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
