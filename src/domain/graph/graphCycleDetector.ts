import { FamilyGraph } from "./familyGraph";
import { Relationship } from "../models/relationship";

export interface CycleValidationResult {
  isValid: boolean;
  error?: string;
  cycleNodes?: string[];
}

export class GraphCycleDetector {
  /**
   * Validates if adding a proposed relationship would create an invalid cycle or duplicate.
   */
  public static canAddRelationship(
    graph: FamilyGraph,
    proposedRel: Omit<Relationship, "id" | "createdAt" | "updatedAt" | "createdBy">
  ): CycleValidationResult {
    const { type, fromPersonId, toPersonId } = proposedRel;

    if (fromPersonId === toPersonId) {
      return {
        isValid: false,
        error: "Một người không thể thiết lập quan hệ gia đình với chính bản thân mình.",
        cycleNodes: [fromPersonId],
      };
    }

    // Check duplicate relationship
    const allRels = graph.getAllRelationships();
    for (const r of allRels) {
      if (r.type === type) {
        if (type === "PARENT_CHILD" && r.fromPersonId === fromPersonId && r.toPersonId === toPersonId) {
          return {
            isValid: false,
            error: "Quan hệ cha/mẹ - con này đã tồn tại trong hệ thống.",
          };
        }
        if (
          (type === "PARTNERSHIP" || type === "PROVISIONAL_SIBLING") &&
          ((r.fromPersonId === fromPersonId && r.toPersonId === toPersonId) ||
            (r.fromPersonId === toPersonId && r.toPersonId === fromPersonId))
        ) {
          return {
            isValid: false,
            error: "Quan hệ này đã tồn tại giữa hai người.",
          };
        }
      }
    }

    // For PARENT_CHILD: fromPersonId is Parent, toPersonId is Child.
    // If toPersonId is already an ancestor of fromPersonId, then adding (from -> to) forms a cycle!
    if (type === "PARENT_CHILD") {
      const ancestorsOfParent = graph.getAncestors(fromPersonId);
      if (ancestorsOfParent.has(toPersonId)) {
        return {
          isValid: false,
          error: "Không thể thêm quan hệ: Người con hiện tại đang là tổ tiên/bậc trên của người cha/mẹ (tạo chu trình huyết thống bất hợp lý).",
          cycleNodes: [fromPersonId, toPersonId],
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Validates entire graph for any existing cycles in parent-child hierarchy.
   */
  public static validateNoAncestryCycles(graph: FamilyGraph): CycleValidationResult {
    const persons = graph.getAllPersons();
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (personId: string, currentPath: string[]): string[] | null => {
      visited.add(personId);
      recursionStack.add(personId);
      currentPath.push(personId);

      const parentIds = graph.getParentIds(personId);
      for (const parentId of parentIds) {
        if (!visited.has(parentId)) {
          const cycle = dfs(parentId, [...currentPath]);
          if (cycle) return cycle;
        } else if (recursionStack.has(parentId)) {
          return [...currentPath, parentId];
        }
      }

      recursionStack.delete(personId);
      return null;
    };

    for (const p of persons) {
      if (!visited.has(p.id)) {
        const cycle = dfs(p.id, []);
        if (cycle) {
          return {
            isValid: false,
            error: "Phát hiện chu trình huyết thống trong gia phả: " + cycle.join(" -> "),
            cycleNodes: cycle,
          };
        }
      }
    }

    return { isValid: true };
  }
}
