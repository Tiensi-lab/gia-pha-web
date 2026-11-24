"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  Node,
  Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Person } from "../../domain/models/person";
import { Relationship } from "../../domain/models/relationship";
import { Branch } from "../../domain/models/branch";
import { PersonNode } from "./PersonNode";
import { ElkGenealogyLayout } from "../../lib/layout/elkLayout";
import { GraphTraversal } from "../../domain/graph/graphTraversal";
import { FamilyGraph } from "../../domain/graph/familyGraph";
import { ViewMode } from "./GraphControls";
import { X } from "lucide-react";

const nodeTypes = {
  personNode: PersonNode,
};

interface FamilyGraphCanvasProps {
  allPersons: Person[];
  allRelationships: Relationship[];
  branches: Branch[];
  selectedBranchId: string;
  viewMode: ViewMode;
  selectedPersonId: string | null;
  onSelectPerson: (personId: string) => void;
  referencePersonId: string | null;
  rootPersonId?: string | null;
  kinshipSpeakerId?: string | null;
  kinshipLabelsMap?: Map<string, string>;
  onExitKinshipMode?: () => void;
  selectedComparePersonId?: string | null;
  kinshipPathNodeIds?: Set<string>;
  onInitReactFlow?: (instance: ReturnType<typeof useReactFlow>) => void;
}

const FlowCanvasInner: React.FC<FamilyGraphCanvasProps> = ({
  allPersons,
  allRelationships,
  branches,
  selectedBranchId,
  viewMode,
  selectedPersonId,
  onSelectPerson,
  referencePersonId,
  rootPersonId,
  kinshipSpeakerId,
  kinshipLabelsMap,
  onExitKinshipMode,
  selectedComparePersonId,
  kinshipPathNodeIds,
  onInitReactFlow,
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [isLayouting, setIsLayouting] = useState(false);
  const reactFlow = useReactFlow();

  useEffect(() => {
    if (onInitReactFlow) {
      onInitReactFlow(reactFlow);
    }
  }, [reactFlow, onInitReactFlow]);

  // Compute active subgraph based on branch & viewMode
  const { visiblePersons, visibleRelationships } = useMemo(() => {
    // 1. Filter by branch if specific branch selected
    let filteredPersons = allPersons;
    if (selectedBranchId !== "all") {
      filteredPersons = allPersons.filter(p => p.branchIds.includes(selectedBranchId));
    }

    const graph = new FamilyGraph(allPersons, allRelationships);

    // 2. Filter by view mode if a person is selected
    if (selectedPersonId && viewMode !== "full") {
      const subgraph = GraphTraversal.getFocusedSubgraph(
        graph,
        selectedPersonId,
        viewMode,
        selectedComparePersonId || undefined
      );
      return {
        visiblePersons: subgraph.persons,
        visibleRelationships: subgraph.relationships,
      };
    }

    const personIdSet = new Set(filteredPersons.map(p => p.id));
    const filteredRels = allRelationships.filter(
      r => personIdSet.has(r.fromPersonId) && personIdSet.has(r.toPersonId)
    );

    return { visiblePersons: filteredPersons, visibleRelationships: filteredRels };
  }, [allPersons, allRelationships, selectedBranchId, viewMode, selectedPersonId, selectedComparePersonId]);

  // Recalculate layout
  useEffect(() => {
    let isCancelled = false;

    async function applyLayout() {
      setIsLayouting(true);

      const graph = new FamilyGraph(allPersons, allRelationships);
      let ancestorNodeIds: Set<string> | undefined;
      let descendantNodeIds: Set<string> | undefined;

      if (selectedPersonId) {
        ancestorNodeIds = graph.getAncestors(selectedPersonId);
        descendantNodeIds = graph.getDescendants(selectedPersonId);
      }

      const { nodes: layoutNodes, edges: layoutEdges } = await ElkGenealogyLayout.layout(
        visiblePersons,
        visibleRelationships,
        {
          direction: "DOWN",
          rootPersonId: rootPersonId || undefined,
          highlightedPersonId: selectedPersonId || undefined,
          kinshipSpeakerId: kinshipSpeakerId || undefined,
          kinshipLabelsMap,
          activeReferencePersonId: referencePersonId || undefined,
          selectedComparePersonId: selectedComparePersonId || undefined,
          kinshipPathNodeIds,
          ancestorNodeIds,
          descendantNodeIds,
        }
      );

      if (!isCancelled) {
        setNodes(layoutNodes);
        setEdges(layoutEdges);
        setIsLayouting(false);
      }
    }

    applyLayout();

    return () => {
      isCancelled = true;
    };
  }, [
    visiblePersons,
    visibleRelationships,
    selectedPersonId,
    referencePersonId,
    rootPersonId,
    kinshipSpeakerId,
    kinshipLabelsMap,
    selectedComparePersonId,
    kinshipPathNodeIds,
    allPersons,
    allRelationships,
    setNodes,
    setEdges,
  ]);

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onSelectPerson(node.id);
    },
    [onSelectPerson]
  );

  const speakerPerson = kinshipSpeakerId ? allPersons.find(p => p.id === kinshipSpeakerId) : null;

  return (
    <div className="relative w-full h-full bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Floating Kinship Addressing Banner */}
      {speakerPerson && (
        <div className="absolute top-2 sm:top-4 left-1/2 -translate-x-1/2 z-30 w-[94%] max-w-md sm:w-auto flex items-center justify-between gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-indigo-950/95 text-white backdrop-blur-md rounded-full shadow-2xl border border-indigo-400/40 animate-in slide-in-from-top-3 duration-300">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <span className="text-[11px] sm:text-xs truncate">
              Cách <strong className="font-bold text-amber-300">{speakerPerson.fullName}</strong> xưng hô
            </span>
          </div>
          {onExitKinshipMode && (
            <button
              onClick={onExitKinshipMode}
              className="px-2.5 py-1 text-[10px] sm:text-[11px] font-semibold bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors flex items-center gap-1 shrink-0"
            >
              <X className="w-3 h-3" /> Thoát
            </button>
          )}
        </div>
      )}

      {isLayouting && (
        <div className="absolute top-4 right-4 z-20 px-3 py-1.5 bg-white/90 dark:bg-slate-800/90 backdrop-blur rounded-full shadow border border-slate-200 dark:border-slate-700 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
          <span>Đang xếp đặt phả đồ...</span>
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.1}
        maxZoom={2.5}
        className="touch-none"
      >
        <Background color="#cbd5e1" gap={20} size={1} />
        <Controls showInteractive={false} className="hidden md:block !bg-white dark:!bg-slate-900 !border-slate-200 dark:!border-slate-800" />
        <MiniMap
          nodeColor={n => {
            const data = n.data as { person?: Person };
            return data.person?.gender === "female" ? "#fda4af" : "#93c5fd";
          }}
          className="hidden md:block !bg-white/80 dark:!bg-slate-900/80 !border-slate-200 dark:!border-slate-800 !rounded-lg overflow-hidden shadow-md"
        />
      </ReactFlow>
    </div>
  );
};

export const FamilyGraphCanvas: React.FC<FamilyGraphCanvasProps> = props => {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner {...props} />
    </ReactFlowProvider>
  );
};
