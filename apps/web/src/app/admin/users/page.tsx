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
      setErrorMessage(err.message || 'Không thể nạp dữ liệu quản trị');
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
    if (!confirm(`Xác nhận đổi vai trò người dùng thành [${newRole}]?`)) return;

    try {
      setActionLoadingId(userId);
      await webAuth.adminUpdateRole(userId, newRole);
      setActionMessage(`Đã cập nhật vai trò người dùng thành ${newRole}`);
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khi cập nhật vai trò');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleStatusToggle = async (userId: string, currentStatus: UserStatus) => {
    const nextStatus: UserStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    const actionName = nextStatus === 'SUSPENDED' ? 'TẠM KHÓA' : 'MỞ KHÓA';

    if (!confirm(`Xác nhận ${actionName} tài khoản này?`)) return;

    try {
      setActionLoadingId(userId);
      await webAuth.adminUpdateStatus(userId, nextStatus);
      setActionMessage(`Đã ${actionName.toLowerCase()} tài khoản thành công`);
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khi cập nhật trạng thái');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRevokeSessions = async (userId: string, username: string) => {
    if (!confirm(`Xác nhận thu hồi toàn bộ phiên đăng nhập của [${username}]? Người dùng này sẽ bị đăng xuất khỏi mọi thiết bị.`)) {
      return;
    }

    try {
      setActionLoadingId(userId);
      await webAuth.adminRevokeUserSessions(userId);
      setActionMessage(`Đã thu hồi toàn bộ phiên làm việc của [${username}]`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khi thu hồi phiên');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div>
      {/* PAGE TITLE & HEADER */}
      <div style={{ marginBottom: '2rem' }}>
        <h1
          style={{
            fontSize: '1.75rem',
            fontWeight: 800,
            margin: '0 0 0.4rem 0',
            color: '#1E2328',
            letterSpacing: '-0.025em',
          }}
        >
          Quản Trị Người Dùng & Thẩm Quyền Hệ Thống
        </h1>
        <p style={{ color: '#787774', margin: 0, fontSize: '0.875rem' }}>
          Giám sát tài khoản kỹ sư, phân quyền truy cập RBAC/ABAC và kiểm soát an ninh phiên đăng nhập.
        </p>
      </div>

      {/* 4 BENTO KPI CARDS (MINIMALIST EDITORIAL) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '1.75rem',
        }}
      >
        <div style={{ padding: '1.25rem', backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E6DFD5' }}>
          <div style={{ fontSize: '0.7rem', color: '#787774', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
            Tổng Người Dùng
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#12544F', fontFamily: 'var(--font-mono)' }}>
            {stats ? stats.totalUsers : '—'}
          </div>
        </div>

        <div style={{ padding: '1.25rem', backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E6DFD5' }}>
          <div style={{ fontSize: '0.7rem', color: '#1E4620', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
            Đang Hoạt Động (Active)
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#1E4620', fontFamily: 'var(--font-mono)' }}>
            {stats ? stats.activeUsers : '—'}
          </div>
        </div>

        <div style={{ padding: '1.25rem', backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E6DFD5' }}>
          <div style={{ fontSize: '0.7rem', color: '#9F2F2D', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
            Tạm Khóa (Suspended)
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#9F2F2D', fontFamily: 'var(--font-mono)' }}>
            {stats ? stats.suspendedUsers : '—'}
          </div>
        </div>

        <div style={{ padding: '1.25rem', backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E6DFD5' }}>
          <div style={{ fontSize: '0.7rem', color: '#8C6514', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
            Quản Trị / Điều Hành
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#8C6514', fontFamily: 'var(--font-mono)' }}>
            {stats ? (stats.adminUsers + stats.moderatorUsers) : '—'}
          </div>
        </div>
      </div>

      {/* FEEDBACK ALERTS */}
      {actionMessage && (
        <div
          style={{
            padding: '0.75rem 1rem',
            backgroundColor: '#EDF7ED',
            color: '#1E4620',
            borderRadius: '6px',
            border: '1px solid #C8E6C9',
            marginBottom: '1.25rem',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>✓ {actionMessage}</span>
          <button
            onClick={() => setActionMessage(null)}
            style={{ background: 'none', border: 'none', color: '#1E4620', cursor: 'pointer', fontWeight: 700 }}
          >
            ✕
          </button>
        </div>
      )}

      {errorMessage && (
        <div
          style={{
            padding: '0.75rem 1rem',
            backgroundColor: '#FDEBEC',
            color: '#9F2F2D',
            borderRadius: '6px',
            border: '1px solid #FAD1D4',
            marginBottom: '1.25rem',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>✕ {errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            style={{ background: 'none', border: 'none', color: '#9F2F2D', cursor: 'pointer', fontWeight: 700 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* SEARCH & FILTERS BAR */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          padding: '1rem 1.25rem',
          borderRadius: '8px',
          border: '1px solid #E6DFD5',
          marginBottom: '1.25rem',
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
              padding: '0.5rem 0.85rem',
              backgroundColor: '#FAF7F2',
              border: '1px solid #E6DFD5',
              borderRadius: '6px',
              color: '#1E2328',
              fontSize: '0.85rem',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            style={{
              padding: '0.5rem 1.15rem',
              backgroundColor: '#12544F',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '0.82rem',
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
              padding: '0.5rem 0.75rem',
              backgroundColor: '#FAF7F2',
              border: '1px solid #E6DFD5',
              borderRadius: '6px',
              color: '#4A4A4A',
              fontSize: '0.82rem',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="">Tất cả Vai trò</option>
            <option value="USER">USER (Thành viên)</option>
            <option value="SPACE_MOD">SPACE_MOD (Điều hành Space)</option>
            <option value="GLOBAL_MOD">GLOBAL_MOD (Điều hành Toàn diện)</option>
            <option value="ADMIN">ADMIN (Quản trị viên)</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '0.5rem 0.75rem',
              backgroundColor: '#FAF7F2',
              border: '1px solid #E6DFD5',
              borderRadius: '6px',
              color: '#4A4A4A',
              fontSize: '0.82rem',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="">Tất cả Trạng thái</option>
            <option value="ACTIVE">ACTIVE (Hoạt động)</option>
            <option value="SUSPENDED">SUSPENDED (Tạm khóa)</option>
            <option value="SHADOWBANNED">SHADOWBANNED (Hạn chế ngầm)</option>
            <option value="DELETED">DELETED (Đã xóa)</option>
          </select>
        </div>
      </div>

      {/* DATA TABLE */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          border: '1px solid #E6DFD5',
          overflowX: 'auto',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#FAF7F2', borderBottom: '1px solid #E6DFD5', color: '#787774' }}>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Người Dùng</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Email</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Vai Trò (Role)</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Trạng Thái</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Karma</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'right' }}>Thao Tác Quản Trị</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#787774' }}>
                  Đang truy xuất danh sách người dùng...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#787774' }}>
                  Không tìm thấy người dùng nào phù hợp với bộ lọc tìm kiếm.
                </td>
              </tr>
            ) : (
              users.map((u) => {
                const isOperating = actionLoadingId === u.id;
                return (
                  <tr
                    key={u.id}
                    style={{
                      borderBottom: '1px solid #F0EAE1',
                      transition: 'background-color 0.15s',
                    }}
                  >
                    {/* USERNAME & AVATAR */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '4px',
                            backgroundColor: u.role === 'ADMIN' ? '#12544F' : '#FAF7F2',
                            color: u.role === 'ADMIN' ? '#FFFFFF' : '#4A4A4A',
                            border: u.role === 'ADMIN' ? 'none' : '1px solid #E6DFD5',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                          }}
                        >
                          {u.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: '#1E2328' }}>{u.username}</div>
                          <div style={{ fontSize: '0.7rem', color: '#9EA3A8', fontFamily: 'var(--font-mono)' }}>{u.id.slice(0, 8)}...</div>
                        </div>
                      </div>
                    </td>

                    {/* EMAIL */}
                    <td style={{ padding: '0.85rem 1rem', color: '#4A4A4A' }}>{u.email}</td>

                    {/* ROLE BADGE */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span
                        style={{
                          padding: '0.15rem 0.55rem',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          fontFamily: 'var(--font-mono)',
                          backgroundColor:
                            u.role === 'ADMIN'
                              ? '#EAF2F1'
                              : u.role === 'SPACE_MOD' || u.role === 'GLOBAL_MOD'
                              ? '#FDF6E2'
                              : '#FAF7F2',
                          color:
                            u.role === 'ADMIN'
                              ? '#12544F'
                              : u.role === 'SPACE_MOD' || u.role === 'GLOBAL_MOD'
                              ? '#8C6514'
                              : '#4A4A4A',
                          border: '1px solid',
                          borderColor:
                            u.role === 'ADMIN'
                              ? 'rgba(18,84,79,0.2)'
                              : u.role === 'SPACE_MOD' || u.role === 'GLOBAL_MOD'
                              ? 'rgba(140,101,20,0.2)'
                              : '#E6DFD5',
                        }}
                      >
                        {u.role}
                      </span>
                    </td>

                    {/* STATUS BADGE */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span
                        style={{
                          padding: '0.15rem 0.55rem',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          backgroundColor:
                            u.status === 'ACTIVE'
                              ? '#EDF7ED'
                              : u.status === 'SUSPENDED'
                              ? '#FDEBEC'
                              : '#FAF7F2',
                          color:
                            u.status === 'ACTIVE'
                              ? '#1E4620'
                              : u.status === 'SUSPENDED'
                              ? '#9F2F2D'
                              : '#787774',
                        }}
                      >
                        {u.status}
                      </span>
                    </td>

                    {/* KARMA */}
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: '#12544F', fontFamily: 'var(--font-mono)' }}>
                      {u.karmaScore}
                    </td>

                    {/* ACTIONS */}
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center' }}>
                        {/* ROLE SELECT */}
                        <select
                          disabled={isOperating}
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                          style={{
                            padding: '0.3rem 0.5rem',
                            backgroundColor: '#FAF7F2',
                            border: '1px solid #E6DFD5',
                            borderRadius: '4px',
                            color: '#1E2328',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                          }}
                        >
                          <option value="USER">USER</option>
                          <option value="SPACE_MOD">SPACE_MOD</option>
                          <option value="GLOBAL_MOD">GLOBAL_MOD</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>

                        {/* STATUS TOGGLE */}
                        <button
                          disabled={isOperating}
                          onClick={() => handleStatusToggle(u.id, u.status)}
                          style={{
                            padding: '0.3rem 0.6rem',
                            borderRadius: '4px',
                            border: '1px solid',
                            borderColor: u.status === 'ACTIVE' ? '#FAD1D4' : '#C8E6C9',
                            backgroundColor: u.status === 'ACTIVE' ? '#FDEBEC' : '#EDF7ED',
                            color: u.status === 'ACTIVE' ? '#9F2F2D' : '#1E4620',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          {u.status === 'ACTIVE' ? 'Khóa' : 'Mở'}
                        </button>

                        {/* REVOKE SESSIONS */}
                        <button
                          disabled={isOperating}
                          onClick={() => handleRevokeSessions(u.id, u.username)}
                          title="Thu hồi toàn bộ phiên đăng nhập"
                          style={{
                            padding: '0.3rem 0.55rem',
                            borderRadius: '4px',
                            border: '1px solid #E6DFD5',
                            backgroundColor: '#FAF7F2',
                            color: '#787774',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                          }}
                        >
                          Đăng xuất
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* PAGINATION FOOTER */}
        <div
          style={{
            padding: '0.85rem 1.25rem',
            borderTop: '1px solid #E6DFD5',
            backgroundColor: '#FAF7F2',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.82rem',
            color: '#787774',
          }}
        >
          <div>
            Trang <strong>{page}</strong> / <strong>{totalPages}</strong> (Tổng cộng <strong>{total}</strong> tài khoản)
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              disabled={page <= 1 || loading}
              onClick={() => loadData(page - 1)}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '4px',
                border: '1px solid #E6DFD5',
                backgroundColor: '#FFFFFF',
                color: page <= 1 ? '#D5CCC0' : '#4A4A4A',
                cursor: page <= 1 ? 'not-allowed' : 'pointer',
                fontSize: '0.8rem',
              }}
            >
              Trang trước
            </button>
            <button
              disabled={page >= totalPages || loading}
              onClick={() => loadData(page + 1)}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '4px',
                border: '1px solid #E6DFD5',
                backgroundColor: '#FFFFFF',
                color: page >= totalPages ? '#D5CCC0' : '#4A4A4A',
                cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                fontSize: '0.8rem',
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
