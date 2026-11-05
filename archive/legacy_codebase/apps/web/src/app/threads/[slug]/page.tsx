'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Navbar } from '../../../components/navbar';
import { useAuth } from '../../../contexts/auth-context';
import { communityClient } from '../../../lib/community-client';
import { ThreadDetail, FlatCommentItem, ContentAST } from '@acad/contracts';

export default function ThreadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const { user } = useAuth();

  const [thread, setThread] = useState<ThreadDetail | null>(null);
  const [comments, setComments] = useState<FlatCommentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Root comment input
  const [rootCommentText, setRootCommentText] = useState('');
  const [isSubmittingRoot, setIsSubmittingRoot] = useState(false);

  // Reply state
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  const loadThreadAndComments = async () => {
    if (!slug) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [threadData, commentsData] = await Promise.all([
        communityClient.fetchThread(slug),
        communityClient.fetchComments(slug),
      ]);

      if (!threadData) {
        setErrorMsg('Không tìm thấy bài viết yêu cầu');
      } else {
        setThread(threadData);
        setComments(commentsData);
      }
    } catch (err: any) {
      console.error('Error fetching thread:', err);
      setErrorMsg(err.message || 'Lỗi khi tải bài viết');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadThreadAndComments();
  }, [slug]);

  // Handle Thread Vote
  const handleVoteThread = async (direction: 1 | -1) => {
    if (!user) {
      alert('Vui lòng đăng nhập để vote bài viết!');
      return;
    }
    if (!thread) return;

    try {
      const res = await communityClient.voteThread(thread.id, direction);
      setThread((prev) =>
        prev
          ? {
              ...prev,
              counters: {
                ...prev.counters,
                netScore: res.netScore,
                upvotes: res.upvotes,
                downvotes: res.downvotes,
              },
              userVoteDirection: res.userVote,
            }
          : null,
      );
    } catch (err: any) {
      alert(err.message || 'Lỗi khi vote bài viết');
    }
  };

  // Handle Comment Vote
  const handleVoteComment = async (commentId: string, direction: 1 | -1) => {
    if (!user) {
      alert('Vui lòng đăng nhập để vote bình luận!');
      return;
    }

    try {
      const res = await communityClient.voteComment(commentId, direction);
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? {
                ...c,
                netScore: res.netScore,
                upvotes: res.upvotes,
                downvotes: res.downvotes,
                userVoteDirection: res.userVote,
              }
            : c,
        ),
      );
    } catch (err: any) {
      alert(err.message || 'Lỗi khi vote bình luận');
    }
  };

  // Submit Root Comment
  const handleCreateRootComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert('Vui lòng đăng nhập để bình luận!');
      return;
    }
    if (!rootCommentText.trim() || !thread) return;

    setIsSubmittingRoot(true);
    try {
      const contentAst: ContentAST = {
        type: 'doc',
        content: [{ type: 'paragraph', text: rootCommentText.trim() }],
      };

      const newComment = await communityClient.createComment({
        threadId: thread.id,
        parentId: null,
        contentAst,
      });

      setComments((prev) => [...prev, newComment]);
      setRootCommentText('');
      setThread((prev) =>
        prev
          ? {
              ...prev,
              counters: {
                ...prev.counters,
                commentCount: prev.counters.commentCount + 1,
              },
            }
          : null,
      );
    } catch (err: any) {
      alert(err.message || 'Lỗi khi gửi bình luận');
    } finally {
      setIsSubmittingRoot(false);
    }
  };

  // Submit Reply Comment
  const handleCreateReplyComment = async (parentId: string) => {
    if (!user) {
      alert('Vui lòng đăng nhập để phản hồi!');
      return;
    }
    if (!replyText.trim() || !thread) return;

    setIsSubmittingReply(true);
    try {
      const contentAst: ContentAST = {
        type: 'doc',
        content: [{ type: 'paragraph', text: replyText.trim() }],
      };

      const newReply = await communityClient.createComment({
        threadId: thread.id,
        parentId,
        contentAst,
      });

      setComments((prev) => {
        // Chèn vào ngay sau bình luận cha hoặc cuối danh sách và sắp xếp theo path
        const updated = [...prev, newReply];
        return updated.sort((a, b) => a.path.localeCompare(b.path));
      });

      setReplyText('');
      setReplyingToCommentId(null);
      setThread((prev) =>
        prev
          ? {
              ...prev,
              counters: {
                ...prev.counters,
                commentCount: prev.counters.commentCount + 1,
              },
            }
          : null,
      );
    } catch (err: any) {
      alert(err.message || 'Lỗi khi gửi phản hồi');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  // Delete Thread
  const handleDeleteThread = async () => {
    if (!thread) return;
    if (!confirm('Bạn có chắc chắn muốn xóa bài viết này không?')) return;

    try {
      await communityClient.deleteThread(thread.id);
      router.push('/');
    } catch (err: any) {
      alert(err.message || 'Lỗi khi xóa bài viết');
    }
  };

  // Render Tiptap Content AST
  const renderAstContent = (ast: ContentAST) => {
    if (!ast || !Array.isArray(ast.content)) {
      return <p>Không có nội dung chi tiết.</p>;
    }

    return ast.content.map((node, index) => {
      if (node.type === 'paragraph') {
        return (
          <p key={index} style={{ margin: '0 0 0.85rem 0', lineHeight: 1.6, color: '#DFD0B8', fontSize: '0.95rem' }}>
            {node.text}
          </p>
        );
      }
      if (node.type === 'codeBlock') {
        return (
          <div
            key={index}
            style={{
              margin: '0.85rem 0',
              backgroundColor: '#222831',
              border: '2px solid #948979',
              boxShadow: '3px 3px 0px #948979',
              padding: '1rem',
              overflowX: 'auto',
            }}
          >
            <div style={{ fontSize: '0.72rem', color: '#948979', fontFamily: 'var(--font-mono)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
              // CODE [{node.attrs?.language || 'snippet'}]
            </div>
            <pre style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#DFD0B8', whiteSpace: 'pre' }}>
              {node.text}
            </pre>
          </div>
        );
      }
      return null;
    });
  };

  if (isLoading) {
    return (
      <div style={{ backgroundColor: '#222831', minHeight: '100vh', color: '#DFD0B8' }}>
        <Navbar />
        <div style={{ maxWidth: '960px', margin: '4rem auto', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
          // ĐANG TẢI CHI TIẾT BÀI VIẾT & CÂY BÌNH LUẬN...
        </div>
      </div>
    );
  }

  if (errorMsg || !thread) {
    return (
      <div style={{ backgroundColor: '#222831', minHeight: '100vh', color: '#DFD0B8' }}>
        <Navbar />
        <div style={{ maxWidth: '960px', margin: '4rem auto', padding: '2rem', backgroundColor: '#393E46', border: '2px solid #D96B6B' }}>
          <h2 style={{ color: '#D96B6B', margin: '0 0 1rem 0' }}>[LỖI]: {errorMsg || 'Không tìm thấy bài viết'}</h2>
          <Link href="/" style={{ color: '#DFD0B8', textDecoration: 'underline', fontWeight: 700 }}>
            ← Quay lại Bảng Tin Cộng Đồng
          </Link>
        </div>
      </div>
    );
  }

  const isThreadAuthor = user?.id === thread.authorId || user?.role === 'ADMIN';

  return (
    <div style={{ backgroundColor: '#222831', minHeight: '100vh', color: '#DFD0B8' }}>
      <Navbar />

      <main style={{ maxWidth: '960px', margin: '0 auto', padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Navigation Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#948979' }}>
          <Link href="/" style={{ color: '#948979', textDecoration: 'none' }}>
            BẢNG TIN
          </Link>
          <span>/</span>
          <Link href={`/s/${thread.spaceSlug}`} style={{ color: '#DFD0B8', fontWeight: 700, textDecoration: 'none' }}>
            s/{thread.spaceSlug}
          </Link>
          <span>/</span>
          <span style={{ color: '#948979' }}>{thread.slug}</span>
        </div>

        {/* THREAD CONTAINER (BRUTALIST CARD) */}
        <article
          style={{
            backgroundColor: '#393E46',
            border: '2px solid #948979',
            boxShadow: '4px 4px 0px #948979',
            display: 'grid',
            gridTemplateColumns: '56px 1fr',
          }}
        >
          {/* Voting Column */}
          <div
            style={{
              backgroundColor: '#2E343E',
              borderRight: '2px solid #948979',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '1.25rem 0',
              gap: '0.5rem',
            }}
          >
            <button
              onClick={() => handleVoteThread(1)}
              style={{
                background: 'transparent',
                border: 'none',
                color: thread.userVoteDirection === 1 ? '#DFD0B8' : '#948979',
                cursor: 'pointer',
                transform: thread.userVoteDirection === 1 ? 'scale(1.25)' : 'none',
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill={thread.userVoteDirection === 1 ? '#DFD0B8' : 'none'} stroke="currentColor" strokeWidth="2.5">
                <polygon points="12 4 4 18 20 18" />
              </svg>
            </button>

            <span style={{ fontSize: '1rem', fontWeight: 900, color: '#DFD0B8', fontFamily: 'var(--font-mono)' }}>
              {thread.counters.netScore}
            </span>

            <button
              onClick={() => handleVoteThread(-1)}
              style={{
                background: 'transparent',
                border: 'none',
                color: thread.userVoteDirection === -1 ? '#D96B6B' : '#948979',
                cursor: 'pointer',
                transform: thread.userVoteDirection === -1 ? 'scale(1.25)' : 'none',
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill={thread.userVoteDirection === -1 ? '#D96B6B' : 'none'} stroke="currentColor" strokeWidth="2.5">
                <polygon points="12 20 4 6 20 6" />
              </svg>
            </button>
          </div>

          {/* Main Content Body */}
          <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Meta Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.8rem', color: '#948979' }}>
                <span style={{ backgroundColor: '#222831', padding: '0.2rem 0.5rem', border: '1px solid #948979', color: '#DFD0B8', fontWeight: 800 }}>
                  s/{thread.spaceSlug}
                </span>
                <span>•</span>
                <span style={{ color: '#DFD0B8', fontWeight: 700 }}>u/{thread.authorUsername}</span>
                <span>•</span>
                <span>{new Date(thread.createdAt).toLocaleString('vi-VN')}</span>
              </div>

              {isThreadAuthor && (
                <button
                  onClick={handleDeleteThread}
                  style={{
                    backgroundColor: '#222831',
                    border: '1px solid #D96B6B',
                    color: '#D96B6B',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.6rem',
                    cursor: 'pointer',
                  }}
                >
                  XÓA BÀI VIẾT
                </button>
              )}
            </div>

            {/* Title */}
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#DFD0B8', lineHeight: 1.3 }}>
              {thread.title}
            </h1>

            {/* Content AST */}
            <div style={{ borderTop: '1px solid #444A54', paddingTop: '1rem' }}>
              {renderAstContent(thread.contentAst)}
            </div>

            {/* Stats Footer */}
            <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.8rem', color: '#948979', borderTop: '1px solid #444A54', paddingTop: '0.75rem', fontFamily: 'var(--font-mono)' }}>
              <span>BÌNH LUẬN: {thread.counters.commentCount}</span>
              <span>LƯỢT XEM: {thread.counters.viewCount}</span>
              <span>TÁN THÀNH: {thread.counters.upvotes}</span>
            </div>
          </div>
        </article>

        {/* ================================================================= */}
        {/* COMMENTS SECTION */}
        {/* ================================================================= */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #948979', paddingBottom: '0.5rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#DFD0B8', textTransform: 'uppercase' }}>
              // BÌNH LUẬN ({comments.length})
            </h3>
          </div>

          {/* Root Comment Form */}
          {user ? (
            <form
              onSubmit={handleCreateRootComment}
              style={{
                backgroundColor: '#393E46',
                border: '2px solid #948979',
                padding: '1rem',
                boxShadow: '3px 3px 0px #948979',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#948979' }}>
                BÌNH LUẬN VỚI TƯ CÁCH u/{user.username}:
              </div>
              <textarea
                rows={3}
                placeholder="Góp ý chuyên môn, đặt câu hỏi hoặc bổ sung kiến thức kỹ thuật..."
                value={rootCommentText}
                onChange={(e) => setRootCommentText(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: '#222831',
                  border: '2px solid #948979',
                  color: '#DFD0B8',
                  padding: '0.65rem',
                  fontSize: '0.88rem',
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  disabled={isSubmittingRoot || !rootCommentText.trim()}
                  style={{
                    padding: '0.5rem 1.25rem',
                    backgroundColor: '#DFD0B8',
                    border: '2px solid #DFD0B8',
                    color: '#222831',
                    fontWeight: 900,
                    cursor: isSubmittingRoot || !rootCommentText.trim() ? 'not-allowed' : 'pointer',
                    boxShadow: '2px 2px 0px #948979',
                  }}
                >
                  {isSubmittingRoot ? 'ĐANG GỬI...' : 'GỬI BÌNH LUẬN'}
                </button>
              </div>
            </form>
          ) : (
            <div
              style={{
                backgroundColor: '#393E46',
                border: '2px solid #948979',
                padding: '1.25rem',
                textAlign: 'center',
              }}
            >
              <Link href="/login" style={{ color: '#DFD0B8', fontWeight: 800, textDecoration: 'underline' }}>
                Đăng nhập
              </Link>{' '}
              để tham gia bình luận thảo luận kỹ thuật cùng các kỹ sư!
            </div>
          )}

          {/* Comment Tree */}
          {comments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#948979', fontFamily: 'var(--font-mono)' }}>
              // CHƯA CÓ BÌNH LUẬN NÀO. HÃY MỞ ĐẦU CUỘC ĐỐI THOẠI!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {comments.map((comment) => {
                const isReplying = replyingToCommentId === comment.id;
                const indentPx = Math.min(comment.depth, 6) * 28;

                return (
                  <div
                    key={comment.id}
                    style={{
                      marginLeft: `${indentPx}px`,
                      borderLeft: comment.depth > 0 ? '3px solid #948979' : 'none',
                      paddingLeft: comment.depth > 0 ? '1rem' : '0',
                    }}
                  >
                    <div
                      style={{
                        backgroundColor: '#393E46',
                        border: '2px solid #948979',
                        padding: '1rem',
                        boxShadow: '2px 2px 0px #948979',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                      }}
                    >
                      {/* Comment Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#948979' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ fontWeight: 800, color: '#DFD0B8' }}>u/{comment.author.username}</span>
                          <span style={{ fontSize: '0.68rem', backgroundColor: '#222831', padding: '0.1rem 0.35rem', border: '1px solid #948979' }}>
                            {comment.author.karmaScore} pts
                          </span>
                          <span>•</span>
                          <span>{new Date(comment.createdAt).toLocaleString('vi-VN')}</span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: '#948979' }}>
                            [cấp {comment.depth}]
                          </span>
                        </div>
                      </div>

                      {/* Comment Body */}
                      <div style={{ color: '#DFD0B8', fontSize: '0.9rem', lineHeight: 1.5 }}>
                        {comment.contentAst?.content?.map((n: any, idx: number) => (
                          <p key={idx} style={{ margin: '0 0 0.4rem 0' }}>
                            {n.text}
                          </p>
                        ))}
                      </div>

                      {/* Comment Actions */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderTop: '1px solid #444A54', paddingTop: '0.4rem' }}>
                        {/* Vote Widget */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <button
                            onClick={() => handleVoteComment(comment.id, 1)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: comment.userVoteDirection === 1 ? '#DFD0B8' : '#948979',
                              cursor: 'pointer',
                              padding: 0,
                            }}
                          >
                            ▲
                          </button>
                          <span style={{ fontSize: '0.8rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#DFD0B8' }}>
                            {comment.netScore}
                          </span>
                          <button
                            onClick={() => handleVoteComment(comment.id, -1)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: comment.userVoteDirection === -1 ? '#D96B6B' : '#948979',
                              cursor: 'pointer',
                              padding: 0,
                            }}
                          >
                            ▼
                          </button>
                        </div>

                        {/* Reply Button */}
                        {user && (
                          <button
                            onClick={() => {
                              if (isReplying) {
                                setReplyingToCommentId(null);
                              } else {
                                setReplyingToCommentId(comment.id);
                                setReplyText('');
                              }
                            }}
                            style={{
                              backgroundColor: 'transparent',
                              border: 'none',
                              color: isReplying ? '#DFD0B8' : '#948979',
                              fontWeight: 700,
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                              textDecoration: 'underline',
                            }}
                          >
                            {isReplying ? 'ĐÓNG PHẢN HỒI' : 'TRẢ LỜI'}
                          </button>
                        )}
                      </div>

                      {/* Nested Reply Box */}
                      {isReplying && (
                        <div style={{ marginTop: '0.5rem', backgroundColor: '#222831', border: '1px solid #948979', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <textarea
                            rows={2}
                            placeholder={`Phản hồi trực tiếp tới u/${comment.author.username}...`}
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            style={{
                              width: '100%',
                              backgroundColor: '#393E46',
                              border: '1px solid #948979',
                              color: '#DFD0B8',
                              padding: '0.45rem',
                              fontSize: '0.85rem',
                              outline: 'none',
                              resize: 'vertical',
                            }}
                          />
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                            <button
                              type="button"
                              onClick={() => setReplyingToCommentId(null)}
                              style={{
                                padding: '0.3rem 0.75rem',
                                backgroundColor: '#393E46',
                                border: '1px solid #948979',
                                color: '#DFD0B8',
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                              }}
                            >
                              HỦY
                            </button>
                            <button
                              type="button"
                              disabled={isSubmittingReply || !replyText.trim()}
                              onClick={() => handleCreateReplyComment(comment.id)}
                              style={{
                                padding: '0.3rem 1rem',
                                backgroundColor: '#DFD0B8',
                                border: '1px solid #DFD0B8',
                                color: '#222831',
                                fontWeight: 800,
                                fontSize: '0.75rem',
                                cursor: isSubmittingReply || !replyText.trim() ? 'not-allowed' : 'pointer',
                              }}
                            >
                              {isSubmittingReply ? 'ĐANG GỬI...' : 'GỬI PHẢN HỒI'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
