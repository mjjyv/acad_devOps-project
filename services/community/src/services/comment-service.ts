import type { CommentTreeResponse, FlatCommentItem } from '@acad/contracts';
import { LtreePathManager } from '../comments/ltree-path.js';
import type { CommentEntity, ICommunityRepository } from '../repository/community-repository.js';
import { InsufficientSpacePermissionError } from './space-service.js';
import { assertSpaceMembershipIfPrivate } from './thread-mapper.js';

export class CommentNotFoundError extends Error {
  constructor(message = 'Không tìm thấy bình luận yêu cầu') {
    super(message);
    this.name = 'CommentNotFoundError';
  }
}

export class ThreadLockedError extends Error {
  constructor(message = 'Bài viết đã bị khóa bình luận bởi Quản trị viên') {
    super(message);
    this.name = 'ThreadLockedError';
  }
}

export class CommentService {
  constructor(private readonly repo: ICommunityRepository) {}

  private toFlatComment(
    entity: CommentEntity,
    options?: {
      isCapped?: boolean | undefined;
      mentionNeeded?: boolean | undefined;
      parentAuthorUsername?: string | null | undefined;
      userVote?: number | undefined;
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
        options?.mentionNeeded ?? (entity.depth >= 8 && Boolean(entity.replyToUserId)),
      parentAuthorUsername: options?.parentAuthorUsername ?? entity.replyToUsername ?? null,
      contentAst: { text: entity.content },
      author: {
        id: entity.authorId,
        username: entity.authorUsername || '',
        avatarUrl: entity.authorAvatarUrl || null,
        karmaScore: entity.authorKarmaScore || 0,
      },
      netScore: entity.upvotesCount - entity.downvotesCount,
      upvotes: entity.upvotesCount,
      downvotes: entity.downvotesCount,
      userVote: options?.userVote ?? 0,
      directRepliesCount: entity.directRepliesCount ?? 0,
      totalDescendantsCount: entity.totalDescendantsCount ?? 0,
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
    const thread = await this.repo.findThreadById(data.threadId);
    if (!thread) {
      throw new CommentNotFoundError('Không tìm thấy bài viết chứa bình luận');
    }
    if (thread.isLocked) {
      throw new ThreadLockedError();
    }

    await assertSpaceMembershipIfPrivate(
      this.repo,
      thread.spaceId,
      thread.spaceIsPrivate,
      data.authorId,
    );

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

    const parent = await this.repo.findCommentById(data.parentId);
    if (!parent || parent.threadId !== data.threadId) {
      throw new CommentNotFoundError('Không tìm thấy bình luận cha cần trả lời');
    }

    const parentUsername = data.parentAuthorUsername ?? parent.authorUsername;
    const childIndex = await this.repo.countChildrenByParent(data.threadId, data.parentId);
    const calc = LtreePathManager.calculateChildPath(
      parent.path,
      parent.depth,
      childIndex,
      parentUsername,
    );

    let finalContent = data.content;
    if (
      calc.isCappedAtMaxDepth &&
      calc.mentionPrefix &&
      !finalContent.startsWith(calc.mentionPrefix)
    ) {
      finalContent = `${calc.mentionPrefix}${finalContent}`;
    }

    const comment = await this.repo.createComment({
      threadId: data.threadId,
      authorId: data.authorId,
      parentId: data.parentId,
      path: calc.path,
      depth: calc.depth,
      content: finalContent,
      replyToUserId: calc.isCappedAtMaxDepth ? parent.authorId : null,
    });

    return this.toFlatComment(comment, {
      isCapped: calc.isCappedAtMaxDepth,
      mentionNeeded: calc.parentAuthorMentionNeeded,
      parentAuthorUsername: parentUsername ?? null,
    });
  }

  public async getCommentTree(threadId: string, viewerId?: string): Promise<CommentTreeResponse> {
    const thread = await this.repo.findThreadById(threadId);
    if (!thread) {
      throw new CommentNotFoundError('Không tìm thấy bài viết để tải cây bình luận');
    }

    await assertSpaceMembershipIfPrivate(
      this.repo,
      thread.spaceId,
      thread.spaceIsPrivate,
      viewerId,
    );

    const [entities, userVotes] = await Promise.all([
      this.repo.listCommentsByThread(threadId),
      viewerId ? this.repo.getUserCommentVotes(threadId, viewerId) : Promise.resolve({}),
    ]);

    const items = entities.map((e) =>
      this.toFlatComment(e, {
        userVote: (userVotes as Record<string, number>)[e.id] ?? 0,
      }),
    );

    return {
      items,
      totalCount: items.filter((c) => !c.isDeleted).length,
    };
  }

  public async softDeleteComment(commentId: string, authorId: string): Promise<void> {
    const comment = await this.repo.findCommentById(commentId);
    if (!comment) {
      throw new CommentNotFoundError('Không tìm thấy bình luận cần xóa');
    }
    if (comment.authorId !== authorId) {
      throw new InsufficientSpacePermissionError(
        'Bạn chỉ có thể xóa bình luận do chính bạn tạo ra',
      );
    }
    await this.repo.softDeleteComment(commentId, authorId);
  }
}
