export interface TaskReference {
  projectKey: string;
  localId: number;
}

const TASK_REFERENCE_PATTERN = /\b(?:Fixes|Closes|Resolves|fixes|closes|resolves)\s+([A-Z0-9]{2,10})-(\d+)/g;

export function parseTaskReferences(text: string): TaskReference[] {
  const references: TaskReference[] = [];
  const seen = new Set<string>();
  let match: RegExpExecArray | null;

  const pattern = new RegExp(TASK_REFERENCE_PATTERN.source, TASK_REFERENCE_PATTERN.flags);
  while ((match = pattern.exec(text)) !== null) {
    const key = `${match[1]}-${match[2]}`;
    if (!seen.has(key)) {
      seen.add(key);
      references.push({
        projectKey: match[1].toUpperCase(),
        localId: parseInt(match[2], 10),
      });
    }
  }

  return references;
}

export function parseCommitMessages(commits: Array<{ message: string }>): TaskReference[] {
  const allRefs: TaskReference[] = [];
  const seen = new Set<string>();

  for (const commit of commits) {
    const refs = parseTaskReferences(commit.message);
    for (const ref of refs) {
      const key = `${ref.projectKey}-${ref.localId}`;
      if (!seen.has(key)) {
        seen.add(key);
        allRefs.push(ref);
      }
    }
  }

  return allRefs;
}
