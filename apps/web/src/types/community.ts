import type {
  CreateCommentInput,
  CreateSpaceInput,
  CreateThreadInput,
  FlatCommentItem,
  Space,
  SpaceFlair,
  ThreadDetail,
  ThreadSummary,
} from '@acad/contracts';

export type {
  CreateCommentInput,
  CreateSpaceInput,
  CreateThreadInput,
  FlatCommentItem,
  Space,
  SpaceFlair,
  ThreadDetail,
  ThreadSummary,
};

export interface VoteResult {
  targetId: string;
  targetType: 'thread' | 'comment';
  userVote: 1 | -1 | 0;
  netScore: number;
}

export interface SpaceDetailResponse {
  space: Space;
  flairs: SpaceFlair[];
  threads?: ThreadSummary[];
}
