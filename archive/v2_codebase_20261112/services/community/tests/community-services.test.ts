import { beforeEach, describe, expect, it } from 'vitest';
import {
  CommentService,
  DuplicateSlugError,
  InMemoryCommunityRepository,
  InsufficientSpacePermissionError,
  SpaceService,
  ThreadService,
  ZeroHopStorageService,
} from '../src/index.js';

describe('Kiểm thử Bộ Dịch vụ Cộng đồng (@acad/community-service)', () => {
  let repo: InMemoryCommunityRepository;
  let spaceService: SpaceService;
  let threadService: ThreadService;
  let commentService: CommentService;
  let storageService: ZeroHopStorageService;

  const USER_1 = '11111111-1111-1111-1111-111111111111';
  const USER_2 = '22222222-2222-2222-2222-222222222222';

  beforeEach(() => {
    repo = new InMemoryCommunityRepository();
    spaceService = new SpaceService(repo);
    threadService = new ThreadService(repo);
    commentService = new CommentService(repo);
    storageService = new ZeroHopStorageService();
  });

  describe('1. Không Gian Thảo Luận (SpaceService)', () => {
    it('Phải tạo Space thành công, tự động gán role CREATOR và memberCount = 1', async () => {
      const space = await spaceService.createSpace(
        {
          name: 'Hạ Tầng DevOps',
          slug: 'devops-vietnam',
          description: 'Cộng đồng thảo luận kiến trúc hạ tầng',
          rules: [{ title: 'Tôn trọng', description: 'Không spam' }],
          isPrivate: false,
        },
        USER_1,
      );

      expect(space).toHaveProperty('id');
      expect(space.slug).toBe('devops-vietnam');
      expect(space.membersCount).toBe(1);
      expect(space.myRole).toBe('CREATOR');
      expect(space.isJoined).toBe(true);
    });

    it('Phải từ chối tạo Space trùng lặp Slug', async () => {
      await spaceService.createSpace(
        { name: 'DevOps 1', slug: 'devops-vn', isPrivate: false },
        USER_1,
      );

      await expect(
        spaceService.createSpace({ name: 'DevOps 2', slug: 'devops-vn', isPrivate: false }, USER_2),
      ).rejects.toThrow(DuplicateSlugError);
    });

    it('Phải cho phép tham gia và rời khỏi không gian thảo luận', async () => {
      const space = await spaceService.createSpace(
        { name: 'Kubernetes', slug: 'k8s', isPrivate: false },
        USER_1,
      );

      // User 2 tham gia
      await spaceService.joinSpace(space.id, USER_2);
      const membership = await spaceService.getMembership(space.id, USER_2);
      expect(membership?.role).toBe('MEMBER');

      const updated = await spaceService.getSpaceById(space.id);
      expect(updated?.membersCount).toBe(2);

      // User 2 rời đi
      await spaceService.leaveSpace(space.id, USER_2);
      const updatedAfterLeave = await spaceService.getSpaceById(space.id);
      expect(updatedAfterLeave?.membersCount).toBe(1);
    });

    it('Chỉ Quản trị viên (CREATOR/MODERATOR) mới có quyền tạo Flairs', async () => {
      const space = await spaceService.createSpace(
        { name: 'Security', slug: 'security', isPrivate: false },
        USER_1,
      );

      // User 1 là Creator -> Tạo được flair
      const flair = await spaceService.createFlair(
        space.id,
        { name: 'Incident', slug: 'incident', colorHex: '#FF0000', backgroundHex: '#000000' },
        USER_1,
      );
      expect(flair.name).toBe('Incident');

      // User 2 là Member thường -> Bị từ chối
      await spaceService.joinSpace(space.id, USER_2);
      await expect(
        spaceService.createFlair(
          space.id,
          { name: 'Question', slug: 'question', colorHex: '#00FF00', backgroundHex: '#000000' },
          USER_2,
        ),
      ).rejects.toThrow(InsufficientSpacePermissionError);
    });
  });

  describe('2. Quản Trị Bài Viết (ThreadService)', () => {
    it('Phải tạo bài viết với slug tự sinh thân thiện SEO', async () => {
      const space = await spaceService.createSpace(
        { name: 'Linux', slug: 'linux', isPrivate: false },
        USER_1,
      );

      const thread = await threadService.createThread(
        {
          spaceId: space.id,
          title: 'Tối ưu hóa I/O hiệu năng cao trên Linux Kernel',
          contentText: 'Nội dung phân tích eBPF và io_uring...',
        },
        USER_1,
      );

      expect(thread).toHaveProperty('id');
      expect(thread.slug).toMatch(/^toi-uu-hoa-i-o-hieu-nang-cao-tren-linux-kernel-[a-f0-9]{8}$/);
      expect(thread.netScore).toBe(0);
      expect(thread.commentsCount).toBe(0);
    });

    it('Phải tìm kiếm bài viết trong Space thông qua query từ khóa', async () => {
      const space = await spaceService.createSpace(
        { name: 'Golang', slug: 'golang', isPrivate: false },
        USER_1,
      );

      await threadService.createThread(
        { spaceId: space.id, title: 'Concurrency patterns with Goroutines' },
        USER_1,
      );
      await threadService.createThread(
        { spaceId: space.id, title: 'Memory allocation in Go runtime' },
        USER_1,
      );

      const results = await threadService.searchThreads(space.id, 'concurrency');
      expect(results.length).toBe(1);
      expect(results[0]?.title).toContain('Concurrency');
    });
  });

  describe('3. Cây Bình Luận ltree & Capped Depth (CommentService)', () => {
    let threadId: string;

    beforeEach(async () => {
      const space = await spaceService.createSpace(
        { name: 'Database', slug: 'db', isPrivate: false },
        USER_1,
      );
      const thread = await threadService.createThread(
        { spaceId: space.id, title: 'PostgreSQL vs MySQL' },
        USER_1,
      );
      threadId = thread.id;
    });

    it('Phải tạo bình luận gốc (Root comment) tại depth = 1 và path 4 ký tự Base36', async () => {
      const root1 = await commentService.createComment({
        threadId,
        authorId: USER_1,
        content: 'Bình luận gốc thứ nhất',
      });

      expect(root1.depth).toBe(1);
      expect(root1.path).toBe('0000');
      expect(root1.parentId).toBeNull();

      const root2 = await commentService.createComment({
        threadId,
        authorId: USER_2,
        content: 'Bình luận gốc thứ hai',
      });

      expect(root2.depth).toBe(1);
      expect(root2.path).toBe('0001');
    });

    it('Phải tạo bình luận con lồng nhau và tự động kích hoạt Capped Depth 8 khi đạt cấp tối đa', async () => {
      // 1. Tạo Root (Level 1)
      const c1 = await commentService.createComment({
        threadId,
        authorId: USER_1,
        content: 'Level 1',
      });
      expect(c1.depth).toBe(1);
      expect(c1.path).toBe('0000');

      // 2. Tạo lồng nhau từ Level 2 đến Level 8
      let currentParent = c1;
      for (let level = 2; level <= 8; level++) {
        const child = await commentService.createComment({
          threadId,
          authorId: USER_1,
          parentId: currentParent.id,
          content: `Level ${level}`,
          parentAuthorUsername: `author_${level - 1}`,
        });
        expect(child.depth).toBe(level);
        expect(child.isCappedAtMaxDepth).toBe(false);
        currentParent = child;
      }

      expect(currentParent.depth).toBe(8);

      // 3. Tạo reply tại Level 8 (đáng lẽ là Level 9) -> Phải kích hoạt Capped Depth 8
      const cappedChild = await commentService.createComment({
        threadId,
        authorId: USER_2,
        parentId: currentParent.id,
        content: 'Phản hồi khi đã ở cấp 8',
        parentAuthorUsername: 'linus',
      });

      // Kiểm tra độ sâu và đường dẫn bị chốt cứng ở bậc 8
      expect(cappedChild.depth).toBe(8);
      expect(cappedChild.path).toBe(currentParent.path);
      expect(cappedChild.isCappedAtMaxDepth).toBe(true);
      expect(cappedChild.parentAuthorMentionNeeded).toBe(true);
      expect(cappedChild.contentAst.text).toBe('@linus Phản hồi khi đã ở cấp 8');
    });

    it('Phải trả về toàn bộ cây bình luận được sắp xếp theo path ltree tăng dần', async () => {
      const r = await commentService.createComment({
        threadId,
        authorId: USER_1,
        content: 'Root',
      });
      await commentService.createComment({
        threadId,
        authorId: USER_2,
        parentId: r.id,
        content: 'Child 1',
      });

      const tree = await commentService.getThreadComments(threadId);
      expect(tree.totalCount).toBe(2);
      expect(tree.items[0]?.path).toBe('0000');
      expect(tree.items[1]?.path).toBe('0000.0000');
    });

    it('Xóa mềm (Soft Delete) phải bảo toàn nút và thay đổi nội dung', async () => {
      const c = await commentService.createComment({
        threadId,
        authorId: USER_1,
        content: 'Nội dung gốc',
      });

      await commentService.softDeleteComment(c.id, USER_1);
      const tree = await commentService.getThreadComments(threadId);
      expect(tree.items[0]?.isDeleted).toBe(true);
      expect(tree.items[0]?.contentAst.text).toContain('đã bị xóa');
    });
  });

  describe('4. Zero-Hop Media Storage (ZeroHopStorageService)', () => {
    it('Phải sinh Presigned PUT URL an toàn dạng S3-compatible', async () => {
      const res = await storageService.generatePresignedUploadUrl({
        fileName: 'architecture_diagram.png',
        fileType: 'image/png',
        userId: USER_1,
      });

      expect(res.uploadUrl).toContain('s3.amazonaws.com');
      expect(res.uploadUrl).toContain('X-Amz-Expires=300');
      expect(res.publicUrl).toContain('cdn.acad.vn');
      expect(res.key).toMatch(
        /^uploads\/11111111-1111-1111-1111-111111111111\/\d+-[a-f0-9]+-architecture_diagram.png$/,
      );
    });
  });
});
