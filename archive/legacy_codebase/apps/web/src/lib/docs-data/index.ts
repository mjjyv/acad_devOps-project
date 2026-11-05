import { DOCS_REGISTRY } from './docs-registry.js';
import { CHECKLIST_TASKS, STAGES_PROGRESS } from './checklist-data.js';
import { CHEAT_SHEETS } from './cheat-sheets.js';
import { DocItem } from './types.js';

export * from './types.js';
export * from './docs-registry.js';
export * from './checklist-data.js';
export * from './cheat-sheets.js';

export function getAllDocs(): DocItem[] {
  return DOCS_REGISTRY;
}

export function getDocBySlug(slug: string): DocItem | undefined {
  return DOCS_REGISTRY.find((d) => d.slug === slug || d.id === slug);
}

export function getDocsByCategory(category: string): DocItem[] {
  return DOCS_REGISTRY.filter((d) => d.category === category);
}

export function searchDocs(query: string): Array<{ doc: DocItem; matchScore: number }> {
  if (!query || query.trim() === '') return [];
  const q = query.toLowerCase().trim();

  const results: Array<{ doc: DocItem; matchScore: number }> = [];

  for (const doc of DOCS_REGISTRY) {
    let score = 0;
    if (doc.title.toLowerCase().includes(q)) score += 10;
    if (doc.description.toLowerCase().includes(q)) score += 5;
    if (doc.keyTakeaways.some((t) => t.toLowerCase().includes(q))) score += 4;
    if (doc.content.toLowerCase().includes(q)) score += 2;

    if (score > 0) {
      results.push({ doc, matchScore: score });
    }
  }

  return results.sort((a, b) => b.matchScore - a.matchScore);
}
