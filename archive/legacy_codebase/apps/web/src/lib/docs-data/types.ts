export type DocCategory =
  | 'discovery'
  | 'security'
  | 'architecture'
  | 'devops'
  | 'plans'
  | 'checklist';

export interface DocSectionHeading {
  id: string;
  title: string;
  level: 2 | 3;
}

export interface DocItem {
  id: string;
  slug: string;
  category: DocCategory;
  categoryTitle: string;
  title: string;
  description: string;
  stageBadge?: string;
  updatedAt: string;
  readingTimeMinutes: number;
  keyTakeaways: string[];
  headings: DocSectionHeading[];
  content: string; // Markdown or rich structured text
  relatedLinks?: Array<{ title: string; href: string }>;
}

export type ChecklistTaskStatus = 'COMPLETED' | 'IN_PROGRESS' | 'PLANNED';

export interface ChecklistTask {
  id: string;
  title: string;
  description: string;
  status: ChecklistTaskStatus;
  stageNumber: number;
  deliverables: string[];
  verificationCriteria: string;
  tag: string;
}

export interface StageProgress {
  stageNumber: number;
  stageName: string;
  title: string;
  status: ChecklistTaskStatus;
  completedPercent: number;
  totalTasks: number;
  completedTasks: number;
  description: string;
}

export interface CheatSheetEntry {
  category: string;
  title: string;
  description: string;
  commandOrSnippet: string;
  explanation: string;
  tip?: string;
}
