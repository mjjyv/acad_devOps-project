'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Space } from '@acad/contracts';
import { communityClient } from '../../../lib/community-client';

export default function AdminSpacesPage() {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadSpaces = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const data = await communityClient.adminFetchSpaces();
      setSpaces(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Không thể tải danh sách không gian');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSpaces();
  }, []);

  const handleDeleteSpace = async (space: Space) => {
    if (
      !confirm(
        `[CẢNH BÁO NGUY HIỂM]\nBạn có chắc chắn muốn xóa không gian [${space.name}] (s/${space.slug})?\nTất cả các bài viết liên kết trong không gian này sẽ bị xóa khỏi hệ thống.`,
      )
    ) {
      return;
    }

    try {
      setDeletingId(space.id);
      await communityClient.adminDeleteSpace(space.id);
      setActionMessage(`Đã xóa thành công không gian thảo luận: ${space.name}`);
      await loadSpaces();
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khi xóa không gian');
    } finally {
      setDeletingId(null);
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
            SPACES MANAGEMENT //
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
            QUẢN TRỊ KHÔNG GIAN THẢO LUẬN
          </h1>
          <p style={{ color: '#948979', margin: 0, fontSize: '0.82rem' }}>
            Tổng cộng: <strong style={{ color: '#DFD0B8' }}>{spaces.length}</strong> không gian cộng đồng | Giám sát số thành viên và số lượng bài viết.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={loadSpaces}
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

      {/* SPACES TABLE BRUTALIST DARK */}
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
              <th style={{ padding: '0.75rem 1rem', fontWeight: 800, fontSize: '0.72rem', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }}>TÊN KHÔNG GIAN</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 800, fontSize: '0.72rem', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }}>SLUG</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 800, fontSize: '0.72rem', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)', textAlign: 'center' }}>SỐ THÀNH VIÊN</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 800, fontSize: '0.72rem', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)', textAlign: 'center' }}>SỐ BÀI VIẾT</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 800, fontSize: '0.72rem', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }}>QUY CHUẨN</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 800, fontSize: '0.72rem', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }}>NGÀY TẠO</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 800, fontSize: '0.72rem', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)', textAlign: 'right' }}>THAO TÁC</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#948979', fontFamily: 'var(--font-mono)' }}>
                  &gt; Đang truy xuất danh sách không gian cộng đồng...
                </td>
              </tr>
            ) : spaces.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#948979', fontFamily: 'var(--font-mono)' }}>
                  [!] Hiện chưa có không gian thảo luận nào trên hệ thống.
                </td>
              </tr>
            ) : (
              spaces.map((s) => {
                const isDeleting = deletingId === s.id;
                return (
                  <tr
                    key={s.id}
                    style={{
                      borderBottom: '1px solid #222831',
                      backgroundColor: '#393E46',
                    }}
                  >
                    {/* NAME & DESC */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            backgroundColor: '#222831',
                            color: '#DFD0B8',
                            border: '1px solid #948979',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.8rem',
                            fontWeight: 900,
                            fontFamily: 'var(--font-mono)',
                          }}
                        >
                          #
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, color: '#DFD0B8', fontFamily: 'var(--font-mono)' }}>
                            {s.name}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#948979', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {s.description || 'Không có mô tả'}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* SLUG */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <Link
                        href={`/s/${s.slug}`}
                        target="_blank"
                        style={{
                          color: '#DFD0B8',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.8rem',
                          textDecoration: 'none',
                          borderBottom: '1px dotted #948979',
                        }}
                      >
                        s/{s.slug} &nearr;
                      </Link>
                    </td>

                    {/* MEMBER COUNT */}
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
                        {s.memberCount ?? 0}
                      </span>
                    </td>

                    {/* THREAD COUNT */}
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
                        {s.threadCount ?? 0}
                      </span>
                    </td>

                    {/* RULES */}
                    <td style={{ padding: '0.85rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#948979' }}>
                      {s.rules?.length || 0} quy định
                    </td>

                    {/* CREATED AT */}
                    <td style={{ padding: '0.85rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#948979' }}>
                      {new Date(s.createdAt).toLocaleDateString('vi-VN')}
                    </td>

                    {/* ACTIONS */}
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.45rem', justifyContent: 'flex-end' }}>
                        <Link
                          href={`/s/${s.slug}`}
                          target="_blank"
                          style={{
                            padding: '0.3rem 0.6rem',
                            backgroundColor: '#222831',
                            color: '#DFD0B8',
                            border: '1px solid #948979',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            textDecoration: 'none',
                          }}
                        >
                          XEM
                        </Link>

                        <button
                          onClick={() => handleDeleteSpace(s)}
                          disabled={isDeleting}
                          style={{
                            padding: '0.3rem 0.6rem',
                            backgroundColor: '#222831',
                            color: '#ff7777',
                            border: '1px solid #948979',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            cursor: isDeleting ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {isDeleting ? '...' : 'XÓA'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
