import ELK, { ElkNode, ElkExtendedEdge } from "elkjs/lib/elk.bundled.js";
import { Person } from "../../domain/models/person";
import { Relationship } from "../../domain/models/relationship";
import { Node, Edge } from "@xyflow/react";

const elk = new ELK();

const NODE_WIDTH = 220;
const NODE_HEIGHT = 100;
const LAYER_HEIGHT = 220; // 100 node height + 120 gap
const MIN_NODE_SPACING = 50;

export interface GraphLayoutOptions {
  direction?: "DOWN" | "UP" | "RIGHT";
  rootPersonId?: string;
  highlightedPersonId?: string;
  kinshipSpeakerId?: string;
  kinshipLabelsMap?: Map<string, string>;
  kinshipPathNodeIds?: Set<string>;
  ancestorNodeIds?: Set<string>;
  descendantNodeIds?: Set<string>;
  activeReferencePersonId?: string;
  selectedComparePersonId?: string;
}

/**
 * Calculates generation rank for each person starting from rootPersonId (or detected earliest ancestor).
 * Enforces that spouses share the exact same generation, children are gen+1, parents are gen-1.
 */
export function calculateGenerations(
  persons: Person[],
  relationships: Relationship[],
  rootPersonId?: string
): Map<string, number> {
  const gen = new Map<string, number>();
  const parentMap = new Map<string, string[]>();
  const childMap = new Map<string, string[]>();
  const spouseMap = new Map<string, string[]>();

  for (const p of persons) {
    parentMap.set(p.id, []);
    childMap.set(p.id, []);
    spouseMap.set(p.id, []);
  }

  for (const r of relationships) {
    if (r.type === "PARENT_CHILD") {
      childMap.get(r.fromPersonId)?.push(r.toPersonId);
      parentMap.get(r.toPersonId)?.push(r.fromPersonId);
    } else if (r.type === "PARTNERSHIP") {
      spouseMap.get(r.fromPersonId)?.push(r.toPersonId);
      spouseMap.get(r.toPersonId)?.push(r.fromPersonId);
    }
  }

  // 1. Initial Root
  if (rootPersonId && persons.some(p => p.id === rootPersonId)) {
    gen.set(rootPersonId, 0);
  } else {
    // Find ancestors who have no parents in the graph
    for (const p of persons) {
      if ((parentMap.get(p.id) || []).length === 0) {
        // Skip if this person is just an incoming spouse whose partner has parents
        const hasSpouseWithParents = (spouseMap.get(p.id) || []).some(
          sId => (parentMap.get(sId) || []).length > 0
        );
        if (!hasSpouseWithParents) {
          gen.set(p.id, 0);
        }
      }
    }
  }

  if (gen.size === 0 && persons.length > 0) {
    gen.set(persons[0].id, 0);
  }

  // 2. Iteratively relax generations until consistent
  let changed = true;
  let iterations = 0;
  while (changed && iterations < 50) {
    changed = false;
    iterations++;

    for (const p of persons) {
      const g = gen.get(p.id);
      if (g !== undefined) {
        // Spouses MUST match the exact same generation
        for (const sId of spouseMap.get(p.id) || []) {
          if (gen.get(sId) !== g) {
            gen.set(sId, g);
            changed = true;
          }
        }
        // Children are generation g + 1
        for (const cId of childMap.get(p.id) || []) {
          const curC = gen.get(cId);
          if (curC === undefined || curC < g + 1) {
            gen.set(cId, g + 1);
            changed = true;
          }
        }
        // Parents are generation g - 1
        for (const parId of parentMap.get(p.id) || []) {
          const curP = gen.get(parId);
          if (curP === undefined || curP > g - 1) {
            gen.set(parId, g - 1);
            changed = true;
          }
        }
      }
    }
  }

  // Handle any remaining disconnected nodes
  for (const p of persons) {
    if (!gen.has(p.id)) {
      gen.set(p.id, 0);
    }
  }

  // Normalize so minimum generation starts at 0
  const values = Array.from(gen.values());
  const minG = values.length > 0 ? Math.min(...values) : 0;
  for (const [id, g] of gen.entries()) {
    gen.set(id, g - minG);
  }

  return gen;
}

export class ElkGenealogyLayout {
  public static async layout(
    persons: Person[],
    relationships: Relationship[],
    options: GraphLayoutOptions = {}
  ): Promise<{ nodes: Node[]; edges: Edge[] }> {
    if (persons.length === 0) {
      return { nodes: [], edges: [] };
    }

    // Filter relationships so both endpoints exist in `persons`
    const personIdSet = new Set(persons.map(p => p.id));
    const validRels = relationships.filter(
      r => personIdSet.has(r.fromPersonId) && personIdSet.has(r.toPersonId)
    );

    // 1. Calculate explicit genealogical generations
    const generations = calculateGenerations(persons, validRels, options.rootPersonId);

    // 2. Prepare ELK graph with PARENT_CHILD edges only (to avoid dragging spouses to wrong vertical layers)
    const elkNodes: ElkNode[] = persons.map(p => ({
      id: p.id,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      layoutOptions: {
        "elk.padding": "[top=10,left=10,bottom=10,right=10]",
      },
    }));

    const elkEdges: ElkExtendedEdge[] = [];
    for (const r of validRels) {
      if (r.type === "PARENT_CHILD") {
        elkEdges.push({
          id: r.id,
          sources: [r.fromPersonId],
          targets: [r.toPersonId],
          layoutOptions: {
            "elk.edge.type": "DIRECTED",
          },
        });
      }
    }

    const elkGraph: ElkNode = {
      id: "root",
      layoutOptions: {
        "elk.algorithm": "layered",
        "elk.direction": options.direction || "DOWN",
        "elk.spacing.nodeNode": "60",
        "elk.layered.spacing.nodeNodeBetweenLayers": "110",
        "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
        "elk.edgeRouting": "SPLINES",
        "elk.layered.cycleBreaking.strategy": "DEPTH_FIRST",
      },
      children: elkNodes,
      edges: elkEdges,
    };

    let laidOutGraph: ElkNode;
    try {
      laidOutGraph = await elk.layout(elkGraph);
    } catch (e) {
      console.warn("ELK layout failed, fallback to grid layout", e);
      return this.fallbackGridLayout(persons, validRels, options);
    }

    // 3. Coordinate mapping: Snap Y to Generation, and place Spouses adjacent horizontally
    const posMap = new Map<string, { x: number; y: number }>();
    for (const child of laidOutGraph.children || []) {
      const g = generations.get(child.id) ?? 0;
      posMap.set(child.id, {
        x: child.x || 0,
        y: g * LAYER_HEIGHT,
      });
    }

    // Ensure spouses are placed side-by-side on the same layer
    const spousePairs = validRels.filter(r => r.type === "PARTNERSHIP");
    for (const sp of spousePairs) {
      const posA = posMap.get(sp.fromPersonId);
      const posB = posMap.get(sp.toPersonId);
      if (posA && posB) {
        // Enforce identical Y coordinate
        const sharedY = Math.min(posA.y, posB.y);
        posA.y = sharedY;
        posB.y = sharedY;

        // If distance is too far or unaligned, bring them adjacent
        const distance = Math.abs(posA.x - posB.x);
        if (distance < NODE_WIDTH || distance > NODE_WIDTH + 180) {
          if (posA.x <= posB.x) {
            posB.x = posA.x + NODE_WIDTH + MIN_NODE_SPACING;
          } else {
            posA.x = posB.x + NODE_WIDTH + MIN_NODE_SPACING;
          }
        }
      }
    }

    // Prevent horizontal overlap within each generation layer
    const layers = new Map<number, Array<{ id: string; x: number; y: number }>>();
    for (const [id, pos] of posMap.entries()) {
      const g = generations.get(id) ?? 0;
      if (!layers.has(g)) layers.set(g, []);
      layers.get(g)!.push({ id, ...pos });
    }

    for (const [, layerNodes] of layers.entries()) {
      layerNodes.sort((a, b) => a.x - b.x);
      for (let i = 1; i < layerNodes.length; i++) {
        const prev = layerNodes[i - 1];
        const curr = layerNodes[i];
        const minX = prev.x + NODE_WIDTH + MIN_NODE_SPACING;
        if (curr.x < minX) {
          curr.x = minX;
        }
      }
      for (const n of layerNodes) {
        posMap.set(n.id, { x: n.x, y: n.y });
      }
    }

    // 4. Construct React Flow Nodes
    const flowNodes: Node[] = persons.map(person => {
      const pos = posMap.get(person.id) || { x: 0, y: 0 };
      const isSelected = options.highlightedPersonId === person.id;
      const isRef = options.activeReferencePersonId === person.id;
      const isRoot = options.rootPersonId === person.id;
      const isKinshipSpeaker = options.kinshipSpeakerId === person.id;
      const kinshipLabel = options.kinshipLabelsMap?.get(person.id);
      const isCompare = options.selectedComparePersonId === person.id;
      const isInKinshipPath = !!options.kinshipPathNodeIds?.has(person.id);
      const isAncestor = !!options.ancestorNodeIds?.has(person.id);
      const isDescendant = !!options.descendantNodeIds?.has(person.id);

      return {
        id: person.id,
        type: "personNode",
        position: { x: pos.x, y: pos.y },
        data: {
          person,
          isSelected,
          isRef,
          isRoot,
          isKinshipSpeaker,
          kinshipLabel,
          isCompare,
          isInKinshipPath,
          isAncestor,
          isDescendant,
        },
      };
    });

    // 5. Construct React Flow Edges
    const flowEdges: Edge[] = validRels.map(r => {
      const isParentChild = r.type === "PARENT_CHILD";
      const isPartnership = r.type === "PARTNERSHIP";
      const isProvisional = r.type === "PROVISIONAL_SIBLING";

      const isInKinshipPath =
        options.kinshipPathNodeIds?.has(r.fromPersonId) &&
        options.kinshipPathNodeIds?.has(r.toPersonId);

      const posA = posMap.get(r.fromPersonId);
      const posB = posMap.get(r.toPersonId);

      if (isPartnership) {
        // Lateral horizontal connection between spouses
        const isLeft = (posA?.x ?? 0) < (posB?.x ?? 0);
        const sourceHandle = isLeft ? "right-source" : "left-source";
        const targetHandle = isLeft ? "left-target" : "right-target";
        const isCurrent = r.partnershipData?.isCurrent !== false;

        return {
          id: r.id,
          source: r.fromPersonId,
          target: r.toPersonId,
          sourceHandle,
          targetHandle,
          type: "smoothstep",
          animated: isInKinshipPath,
          style: {
            stroke: isInKinshipPath ? "#2563eb" : "#f43f5e",
            strokeWidth: isInKinshipPath ? 3.5 : 2,
            strokeDasharray: isCurrent ? undefined : "4 4",
          },
          label: isCurrent ? "Vợ chồng" : "Đã ly hôn",
          labelStyle: { fill: "#f43f5e", fontSize: 10, fontWeight: 600 },
          labelBgStyle: { fill: "#fff1f2", fillOpacity: 0.95, rx: 4, ry: 4 },
          labelBgPadding: [4, 2] as [number, number],
          data: {
            relationship: r,
            isInKinshipPath,
          },
        };
      }

      if (isParentChild) {
        return {
          id: r.id,
          source: r.fromPersonId,
          target: r.toPersonId,
          sourceHandle: "bottom",
          targetHandle: "top",
          type: "smoothstep",
          animated: isInKinshipPath,
          style: {
            stroke: isInKinshipPath ? "#2563eb" : "#94a3b8",
            strokeWidth: isInKinshipPath ? 3.5 : 1.5,
          },
          data: {
            relationship: r,
            isInKinshipPath,
          },
        };
      }

      // Provisional sibling
      return {
        id: r.id,
        source: r.fromPersonId,
        target: r.toPersonId,
        type: "smoothstep",
        animated: isInKinshipPath,
        style: {
          stroke: isInKinshipPath ? "#2563eb" : "#f59e0b",
          strokeWidth: 1.5,
          strokeDasharray: "3 3",
        },
        label: "Anh em (Lâm thời)",
        labelStyle: { fill: "#d97706", fontSize: 10, fontWeight: 500 },
        labelBgStyle: { fill: "#fef3c7", fillOpacity: 0.9, rx: 4, ry: 4 },
        labelBgPadding: [4, 2] as [number, number],
        data: {
          relationship: r,
          isInKinshipPath,
        },
      };
    });

    return { nodes: flowNodes, edges: flowEdges };
  }

  private static fallbackGridLayout(
    persons: Person[],
    relationships: Relationship[],
    options: GraphLayoutOptions
  ): { nodes: Node[]; edges: Edge[] } {
    const cols = Math.ceil(Math.sqrt(persons.length));
    const flowNodes: Node[] = persons.map((p, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      return {
        id: p.id,
        type: "personNode",
        position: { x: col * (NODE_WIDTH + 60), y: row * (NODE_HEIGHT + 80) },
        data: {
          person: p,
          isSelected: options.highlightedPersonId === p.id,
          isRef: options.activeReferencePersonId === p.id,
          isRoot: options.rootPersonId === p.id,
          isCompare: options.selectedComparePersonId === p.id,
        },
      };
    });

    const flowEdges: Edge[] = relationships.map(r => ({
      id: r.id,
      source: r.fromPersonId,
      target: r.toPersonId,
      style: { stroke: "#94a3b8", strokeWidth: 1.5 },
    }));

    return { nodes: flowNodes, edges: flowEdges };
  }
}
