import ELK, { ElkNode, ElkExtendedEdge } from "elkjs/lib/elk.bundled.js";
import { Person } from "../../domain/models/person";
import { Relationship } from "../../domain/models/relationship";
import { Node, Edge } from "@xyflow/react";

const elk = new ELK();

const NODE_WIDTH = 220;
const NODE_HEIGHT = 100;

export interface GraphLayoutOptions {
  direction?: "DOWN" | "UP" | "RIGHT";
  highlightedPersonId?: string;
  kinshipPathNodeIds?: Set<string>;
  ancestorNodeIds?: Set<string>;
  descendantNodeIds?: Set<string>;
  activeReferencePersonId?: string;
  selectedComparePersonId?: string;
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

    const elkNodes: ElkNode[] = persons.map(p => ({
      id: p.id,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      layoutOptions: {
        "elk.padding": "[top=10,left=10,bottom=10,right=10]",
      },
    }));

    const elkEdges: ElkExtendedEdge[] = [];

    // Filter relationships so both endpoints exist in `persons`
    const personIdSet = new Set(persons.map(p => p.id));
    const validRels = relationships.filter(
      r => personIdSet.has(r.fromPersonId) && personIdSet.has(r.toPersonId)
    );

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
      } else if (r.type === "PARTNERSHIP") {
        // Partnerships shouldn't force vertical hierarchy
        elkEdges.push({
          id: r.id,
          sources: [r.fromPersonId],
          targets: [r.toPersonId],
          layoutOptions: {
            "elk.layered.priority.direction": "0",
          },
        });
      } else if (r.type === "PROVISIONAL_SIBLING") {
        elkEdges.push({
          id: r.id,
          sources: [r.fromPersonId],
          targets: [r.toPersonId],
        });
      }
    }

    const elkGraph: ElkNode = {
      id: "root",
      layoutOptions: {
        "elk.algorithm": "layered",
        "elk.direction": options.direction || "DOWN",
        "elk.spacing.nodeNode": "60",
        "elk.layered.spacing.nodeNodeBetweenLayers": "100",
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

    // Convert back to React Flow nodes and edges
    const flowNodes: Node[] = (laidOutGraph.children || []).map(node => {
      const person = persons.find(p => p.id === node.id)!;
      const isSelected = options.highlightedPersonId === person.id;
      const isRef = options.activeReferencePersonId === person.id;
      const isCompare = options.selectedComparePersonId === person.id;
      const isInKinshipPath = !!options.kinshipPathNodeIds?.has(person.id);
      const isAncestor = !!options.ancestorNodeIds?.has(person.id);
      const isDescendant = !!options.descendantNodeIds?.has(person.id);

      return {
        id: person.id,
        type: "personNode",
        position: { x: node.x || 0, y: node.y || 0 },
        data: {
          person,
          isSelected,
          isRef,
          isCompare,
          isInKinshipPath,
          isAncestor,
          isDescendant,
        },
      };
    });

    const flowEdges: Edge[] = validRels.map(r => {
      const isParentChild = r.type === "PARENT_CHILD";
      const isPartnership = r.type === "PARTNERSHIP";
      const isProvisional = r.type === "PROVISIONAL_SIBLING";

      const isInKinshipPath =
        options.kinshipPathNodeIds?.has(r.fromPersonId) &&
        options.kinshipPathNodeIds?.has(r.toPersonId);

      let stroke = "#94a3b8"; // default slate
      let strokeDasharray: string | undefined = undefined;
      let strokeWidth = 1.5;

      if (isPartnership) {
        stroke = "#e11d48"; // Rose for marriage
        strokeDasharray = "4 4";
        strokeWidth = 2;
      } else if (isProvisional) {
        stroke = "#f59e0b"; // Amber for provisional
        strokeDasharray = "2 2";
      }

      if (isInKinshipPath) {
        stroke = "#2563eb"; // Blue for highlighted kinship path
        strokeWidth = 3.5;
        strokeDasharray = undefined;
      }

      return {
        id: r.id,
        source: r.fromPersonId,
        target: r.toPersonId,
        type: isPartnership ? "smoothstep" : "default",
        animated: isInKinshipPath,
        style: {
          stroke,
          strokeWidth,
          strokeDasharray,
        },
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
