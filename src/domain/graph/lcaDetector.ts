import { FamilyGraph } from "./familyGraph";

export interface AncestorDistance {
  ancestorId: string;
  distanceA: number;
  distanceB: number;
  totalDistance: number;
  // Is this ancestor reached via A's father or mother?
  pathFromA: "paternal" | "maternal" | "direct";
  // Is this ancestor reached via B's father or mother?
  pathFromB: "paternal" | "maternal" | "direct";
}

export class LcaDetector {
  /**
   * Returns a map of ancestorId -> { distance, lineage } for a given person.
   */
  public static getAncestorsWithDistance(
    graph: FamilyGraph,
    personId: string
  ): Map<string, { distance: number; lineage: "paternal" | "maternal" | "direct" }> {
    const result = new Map<string, { distance: number; lineage: "paternal" | "maternal" | "direct" }>();
    result.set(personId, { distance: 0, lineage: "direct" });

    const queue: { id: string; distance: number; lineage: "paternal" | "maternal" | "direct" }[] = [
      { id: personId, distance: 0, lineage: "direct" },
    ];

    while (queue.length > 0) {
      const current = queue.shift()!;
      const parentIds = graph.getParentIds(current.id);

      for (const parentId of parentIds) {
        const parent = graph.getPerson(parentId);
        let parentLineage: "paternal" | "maternal" = "paternal";
        if (current.distance === 0) {
          parentLineage = parent?.gender === "female" ? "maternal" : "paternal";
        } else {
          parentLineage = current.lineage === "maternal" ? "maternal" : "paternal";
        }

        const nextDistance = current.distance + 1;
        const existing = result.get(parentId);

        if (!existing || existing.distance > nextDistance) {
          result.set(parentId, { distance: nextDistance, lineage: parentLineage });
          queue.push({ id: parentId, distance: nextDistance, lineage: parentLineage });
        }
      }
    }

    return result;
  }

  /**
   * Finds all common ancestors between person A and person B.
   */
  public static findCommonAncestors(
    graph: FamilyGraph,
    personAId: string,
    personBId: string
  ): AncestorDistance[] {
    const ancestorsA = this.getAncestorsWithDistance(graph, personAId);
    const ancestorsB = this.getAncestorsWithDistance(graph, personBId);

    const common: AncestorDistance[] = [];

    for (const [ancestorId, infoA] of ancestorsA) {
      if (ancestorsB.has(ancestorId)) {
        const infoB = ancestorsB.get(ancestorId)!;
        // Exclude trivial case if looking for common ancestors of distinct individuals
        common.push({
          ancestorId,
          distanceA: infoA.distance,
          distanceB: infoB.distance,
          totalDistance: infoA.distance + infoB.distance,
          pathFromA: infoA.lineage,
          pathFromB: infoB.lineage,
        });
      }
    }

    // Sort by total distance ascending, then by max(distanceA, distanceB)
    common.sort((x, y) => {
      if (x.totalDistance !== y.totalDistance) return x.totalDistance - y.totalDistance;
      return Math.max(x.distanceA, x.distanceB) - Math.max(y.distanceA, y.distanceB);
    });

    return common;
  }

  /**
   * Finds the nearest common ancestors (minimal distance).
   */
  public static findNearestCommonAncestors(
    graph: FamilyGraph,
    personAId: string,
    personBId: string
  ): AncestorDistance[] {
    const common = this.findCommonAncestors(graph, personAId, personBId);
    if (common.length === 0) return [];

    const minTotal = common[0].totalDistance;
    return common.filter(c => c.totalDistance === minTotal);
  }
}
