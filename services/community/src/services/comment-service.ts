/**
 * @file comment-service.ts
 * @description Service for managing Nested Comments, Materialized Path ltree, and Capped Depth 8 Flat Reply.
 */

import type { CommentTreeResponse, FlatCommentItem } from '@acad/contracts';
import { LtreePathManager } from '../comments/ltree-path.js';
import type { CommentEntity, ICommunityRepository } from '../repository/community-repository.js';

export class CommentNotFoundError extends Error {
  constructor(message: string = 'Không tìm thấy bình luận yêu cầu') {
    super(message);
    this.name = 'CommentNotFoundError';
  }
}

export class CommentService {
  constructor(private repo: ICommunityRepository) {}

  private toFlatComment(
    entity: CommentEntity,
    options?: {
      isCapped?: boolean | undefined;
      mentionNeeded?: boolean | undefined;
      parentAuthorUsername?: string | undefined;
    },
  ): FlatCommentItem {
    return {
      id: entity.id,
      threadId: entity.threadId,
      parentId: entity.parentId,
      path: entity.path,
      depth: entity.depth,
      isCappedAtMaxDepth: options?.isCapped ?? entity.depth >= 8,
      parentAuthorMentionNeeded:
        options?.mentionNeeded ?? (entity.depth >= 8 && !!entity.replyToUserId),
      parentAuthorUsername: options?.parentAuthorUsername ?? null,
      contentAst: { text: entity.content },
      author: {
        id: entity.authorId,
        username: '',
        avatarUrl: null,
        karmaScore: 0,
      },
      netScore: entity.upvotesCount - entity.downvotesCount,
      upvotes: entity.upvotesCount,
      downvotes: entity.downvotesCount,
      userVote: 0,
      directRepliesCount: 0,
      totalDescendantsCount: 0,
      isCollapsed: false,
      isDeleted: entity.isDeleted,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  public async createComment(data: {
    threadId: string;
    authorId: string;
    content: string;
    parentId?: string | null | undefined;
    parentAuthorUsername?: string | undefined;
  }): Promise<FlatCommentItem> {
    // 1. Bình luận gốc (Root comment: depth = 1)
    if (!data.parentId) {
      const rootIndex = await this.repo.countChildrenByParent(data.threadId, null);
      const { path, depth } = LtreePathManager.calculateRootPath(rootIndex);

      const comment = await this.repo.createComment({
        threadId: data.threadId,
        authorId: data.authorId,
        parentId: null,
        path,
        depth,
        content: data.content,
      });

      return this.toFlatComment(comment);
    }

    // 2. Bình luận con lồng nhau (Nested reply)
    const parent = await this.repo.findCommentById(data.parentId);
    if (!parent) {
      throw new CommentNotFoundError('Không tìm thấy bình luận cha cần trả lời');
    }

    const childIndex = await this.repo.countChildrenByParent(data.threadId, data.parentId);
    const calc = LtreePathManager.calculateChildPath(
      parent.path,
      parent.depth,
      childIndex,
      data.parentAuthorUsername,
    );

    let finalContent = data.content;
    if (calc.isCappedAtMaxDepth && calc.mentionPrefix) {
      // Tự động chèn @mention tác giả nếu chưa có
      if (!finalContent.startsWith(calc.mentionPrefix)) {
        finalContent = `${calc.mentionPrefix}${finalContent}`;
      }
    }

    const comment = await this.repo.createComment({
      threadId: data.threadId,
      authorId: data.authorId,
      parentId: data.parentId,
      path: calc.path,
      depth: calc.depth,
      content: finalContent,
      replyToUserId: parent.authorId,
    });

    return this.toFlatComment(comment, {
      isCapped: calc.isCappedAtMaxDepth,
      mentionNeeded: calc.parentAuthorMentionNeeded,
      parentAuthorUsername: data.parentAuthorUsername,
    });
  }

  public async getThreadComments(threadId: string): Promise<CommentTreeResponse> {
    const comments = await this.repo.listCommentsByThread(threadId);
    const items = comments.map((c) => this.toFlatComment(c));
    return {
      items,
      totalCount: items.length,
    };
  }

  public async softDeleteComment(commentId: string, authorId: string): Promise<void> {
    const comment = await this.repo.findCommentById(commentId);
    if (!comment) {
      throw new CommentNotFoundError();
    }
    await this.repo.softDeleteComment(commentId, authorId);
  }
}
