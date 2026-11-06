// The deployment's kinds, as its plat5.yml declares them: each kind's parent, and
// what its nodes are called here. A deployment with other kinds changes this map.

export const KINDS: Record<string, { parent: string | null; plural: string }> = {
  organization: { parent: null, plural: "Organizations" },
  project: { parent: "organization", plural: "Projects" },
}

/** The kinds with no parent: the roots of trees. */
export const rootKinds = Object.keys(KINDS).filter((k) => KINDS[k]!.parent === null)

/** The kinds whose parent is this kind. */
export function childKinds(kind: string): string[] {
  return Object.keys(KINDS).filter((k) => KINDS[k]!.parent === kind)
}

/** What nodes of a kind are called: "Projects". */
export function plural(kind: string): string {
  return KINDS[kind]!.plural
}
