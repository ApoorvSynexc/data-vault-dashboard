// Shared object-dependency resolution for restore object selection — used by
// both ByObjectScope and ByFieldScope so the two flows apply identical logic.
// Per-object autoSelectChildren already comes from the backend's
// getObjectListWithDependencies: child objects whose relationship back to
// the parent is cascadeDelete or restrictedDelete. Selecting a parent
// auto-selects those children (not the other way around) — an ordinary
// lookup child is never auto-selected.

export interface AutoSelectReason {
  child: string;
  parent: string;
}

export interface AutoSelectResolution {
  autoSelected: string[];
  reasons: AutoSelectReason[];
}

// Walks the dependency graph breadth-first from the manually selected
// objects, collecting every child required (directly or transitively) that
// isn't already manually selected. `visited` seeded with the manual selection
// itself guards against re-adding one of those, and against cycles.
export function resolveAutoSelectedChildren(
  manuallySelected: ReadonlySet<string>,
  childrenByObject: Record<string, string[] | undefined>,
): AutoSelectResolution {
  const autoSelected = new Set<string>();
  const reasons: AutoSelectReason[] = [];
  const visited = new Set<string>(manuallySelected);
  const queue = [...manuallySelected];

  while (queue.length) {
    const current = queue.shift()!;
    for (const child of childrenByObject[current] ?? []) {
      if (visited.has(child)) continue;
      visited.add(child);
      autoSelected.add(child);
      reasons.push({ child, parent: current });
      queue.push(child);
    }
  }

  return { autoSelected: [...autoSelected], reasons };
}

export function formatAutoSelectMessage(newlyAdded: string[], reasons: AutoSelectReason[]): string {
  if (newlyAdded.length === 1) {
    const reason = reasons.find((r) => r.child === newlyAdded[0]);
    return `Child object ${newlyAdded[0]} was automatically selected because it cascade-deletes with ${reason?.parent ?? 'your selection'}.`;
  }
  return `Child objects ${newlyAdded.join(', ')} were automatically selected because they cascade-delete with your selection.`;
}
