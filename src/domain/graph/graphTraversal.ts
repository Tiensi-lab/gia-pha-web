import { FamilyGraph } from "./familyGraph";
import { RelationshipPath, PathStep } from "../models/kinship";
import { Person } from "../models/person";
import { Relationship } from "../models/relationship";

export class GraphTraversal {
  /**
   * Finds the shortest genealogical path between person A and person B.
   */
  public static findShortestPath(
    graph: FamilyGraph,
    startId: string,
    endId: string
  ): RelationshipPath | null {
    if (startId === endId) {
      return {
        nodes: [startId],
        steps: [],
        pathLength: 0,
      };
    }

    const queue: { currentId: string; path: string[]; steps: PathStep[] }[] = [
      { currentId: startId, path: [startId], steps: [] },
    ];
    const visited = new Set<string>([startId]);

    while (queue.length > 0) {
      const { currentId, path, steps } = queue.shift()!;

      if (currentId === endId) {
        return {
          nodes: path,
          steps,
          pathLength: steps.length,
        };
      }

      // Explore neighbors: Parents (up), Children (down), Spouses (lateral), Provisional Siblings
      const parents = graph.getParentIds(currentId);
      for (const pId of parents) {
        if (!visited.has(pId)) {
          visited.add(pId);
          queue.push({
            currentId: pId,
            path: [...path, pId],
            steps: [...steps, { fromPersonId: currentId, toPersonId: pId, edgeType: "PARENT" }],
          });
        }
      }

      const children = graph.getChildIds(currentId);
      for (const cId of children) {
        if (!visited.has(cId)) {
          visited.add(cId);
          queue.push({
            currentId: cId,
            path: [...path, cId],
            steps: [...steps, { fromPersonId: currentId, toPersonId: cId, edgeType: "CHILD" }],
          });
        }
      }

      const spouses = graph.getSpouseIds(currentId);
      for (const sId of spouses) {
        if (!visited.has(sId)) {
          visited.add(sId);
          queue.push({
            currentId: sId,
            path: [...path, sId],
            steps: [...steps, { fromPersonId: currentId, toPersonId: sId, edgeType: "SPOUSE" }],
          });
        }
      }

      const provSiblings = graph.getProvisionalSiblingIds(currentId);
      for (const psId of provSiblings) {
        if (!visited.has(psId)) {
          visited.add(psId);
          queue.push({
            currentId: psId,
            path: [...path, psId],
            steps: [...steps, { fromPersonId: currentId, toPersonId: psId, edgeType: "PROVISIONAL_SIBLING" }],
          });
        }
      }
    }

    return null;
  }

  /**
   * Finds multiple distinct paths between A and B (up to maxPaths, depth limit to avoid explosion).
   */
  public static findAllPaths(
    graph: FamilyGraph,
    startId: string,
    endId: string,
    maxPaths: number = 5,
    maxDepth: number = 10
  ): RelationshipPath[] {
    const results: RelationshipPath[] = [];

    const dfs = (currentId: string, visited: Set<string>, path: string[], steps: PathStep[]) => {
      if (results.length >= maxPaths || steps.length > maxDepth) return;

      if (currentId === endId) {
        results.push({
          nodes: [...path],
          steps: [...steps],
          pathLength: steps.length,
        });
        return;
      }

      const neighbors: { id: string; edgeType: PathStep["edgeType"] }[] = [
        ...graph.getParentIds(currentId).map(id => ({ id, edgeType: "PARENT" as const })),
        ...graph.getChildIds(currentId).map(id => ({ id, edgeType: "CHILD" as const })),
        ...graph.getSpouseIds(currentId).map(id => ({ id, edgeType: "SPOUSE" as const })),
        ...graph.getProvisionalSiblingIds(currentId).map(id => ({ id, edgeType: "PROVISIONAL_SIBLING" as const })),
      ];

      for (const n of neighbors) {
        if (!visited.has(n.id)) {
          visited.add(n.id);
          dfs(
            n.id,
            visited,
            [...path, n.id],
            [...steps, { fromPersonId: currentId, toPersonId: n.id, edgeType: n.edgeType }]
          );
          visited.delete(n.id);
        }
      }
    };

    dfs(startId, new Set([startId]), [startId], []);
    return results;
  }

  /**
   * Discovers all disconnected components in the family graph.
   */
  public static findConnectedComponents(graph: FamilyGraph): string[][] {
    const persons = graph.getAllPersons();
    const visited = new Set<string>();
    const components: string[][] = [];

    for (const p of persons) {
      if (!visited.has(p.id)) {
        const comp: string[] = [];
        const queue = [p.id];
        visited.add(p.id);

        while (queue.length > 0) {
          const currentId = queue.shift()!;
          comp.push(currentId);

          const neighbors = [
            ...graph.getParentIds(currentId),
            ...graph.getChildIds(currentId),
            ...graph.getSpouseIds(currentId),
            ...graph.getProvisionalSiblingIds(currentId),
          ];

          for (const n of neighbors) {
            if (!visited.has(n)) {
              visited.add(n);
              queue.push(n);
            }
          }
        }

        components.push(comp);
      }
    }

    return components;
  }

  /**
   * Extracts a focused subgraph around a person (ancestors, descendants, immediate relatives).
   */
  public static getFocusedSubgraph(
    graph: FamilyGraph,
    centerPersonId: string,
    viewMode: "full" | "ancestors" | "descendants" | "immediate" | "path",
    targetPersonId?: string
  ): { persons: Person[]; relationships: Relationship[] } {
    let personIdsToInclude = new Set<string>();

    if (viewMode === "full") {
      return {
        persons: graph.getAllPersons(),
        relationships: graph.getAllRelationships(),
      };
    }

    if (viewMode === "ancestors") {
      personIdsToInclude = graph.getAncestors(centerPersonId);
      personIdsToInclude.add(centerPersonId);
      // also include spouses of ancestors for visual context
      const spousesToAdd = new Set<string>();
      for (const id of personIdsToInclude) {
        for (const sId of graph.getSpouseIds(id)) {
          spousesToAdd.add(sId);
        }
      }
      for (const sId of spousesToAdd) personIdsToInclude.add(sId);
    } else if (viewMode === "descendants") {
      personIdsToInclude = graph.getDescendants(centerPersonId);
      personIdsToInclude.add(centerPersonId);
      // also include spouses of descendants
      const spousesToAdd = new Set<string>();
      for (const id of personIdsToInclude) {
        for (const sId of graph.getSpouseIds(id)) {
          spousesToAdd.add(sId);
        }
      }
      for (const sId of spousesToAdd) personIdsToInclude.add(sId);
    } else if (viewMode === "immediate") {
      personIdsToInclude.add(centerPersonId);
      // parents
      for (const pId of graph.getParentIds(centerPersonId)) personIdsToInclude.add(pId);
      // children
      for (const cId of graph.getChildIds(centerPersonId)) personIdsToInclude.add(cId);
      // spouses
      for (const sId of graph.getSpouseIds(centerPersonId)) personIdsToInclude.add(sId);
      // siblings
      for (const sib of graph.getSiblings(centerPersonId)) personIdsToInclude.add(sib.person.id);
    } else if (viewMode === "path" && targetPersonId) {
      const path = this.findShortestPath(graph, centerPersonId, targetPersonId);
      if (path) {
        for (const id of path.nodes) personIdsToInclude.add(id);
      } else {
        personIdsToInclude.add(centerPersonId);
        personIdsToInclude.add(targetPersonId);
      }
    } else {
      personIdsToInclude.add(centerPersonId);
    }

    const persons = Array.from(personIdsToInclude)
      .map(id => graph.getPerson(id))
      .filter((p): p is Person => !!p);

    const relationships = graph.getAllRelationships().filter(r =>
      personIdsToInclude.has(r.fromPersonId) && personIdsToInclude.has(r.toPersonId)
    );

    return { persons, relationships };
  }
}
