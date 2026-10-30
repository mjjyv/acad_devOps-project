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
        return { text: '[✓ HOÀN THÀNH]', bg: '#222831', color: '#DFD0B8' };
      case 'IN_PROGRESS':
        return { text: '[⏳ ĐANG LÀM]', bg: '#222831', color: '#f59e0b' };
      case 'PLANNED':
        return { text: '[📋 DỰ KIẾN]', bg: '#222831', color: '#948979' };
    }
  };

  return (
    <main style={{ padding: '2rem 3rem', maxWidth: '1100px', margin: '0 auto', color: '#DFD0B8' }}>
      {/* HEADER */}
      <div style={{ marginBottom: '2rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.8rem',
            color: '#948979',
            marginBottom: '0.5rem',
            fontFamily: 'var(--font-mono)',
          }}
        >
          <Link href="/docs" style={{ color: '#948979', textDecoration: 'none' }}>
            ACAD.DOCS
          </Link>
          <span>//</span>
          <span style={{ color: '#DFD0B8', fontWeight: 800 }}>CHECKLIST 7 GIAI ĐOẠN</span>
        </div>
        <h1
          style={{
            fontSize: '1.85rem',
            fontWeight: 900,
            color: '#DFD0B8',
            margin: '0 0 0.5rem 0',
            fontFamily: 'var(--font-mono)',
          }}
        >
          TIẾN ĐỘ THI CÔNG DỰ ÁN (7 STAGES)
        </h1>
        <p style={{ color: '#948979', fontSize: '0.92rem', lineHeight: '1.6', margin: 0 }}>
          Số hóa toàn bộ 2050 dòng đặc tả quy chuẩn từ tài liệu gốc. Theo dõi thời gian thực tiến độ từng hạng mục kỹ thuật,
          tập tin bàn giao (deliverables) và tiêu chuẩn nghiệm thu (verification criteria).
        </p>
      </div>

      {/* BẢNG TIẾN ĐỘ TỪNG GIAI ĐOẠN */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
        {STAGES_PROGRESS.map((stage) => {
          const isSelected = selectedStage === stage.stageNumber;
          return (
            <div
              key={stage.stageNumber}
              onClick={() => setSelectedStage(isSelected ? 'ALL' : stage.stageNumber)}
              style={{
                padding: '1.25rem',
                backgroundColor: isSelected ? '#DFD0B8' : '#393E46',
                color: isSelected ? '#222831' : '#DFD0B8',
                border: '2px solid #948979',
                boxShadow: isSelected ? '3px 3px 0px #DFD0B8' : '3px 3px 0px #948979',
                cursor: 'pointer',
                transition: 'all 0.1s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 900, fontFamily: 'var(--font-mono)' }}>
                  {stage.stageName.toUpperCase()}
                </span>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 900,
                    padding: '0.1rem 0.4rem',
                    backgroundColor: isSelected ? '#222831' : '#222831',
                    color: isSelected ? '#DFD0B8' : '#DFD0B8',
                    border: '1px solid #948979',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {stage.completedPercent}%
                </span>
              </div>
              <div
                style={{
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  marginBottom: '0.5rem',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {stage.title}
              </div>

              {/* PROGRESS BAR */}
              <div style={{ width: '100%', height: '6px', backgroundColor: isSelected ? '#393E46' : '#222831', border: '1px solid #948979' }}>
                <div
                  style={{
                    width: `${stage.completedPercent}%`,
                    height: '100%',
                    backgroundColor: isSelected ? '#222831' : '#DFD0B8',
                  }}
                />
              </div>
            </div>
          );
        })}
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
          backgroundColor: '#393E46',
          border: '2px solid #948979',
          boxShadow: '3px 3px 0px #948979',
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {[
            { label: 'TẤT CẢ', value: 'ALL' },
            { label: '✓ HOÀN THÀNH', value: 'COMPLETED' },
            { label: '⏳ ĐANG LÀM', value: 'IN_PROGRESS' },
            { label: '📋 DỰ KIẾN', value: 'PLANNED' },
          ].map((btn) => (
            <button
              key={btn.value}
              onClick={() => setSelectedStatus(btn.value)}
              type="button"
              style={{
                padding: '0.4rem 0.8rem',
                border: '2px solid #948979',
                backgroundColor: selectedStatus === btn.value ? '#DFD0B8' : '#222831',
                color: selectedStatus === btn.value ? '#222831' : '#DFD0B8',
                fontSize: '0.78rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: selectedStatus === btn.value ? '2px 2px 0px #DFD0B8' : 'none',
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Tìm task, deliverable, tiêu chí..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            padding: '0.45rem 0.85rem',
            backgroundColor: '#222831',
            border: '2px solid #948979',
            color: '#DFD0B8',
            fontSize: '0.82rem',
            fontFamily: 'var(--font-mono)',
            outline: 'none',
            minWidth: '260px',
          }}
        />
      </div>

      {/* DANH SÁCH CHECKLIST TASKS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {filteredTasks.length === 0 ? (
          <div
            style={{
              padding: '3rem',
              backgroundColor: '#393E46',
              border: '2px solid #948979',
              textAlign: 'center',
              color: '#948979',
              fontFamily: 'var(--font-mono)',
            }}
          >
            [!] Không tìm thấy tác vụ nào khớp với bộ lọc.
          </div>
        ) : (
          filteredTasks.map((task) => {
            const badge = getStatusBadge(task.status);
            return (
              <div
                key={task.id}
                style={{
                  padding: '1.25rem',
                  backgroundColor: '#393E46',
                  border: '2px solid #948979',
                  boxShadow: '3px 3px 0px #948979',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span
                      style={{
                        padding: '0.15rem 0.5rem',
                        backgroundColor: '#222831',
                        border: '1px solid #948979',
                        color: '#DFD0B8',
                        fontSize: '0.7rem',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 800,
                      }}
                    >
                      GĐ {task.stageNumber}
                    </span>
                    <span
                      style={{
                        padding: '0.15rem 0.5rem',
                        backgroundColor: '#222831',
                        border: '1px solid #948979',
                        color: '#948979',
                        fontSize: '0.7rem',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      #{task.tag}
                    </span>
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#DFD0B8', margin: 0, fontFamily: 'var(--font-mono)' }}>
                      {task.title}
                    </h3>
                  </div>

                  <span
                    style={{
                      padding: '0.2rem 0.55rem',
                      backgroundColor: badge.bg,
                      color: badge.color,
                      border: '1px solid #948979',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {badge.text}
                  </span>
                </div>

                <p style={{ color: '#948979', fontSize: '0.88rem', lineHeight: '1.6', margin: '0 0 0.85rem 0' }}>
                  {task.description}
                </p>

                {task.deliverables && task.deliverables.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', color: '#948979', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                      DELIVERABLES:
                    </span>
                    {task.deliverables.map((del, dIdx) => (
                      <span
                        key={dIdx}
                        style={{
                          padding: '0.15rem 0.45rem',
                          backgroundColor: '#222831',
                          border: '1px solid #948979',
                          color: '#DFD0B8',
                          fontSize: '0.72rem',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        {del}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}
