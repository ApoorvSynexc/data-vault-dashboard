// Shared object-dependency resolution for restore object selection — used by
// both ByObjectScope and ByFieldScope so the two flows apply identical logic
// (per-object autoSelectParents already comes from the backend's
// getObjectListWithDependencies: Master-Detail relationships plus the
// centralized RESTORE_OBJECT_RELATIONSHIP_CASCADE_RULES cascade table).

export interface AutoSelectReason {
  parent: string;
  child: string;
}

export interface AutoSelectResolution {
  autoSelected: string[];
  reasons: AutoSelectReason[];
}

// Walks the dependency graph breadth-first from the manually selected
// objects, collecting every parent required (directly or transitively) that
// isn't already manually selected. `visited` seeded with the manual selection
// itself guards against re-adding one of those, and against cycles.
export function resolveAutoSelectedParents(
  manuallySelected: ReadonlySet<string>,
  parentsByObject: Record<string, string[] | undefined>,
): AutoSelectResolution {
  const autoSelected = new Set<string>();
  const reasons: AutoSelectReason[] = [];
  const visited = new Set<string>(manuallySelected);
  const queue = [...manuallySelected];

  while (queue.length) {
    const current = queue.shift()!;
    for (const parent of parentsByObject[current] ?? []) {
      if (visited.has(parent)) continue;
      visited.add(parent);
      autoSelected.add(parent);
      reasons.push({ parent, child: current });
      queue.push(parent);
    }
  }

  return { autoSelected: [...autoSelected], reasons };
}

export function formatAutoSelectMessage(newlyAdded: string[], reasons: AutoSelectReason[]): string {
  if (newlyAdded.length === 1) {
    const reason = reasons.find((r) => r.parent === newlyAdded[0]);
    return `Parent object ${newlyAdded[0]} was automatically selected because ${reason?.child ?? 'your selection'} depends on it.`;
  }
  return `Parent objects ${newlyAdded.join(', ')} were automatically selected because your selection depends on them.`;
}
