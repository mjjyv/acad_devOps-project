'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { CHECKLIST_TASKS, STAGES_PROGRESS } from '../../../lib/docs-data/index.js';
import { ChecklistTaskStatus } from '../../../lib/docs-data/types.js';

export default function ChecklistPage() {
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedStage, setSelectedStage] = useState<number | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredTasks = CHECKLIST_TASKS.filter((task) => {
    if (selectedStatus !== 'ALL' && task.status !== selectedStatus) return false;
    if (selectedStage !== 'ALL' && task.stageNumber !== selectedStage) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        task.title.toLowerCase().includes(q) ||
        task.description.toLowerCase().includes(q) ||
        task.tag.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const getStatusBadge = (status: ChecklistTaskStatus) => {
    switch (status) {
      case 'COMPLETED':
        return { text: '✓ ĐÃ HOÀN THÀNH', bg: '#064e3b', color: '#6ee7b7' };
      case 'IN_PROGRESS':
        return { text: '⏳ ĐANG THỰC HIỆN', bg: '#451a03', color: '#fde68a' };
      case 'PLANNED':
        return { text: '📋 DỰ KIẾN', bg: '#1e293b', color: '#94a3b8' };
    }
  };

  return (
    <main style={{ padding: '2rem 3rem', maxWidth: '1100px', margin: '0 auto' }}>
      {/* HEADER */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem' }}>
          <Link href="/docs" style={{ color: '#94a3b8', textDecoration: 'none' }}>
            Docs
          </Link>
          <span>/</span>
          <span style={{ color: '#38bdf8' }}>Checklist 7 Giai đoạn</span>
        </div>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#f8fafc', margin: '0 0 0.5rem 0', letterSpacing: '-0.02em' }}>
          Checklist Tiến Độ 7 Giai Đoạn Dự Án
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '1rem', lineHeight: '1.6', margin: 0 }}>
          Số hóa toàn bộ 2050 dòng đặc tả quy chuẩn từ tài liệu gốc. Theo dõi thời gian thực tiến độ từng hạng mục kỹ thuật,
          tập tin bàn giao (deliverables) và tiêu chuẩn nghiệm thu (verification criteria).
        </p>
      </div>

      {/* BẢNG TIẾN ĐỘ TỪNG GIAI ĐOẠN */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
        {STAGES_PROGRESS.map((stage) => (
          <div
            key={stage.stageNumber}
            onClick={() => setSelectedStage(stage.stageNumber === selectedStage ? 'ALL' : stage.stageNumber)}
            style={{
              padding: '1.25rem',
              backgroundColor: '#131926',
              borderRadius: '8px',
              border: `1px solid ${selectedStage === stage.stageNumber ? '#38bdf8' : '#1e293b'}`,
              cursor: 'pointer',
              transition: 'border-color 0.2s',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#38bdf8' }}>
                {stage.stageName.toUpperCase()}
              </span>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  padding: '0.1rem 0.4rem',
                  borderRadius: '4px',
                  backgroundColor: stage.completedPercent === 100 ? '#064e3b' : stage.completedPercent > 0 ? '#451a03' : '#1e293b',
                  color: stage.completedPercent === 100 ? '#6ee7b7' : stage.completedPercent > 0 ? '#fde68a' : '#94a3b8',
                }}
              >
                {stage.completedPercent}%
              </span>
            </div>
            <div style={{ color: '#f8fafc', fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {stage.title}
            </div>

            {/* PROGRESS BAR */}
            <div style={{ width: '100%', height: '6px', backgroundColor: '#1e293b', borderRadius: '3px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${stage.completedPercent}%`,
                  height: '100%',
                  backgroundColor: stage.completedPercent === 100 ? '#10b981' : '#38bdf8',
                  borderRadius: '3px',
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* THANH BỘ LỌC VÀ TÌM KIẾM */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1rem',
          backgroundColor: '#131926',
          borderRadius: '8px',
          border: '1px solid #1e293b',
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {[
            { label: 'Tất cả', value: 'ALL' },
            { label: '✓ Hoàn thành', value: 'COMPLETED' },
            { label: '⏳ Đang làm', value: 'IN_PROGRESS' },
            { label: '📋 Dự kiến', value: 'PLANNED' },
          ].map((btn) => (
            <button
              key={btn.value}
              onClick={() => setSelectedStatus(btn.value)}
              type="button"
              style={{
                padding: '0.4rem 0.8rem',
                borderRadius: '6px',
                border: '1px solid #334155',
                backgroundColor: selectedStatus === btn.value ? '#2563eb' : '#0f172a',
                color: selectedStatus === btn.value ? '#ffffff' : '#cbd5e1',
                fontSize: '0.85rem',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Lọc theo tên tác vụ, tag..."
          style={{
            padding: '0.4rem 0.8rem',
            borderRadius: '6px',
            border: '1px solid #334155',
            backgroundColor: '#0f172a',
            color: '#f8fafc',
            fontSize: '0.85rem',
            minWidth: '240px',
          }}
        />
      </div>

      {/* DANH SÁCH TÁC VỤ */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {filteredTasks.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8', backgroundColor: '#131926', borderRadius: '8px' }}>
            Không tìm thấy tác vụ nào phù hợp với bộ lọc hiện tại.
          </div>
        ) : (
          filteredTasks.map((task) => {
            const badge = getStatusBadge(task.status);
            return (
              <div
                key={task.id}
                style={{
                  padding: '1.25rem 1.5rem',
                  backgroundColor: '#131926',
                  borderRadius: '8px',
                  border: '1px solid #1e293b',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.15rem 0.4rem', borderRadius: '4px', backgroundColor: '#1e3a5f', color: '#38bdf8' }}>
                      GĐ {task.stageNumber}
                    </span>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc', margin: 0 }}>
                      {task.title}
                    </h3>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: '4px', backgroundColor: '#1e293b', color: '#cbd5e1' }}>
                      #{task.tag}
                    </span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.15rem 0.5rem', borderRadius: '4px', backgroundColor: badge.bg, color: badge.color }}>
                      {badge.text}
                    </span>
                  </div>
                </div>

                <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: '1.5', margin: 0 }}>
                  {task.description}
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid #1e293b', fontSize: '0.85rem' }}>
                  <div>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>Tập tin bàn giao:</span>{' '}
                    <span style={{ color: '#38bdf8', fontFamily: 'monospace' }}>
                      {task.deliverables.join(', ')}
                    </span>
                  </div>

                  <div>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>Tiêu chuẩn nghiệm thu:</span>{' '}
                    <span style={{ color: '#a7f3d0' }}>
                      {task.verificationCriteria}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}
