'use client';

import React, { useEffect, useState } from 'react';
import { UserProfile, UserRole, UserStatus } from '@acad/contracts';
import { webAuth } from '../../../lib/auth-client';

export default function AdminUsersDashboardPage() {
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

      const usersData = await webAuth.adminListUsers({
        page: targetPage,
        limit: 15,
        role: (roleFilter || undefined) as UserRole | undefined,
        status: (statusFilter || undefined) as UserStatus | undefined,
        search: searchQuery || undefined,
      });

      setUsers(usersData.users);
      setTotal(usersData.total);
      setPage(usersData.page);
      setTotalPages(usersData.totalPages || 1);
    } catch (err: any) {
      setErrorMessage(err.message || 'Không thể nạp dữ liệu người dùng');
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
      setActionMessage(`Đã cập nhật vai trò người dùng thành [${newRole}]`);
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
    if (
      !confirm(
        `Xác nhận thu hồi toàn bộ phiên đăng nhập của [${username}]? Người dùng này sẽ bị đăng xuất khỏi mọi thiết bị ngay lập tức.`,
      )
    ) {
      return;
    }

    try {
      setActionLoadingId(userId);
      await webAuth.adminRevokeUserSessions(userId);
      setActionMessage(`Đã cưỡng chế thu hồi mọi phiên của [${username}]`);
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khi thu hồi phiên');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* HEADER SECTION */}
      <div
        style={{
          backgroundColor: '#393E46',
          border: '2px solid #948979',
          padding: '1.5rem',
          boxShadow: '4px 4px 0px #948979',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div
            style={{
              fontSize: '0.72rem',
              fontWeight: 800,
              color: '#948979',
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            RBAC &amp; USER AUDIT //
          </div>
          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 900,
              color: '#DFD0B8',
              margin: '0.2rem 0',
              fontFamily: 'var(--font-mono)',
            }}
          >
            QUẢN TRỊ NGƯỜI DÙNG &amp; NỘI DUNG
          </h1>
          <p style={{ color: '#948979', margin: 0, fontSize: '0.82rem' }}>
            Tổng cộng: <strong style={{ color: '#DFD0B8' }}>{total}</strong> tài khoản hệ thống | Xem số lượng bài viết và điều chỉnh quyền truy cập.
          </p>
        </div>

        <button
          onClick={() => loadData()}
          disabled={loading}
          style={{
            padding: '0.5rem 1.15rem',
            backgroundColor: '#222831',
            color: '#DFD0B8',
            border: '2px solid #948979',
            fontFamily: 'var(--font-mono)',
            fontWeight: 800,
            fontSize: '0.8rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: '2px 2px 0px #948979',
          }}
        >
          {loading ? '[ ĐANG TẢI... ]' : '[ TẢI LẠI ]'}
        </button>
      </div>

      {/* FEEDBACK BANNERS */}
      {actionMessage && (
        <div
          style={{
            backgroundColor: '#393E46',
            border: '2px solid #948979',
            borderLeft: '6px solid #4E9F3D',
            padding: '0.85rem 1.25rem',
            color: '#DFD0B8',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.85rem',
          }}
        >
          [THÀNH CÔNG]: {actionMessage}
        </div>
      )}

      {errorMessage && (
        <div
          style={{
            backgroundColor: '#393E46',
            border: '2px solid #948979',
            borderLeft: '6px solid #ff5555',
            padding: '0.85rem 1.25rem',
            color: '#ff7777',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.85rem',
          }}
        >
          [LỖI]: {errorMessage}
        </div>
      )}

      {/* FILTERS & SEARCH TOOLBAR */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          backgroundColor: '#393E46',
          padding: '1rem',
          border: '2px solid #948979',
          boxShadow: '3px 3px 0px #948979',
        }}
      >
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.5rem', flex: '1', maxWidth: '450px' }}>
          <input
            type="text"
            placeholder="Tìm theo username hoặc email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: '1',
              padding: '0.5rem 0.85rem',
              backgroundColor: '#222831',
              border: '2px solid #948979',
              color: '#DFD0B8',
              fontSize: '0.85rem',
              fontFamily: 'var(--font-mono)',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#DFD0B8',
              color: '#222831',
              border: '2px solid #948979',
              fontWeight: 800,
              fontSize: '0.82rem',
              fontFamily: 'var(--font-mono)',
              cursor: 'pointer',
              boxShadow: '2px 2px 0px #948979',
            }}
          >
            TÌM
          </button>
        </form>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{
              padding: '0.5rem 0.85rem',
              backgroundColor: '#222831',
              border: '2px solid #948979',
              color: '#DFD0B8',
              fontSize: '0.82rem',
              fontFamily: 'var(--font-mono)',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="">-- TẤT CẢ VAI TRÒ --</option>
            <option value="USER">USER (Thành viên)</option>
            <option value="SPACE_MOD">SPACE_MOD (Điều hành Space)</option>
            <option value="GLOBAL_MOD">GLOBAL_MOD (Điều hành Toàn hệ thống)</option>
            <option value="ADMIN">ADMIN (Quản trị viên)</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '0.5rem 0.85rem',
              backgroundColor: '#222831',
              border: '2px solid #948979',
              color: '#DFD0B8',
              fontSize: '0.82rem',
              fontFamily: 'var(--font-mono)',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="">-- TẤT CẢ TRẠNG THÁI --</option>
            <option value="ACTIVE">ACTIVE (Hoạt động)</option>
            <option value="SUSPENDED">SUSPENDED (Tạm khóa)</option>
            <option value="SHADOWBANNED">SHADOWBANNED (Khóa ngầm)</option>
            <option value="DELETED">DELETED (Đã xóa)</option>
          </select>
        </div>
      </div>

      {/* DATA TABLE BRUTALIST DARK */}
      <div
        style={{
          backgroundColor: '#393E46',
          border: '2px solid #948979',
          overflowX: 'auto',
          boxShadow: '4px 4px 0px #948979',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#222831', borderBottom: '2px solid #948979', color: '#DFD0B8' }}>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 800, fontSize: '0.72rem', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }}>NGƯỜI DÙNG</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 800, fontSize: '0.72rem', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }}>EMAIL</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 800, fontSize: '0.72rem', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }}>VAI TRÒ</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 800, fontSize: '0.72rem', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }}>TRẠNG THÁI</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 800, fontSize: '0.72rem', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)', textAlign: 'center' }}>SỐ BÀI VIẾT</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 800, fontSize: '0.72rem', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)', textAlign: 'center' }}>KARMA</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 800, fontSize: '0.72rem', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)', textAlign: 'right' }}>THAO TÁC</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#948979', fontFamily: 'var(--font-mono)' }}>
                  &gt; Đang nạp danh sách tài khoản...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#948979', fontFamily: 'var(--font-mono)' }}>
                  [!] Không tìm thấy người dùng nào phù hợp với bộ lọc.
                </td>
              </tr>
            ) : (
              users.map((u) => {
                const isOperating = actionLoadingId === u.id;
                return (
                  <tr
                    key={u.id}
                    style={{
                      borderBottom: '1px solid #222831',
                      backgroundColor: '#393E46',
                    }}
                  >
                    {/* USERNAME */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '0px',
                            backgroundColor: u.role === 'ADMIN' ? '#DFD0B8' : '#222831',
                            color: u.role === 'ADMIN' ? '#222831' : '#DFD0B8',
                            border: '1px solid #948979',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.8rem',
                            fontWeight: 900,
                            fontFamily: 'var(--font-mono)',
                          }}
                        >
                          {u.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, color: '#DFD0B8', fontFamily: 'var(--font-mono)' }}>
                            {u.username}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#948979' }}>
                            ID: {u.id.substring(0, 8)}...
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* EMAIL */}
                    <td style={{ padding: '0.85rem 1rem', color: '#DFD0B8', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                      {u.email}
                    </td>

                    {/* ROLE DROPDOWN */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <select
                        value={u.role}
                        disabled={isOperating}
                        onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                        style={{
                          padding: '0.3rem 0.5rem',
                          backgroundColor: '#222831',
                          border: '1px solid #948979',
                          color: u.role === 'ADMIN' ? '#DFD0B8' : '#DFD0B8',
                          fontSize: '0.78rem',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                          cursor: 'pointer',
                          outline: 'none',
                        }}
                      >
                        <option value="USER">USER</option>
                        <option value="SPACE_MOD">SPACE_MOD</option>
                        <option value="GLOBAL_MOD">GLOBAL_MOD</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </td>

                    {/* STATUS BADGE */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span
                        style={{
                          padding: '0.2rem 0.5rem',
                          border: '1px solid #948979',
                          backgroundColor: u.status === 'ACTIVE' ? '#222831' : '#4a2525',
                          color: u.status === 'ACTIVE' ? '#DFD0B8' : '#ff7777',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        {u.status}
                      </span>
                    </td>

                    {/* THREADS COUNT */}
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                      <span
                        style={{
                          padding: '0.2rem 0.6rem',
                          backgroundColor: '#222831',
                          border: '1px solid #948979',
                          color: '#DFD0B8',
                          fontWeight: 900,
                          fontSize: '0.82rem',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        {u.threadsCount ?? 0}
                      </span>
                    </td>

                    {/* KARMA */}
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#DFD0B8' }}>
                      {u.karmaScore}
                    </td>

                    {/* ACTIONS */}
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.45rem', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => handleStatusToggle(u.id, u.status)}
                          disabled={isOperating}
                          style={{
                            padding: '0.3rem 0.6rem',
                            backgroundColor: u.status === 'ACTIVE' ? '#222831' : '#DFD0B8',
                            color: u.status === 'ACTIVE' ? '#ff7777' : '#222831',
                            border: '1px solid #948979',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                          }}
                        >
                          {u.status === 'ACTIVE' ? 'KHÓA' : 'MỞ KHÓA'}
                        </button>

                        <button
                          onClick={() => handleRevokeSessions(u.id, u.username)}
                          disabled={isOperating}
                          title="Cưỡng chế hủy tất cả phiên đăng nhập"
                          style={{
                            padding: '0.3rem 0.6rem',
                            backgroundColor: '#222831',
                            color: '#DFD0B8',
                            border: '1px solid #948979',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                          }}
                        >
                          HỦY PHIÊN
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* PAGINATION */}
        <div
          style={{
            padding: '0.85rem 1.25rem',
            backgroundColor: '#222831',
            borderTop: '2px solid #948979',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.8rem',
            fontFamily: 'var(--font-mono)',
          }}
        >
          <div style={{ color: '#948979' }}>
            Trang <strong style={{ color: '#DFD0B8' }}>{page}</strong> / {totalPages} (Tổng: {total} người dùng)
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => loadData(page - 1)}
              disabled={page <= 1 || loading}
              style={{
                padding: '0.3rem 0.75rem',
                backgroundColor: '#393E46',
                color: page <= 1 ? '#948979' : '#DFD0B8',
                border: '1px solid #948979',
                cursor: page <= 1 ? 'not-allowed' : 'pointer',
                fontWeight: 700,
              }}
            >
              &larr; TRƯỚC
            </button>
            <button
              onClick={() => loadData(page + 1)}
              disabled={page >= totalPages || loading}
              style={{
                padding: '0.3rem 0.75rem',
                backgroundColor: '#393E46',
                color: page >= totalPages ? '#948979' : '#DFD0B8',
                border: '1px solid #948979',
                cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                fontWeight: 700,
              }}
            >
              SAU &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
