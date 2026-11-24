"use client";

import React, { useState, useMemo } from "react";
import { Person } from "../../domain/models/person";
import { FamilyGraph } from "../../domain/graph/familyGraph";
import { NamingPreferences, KinshipOverride } from "../../domain/models/naming";
import { KinshipInference } from "../../domain/kinship/kinshipInference";
import {
  X,
  ArrowRightLeft,
  Sparkles,
  Info,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Edit3,
  GitCommit,
  ExternalLink,
} from "lucide-react";

interface KinshipCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  persons: Person[];
  graph: FamilyGraph;
  preferences: NamingPreferences;
  overrides: KinshipOverride[];
  initialPersonAId?: string | null;
  initialPersonBId?: string | null;
  onHighlightPath?: (pathNodeIds: Set<string>) => void;
  onOpenOverrideModal?: (speakerId: string, targetId: string) => void;
  isAdmin?: boolean;
}

export const KinshipCalculatorModal: React.FC<KinshipCalculatorModalProps> = ({
  isOpen,
  onClose,
  persons,
  graph,
  preferences,
  overrides,
  initialPersonAId,
  initialPersonBId,
  onHighlightPath,
  onOpenOverrideModal,
  isAdmin = false,
}) => {
  const [personAId, setPersonAId] = useState<string>(
    initialPersonAId || (persons.length > 0 ? persons[0].id : "")
  );
  const [personBId, setPersonBId] = useState<string>(
    initialPersonBId || (persons.length > 1 ? persons[1].id : "")
  );

  // Sync if props change
  React.useEffect(() => {
    if (initialPersonAId) setPersonAId(initialPersonAId);
  }, [initialPersonAId]);

  React.useEffect(() => {
    if (initialPersonBId) setPersonBId(initialPersonBId);
  }, [initialPersonBId]);

  const kinshipResult = useMemo(() => {
    if (!personAId || !personBId) return null;
    return KinshipInference.inferKinship(personAId, personBId, graph, preferences, overrides);
  }, [personAId, personBId, graph, preferences, overrides]);

  if (!isOpen) return null;

  const personA = persons.find(p => p.id === personAId);
  const personB = persons.find(p => p.id === personBId);

  const swapPersons = () => {
    const temp = personAId;
    setPersonAId(personBId);
    setPersonBId(temp);
  };

  const handleHighlightOnGraph = () => {
    if (!kinshipResult || !onHighlightPath) return;
    const nodeIds = new Set<string>();
    for (const path of kinshipResult.relationshipPaths) {
      for (const id of path.nodes) {
        nodeIds.add(id);
      }
    }
    onHighlightPath(nodeIds);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-amber-500/10 dark:bg-amber-950/30">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Tính toán cách xưng hô gia phả
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Suy luận xưng hô hai chiều theo chuẩn phong tục Nam Bộ
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          {/* Selectors: Speaker A <-> Target B */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
            {/* Person A */}
            <div className="md:col-span-2 space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Người xưng hô (Tôi):
              </label>
              <select
                value={personAId}
                onChange={e => setPersonAId(e.target.value)}
                className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-medium text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {persons.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.fullName} {p.familyOrdinalName ? `(Thứ ${p.familyOrdinalName})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Swap button */}
            <div className="md:col-span-1 flex justify-center">
              <button
                onClick={swapPersons}
                title="Đổi chiều xưng hô"
                className="p-2 bg-white dark:bg-slate-900 hover:bg-amber-50 dark:hover:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 shadow-sm transition-all"
              >
                <ArrowRightLeft className="w-4 h-4 text-amber-600" />
              </button>
            </div>

            {/* Person B */}
            <div className="md:col-span-2 space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Người được gọi (Đối phương):
              </label>
              <select
                value={personBId}
                onChange={e => setPersonBId(e.target.value)}
                className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-medium text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {persons.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.fullName} {p.familyOrdinalName ? `(Thứ ${p.familyOrdinalName})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {kinshipResult && personA && personB && (
            <div className="space-y-4">
              {/* Primary Term Card */}
              <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/20 border border-amber-200 dark:border-amber-900/60 rounded-xl space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                    Kết quả xưng hô hai chiều
                  </span>
                  <div className="flex items-center gap-1.5">
                    {kinshipResult.source === "manual" ? (
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 font-semibold rounded text-[10px] flex items-center gap-1">
                        <Edit3 className="w-3 h-3" /> Đã tùy chỉnh (Ghi đè)
                      </span>
                    ) : kinshipResult.status === "confirmed" ? (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold rounded text-[10px] flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Xác thực
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-semibold rounded text-[10px] flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Chưa đủ dữ kiện
                      </span>
                    )}
                  </div>
                </div>

                {/* Big Calls */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="bg-white/90 dark:bg-slate-900/90 p-3 rounded-lg border border-amber-100 dark:border-amber-900/40">
                    <p className="text-slate-500 text-[11px]">Tôi ({personA.fullName}) gọi đối phương là:</p>
                    <p className="text-lg font-black text-amber-700 dark:text-amber-400 mt-0.5">
                      {kinshipResult.aCallsB || "Chưa xác định"}
                    </p>
                    {kinshipResult.aSelfReference && (
                      <p className="text-[11px] text-slate-500 mt-1">
                        Xưng hô bản thân: <span className="font-semibold text-slate-800 dark:text-slate-200">"{kinshipResult.aSelfReference}"</span>
                      </p>
                    )}
                  </div>

                  <div className="bg-white/90 dark:bg-slate-900/90 p-3 rounded-lg border border-amber-100 dark:border-amber-900/40">
                    <p className="text-slate-500 text-[11px]">Đối phương ({personB.fullName}) gọi tôi là:</p>
                    <p className="text-lg font-black text-amber-700 dark:text-amber-400 mt-0.5">
                      {kinshipResult.bCallsA || "Chưa xác định"}
                    </p>
                    {kinshipResult.bSelfReference && (
                      <p className="text-[11px] text-slate-500 mt-1">
                        Xưng hô bản thân: <span className="font-semibold text-slate-800 dark:text-slate-200">"{kinshipResult.bSelfReference}"</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Explanation */}
                <div className="pt-2 border-t border-amber-200/60 dark:border-amber-900/40">
                  <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                    {kinshipResult.explanation}
                  </p>
                </div>
              </div>

              {/* Ambiguity warnings if any */}
              {kinshipResult.ambiguityDetails && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg space-y-1.5">
                  <p className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5" /> Thông tin còn thiếu để định xưng danh chính xác:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-amber-900 dark:text-amber-200">
                    {kinshipResult.ambiguityDetails.missingInfo?.map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                  {kinshipResult.ambiguityDetails.candidates && (
                    <div className="mt-2 space-y-1 pt-2 border-t border-amber-200 dark:border-amber-800">
                      <p className="font-semibold text-slate-700 dark:text-slate-300">Các phương án khả thi:</p>
                      {kinshipResult.ambiguityDetails.candidates.map((c, i) => (
                        <p key={i} className="text-slate-700 dark:text-slate-300">
                          • Gọi <strong>"{c.term}"</strong>: {c.condition}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Alternative terms */}
              {kinshipResult.alternativeTerms && kinshipResult.alternativeTerms.length > 0 && (
                <div className="space-y-1">
                  <p className="font-semibold text-slate-600 dark:text-slate-400">Cách gọi tương đương / dân gian:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {kinshipResult.alternativeTerms.map((term, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700"
                      >
                        {term}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons: Highlight on graph & Override */}
              <div className="flex items-center justify-between pt-2">
                {onHighlightPath && kinshipResult.relationshipPaths.length > 0 && (
                  <button
                    onClick={handleHighlightOnGraph}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950 dark:hover:bg-blue-900 dark:text-blue-300 rounded-lg font-medium border border-blue-200 dark:border-blue-800 transition-colors"
                  >
                    <GitCommit className="w-3.5 h-3.5" />
                    <span>Làm nổi bật đường nối trên sơ đồ</span>
                  </button>
                )}

                {isAdmin && onOpenOverrideModal && (
                  <button
                    onClick={() => {
                      onOpenOverrideModal(personAId, personBId);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950 dark:hover:bg-amber-900 dark:text-amber-200 rounded-lg font-medium border border-amber-200 dark:border-amber-800 transition-colors ml-auto"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Chỉnh sửa cách xưng hô (Ghi đè)</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
