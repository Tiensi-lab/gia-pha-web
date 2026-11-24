"use client";

import React, { useState } from "react";
import { DuplicateCandidate, MergeResult } from "../../lib/storage/repository";
import { formatLifespan, formatGenealogicalDate } from "../../lib/utils/dateFormatter";
import { X, GitMerge, AlertCircle, CheckCircle, ArrowRight, ShieldCheck } from "lucide-react";

interface DuplicateDetectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidates: DuplicateCandidate[];
  onMerge: (survivingId: string, mergedId: string) => Promise<MergeResult>;
  onRefresh: () => void;
}

export const DuplicateDetectorModal: React.FC<DuplicateDetectorModalProps> = ({
  isOpen,
  onClose,
  candidates,
  onMerge,
  onRefresh,
}) => {
  const [selectedCandidateIndex, setSelectedCandidateIndex] = useState<number>(0);
  const [survivingSide, setSurvivingSide] = useState<"A" | "B">("A");
  const [isMerging, setIsMerging] = useState(false);
  const [mergeSuccess, setMergeSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentCandidate = candidates[selectedCandidateIndex];

  const handleExecuteMerge = async () => {
    if (!currentCandidate) return;
    const surviving = survivingSide === "A" ? currentCandidate.personA : currentCandidate.personB;
    const merged = survivingSide === "A" ? currentCandidate.personB : currentCandidate.personA;

    if (!confirm(`Bạn có chắc chắn muốn sáp nhập hồ sơ "${merged.fullName}" vào "${surviving.fullName}"? Mọi quan hệ và ghi chú sẽ được chuyển sang hồ sơ chính.`)) {
      return;
    }

    try {
      setIsMerging(true);
      setError(null);
      const res = await onMerge(surviving.id, merged.id);
      setMergeSuccess(`Đã sáp nhập thành công! Đã chuyển ${res.transferredRelationships} mối quan hệ sang hồ sơ chính.`);
      setTimeout(() => {
        setMergeSuccess(null);
        onRefresh();
        if (selectedCandidateIndex >= candidates.length - 1) {
          setSelectedCandidateIndex(Math.max(0, candidates.length - 2));
        }
      }, 1500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Đã xảy ra lỗi khi sáp nhập";
      setError(message);
    } finally {
      setIsMerging(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-amber-500/10 dark:bg-amber-950/30">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow">
              <GitMerge className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Phát hiện trùng lặp & Sáp nhập hồ sơ
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tìm kiếm các thành viên có khả năng bị tạo trùng lặp trong gia phả
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-800 dark:text-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {mergeSuccess && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{mergeSuccess}</span>
            </div>
          )}

          {candidates.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <ShieldCheck className="w-12 h-12 text-emerald-500 mx-auto" />
              <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                Không phát hiện hồ sơ trùng lặp nào!
              </p>
              <p className="text-slate-500 max-w-sm mx-auto">
                Hệ thống đã quét toàn bộ tên, năm sinh, quê quán và quan hệ của các thành viên nhưng không thấy dấu hiệu trùng lặp đáng nghi.
              </p>
            </div>
          ) : (
            <>
              {/* Candidates Selector if multiple */}
              {candidates.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  <span className="text-slate-500 font-semibold shrink-0">Các cặp nghi trùng:</span>
                  {candidates.map((c, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSelectedCandidateIndex(idx);
                        setSurvivingSide("A");
                      }}
                      className={`px-3 py-1.5 rounded-lg font-medium shrink-0 border transition-all ${
                        selectedCandidateIndex === idx
                          ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      Cặp #{idx + 1} ({c.matchScore}%)
                    </button>
                  ))}
                </div>
              )}

              {/* Match Card */}
              {currentCandidate && (
                <div className="space-y-4">
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="font-bold text-amber-900 dark:text-amber-200">
                        Độ tương đồng ước tính: {currentCandidate.matchScore}%
                      </p>
                      <p className="text-amber-800 dark:text-amber-300 text-[11px] mt-0.5">
                        Lý do: {currentCandidate.reasons.join(" • ")}
                      </p>
                    </div>
                  </div>

                  {/* Side-by-side comparison */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Person A */}
                    <div
                      onClick={() => setSurvivingSide("A")}
                      className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                        survivingSide === "A"
                          ? "border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20 shadow-md ring-2 ring-emerald-400/30"
                          : "border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-800"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-slate-900 dark:text-slate-100">Hồ sơ A</span>
                        {survivingSide === "A" ? (
                          <span className="px-2 py-0.5 bg-emerald-500 text-white rounded font-bold text-[10px]">
                            Giữ lại (Hồ sơ chính)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded text-[10px]">
                            Sẽ sáp nhập & xóa
                          </span>
                        )}
                      </div>

                      <div className="space-y-2 text-slate-700 dark:text-slate-300">
                        <p><strong>Họ và tên:</strong> {currentCandidate.personA.fullName}</p>
                        {currentCandidate.personA.preferredName && (
                          <p><strong>Tên thân mật:</strong> {currentCandidate.personA.preferredName}</p>
                        )}
                        <p><strong>Giới tính:</strong> {currentCandidate.personA.gender === "male" ? "Nam" : "Nữ"}</p>
                        <p><strong>Ngày sinh:</strong> {formatGenealogicalDate(currentCandidate.personA.birthDate)}</p>
                        <p><strong>Tình trạng:</strong> {formatLifespan(currentCandidate.personA.birthDate, currentCandidate.personA.deathDate, currentCandidate.personA.livingStatus)}</p>
                        {currentCandidate.personA.hometown && (
                          <p><strong>Quê quán:</strong> {currentCandidate.personA.hometown}</p>
                        )}
                        {currentCandidate.personA.biography && (
                          <p className="text-[11px] text-slate-500 italic truncate">
                            {currentCandidate.personA.biography}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Person B */}
                    <div
                      onClick={() => setSurvivingSide("B")}
                      className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                        survivingSide === "B"
                          ? "border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20 shadow-md ring-2 ring-emerald-400/30"
                          : "border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-800"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-slate-900 dark:text-slate-100">Hồ sơ B</span>
                        {survivingSide === "B" ? (
                          <span className="px-2 py-0.5 bg-emerald-500 text-white rounded font-bold text-[10px]">
                            Giữ lại (Hồ sơ chính)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded text-[10px]">
                            Sẽ sáp nhập & xóa
                          </span>
                        )}
                      </div>

                      <div className="space-y-2 text-slate-700 dark:text-slate-300">
                        <p><strong>Họ và tên:</strong> {currentCandidate.personB.fullName}</p>
                        {currentCandidate.personB.preferredName && (
                          <p><strong>Tên thân mật:</strong> {currentCandidate.personB.preferredName}</p>
                        )}
                        <p><strong>Giới tính:</strong> {currentCandidate.personB.gender === "male" ? "Nam" : "Nữ"}</p>
                        <p><strong>Ngày sinh:</strong> {formatGenealogicalDate(currentCandidate.personB.birthDate)}</p>
                        <p><strong>Tình trạng:</strong> {formatLifespan(currentCandidate.personB.birthDate, currentCandidate.personB.deathDate, currentCandidate.personB.livingStatus)}</p>
                        {currentCandidate.personB.hometown && (
                          <p><strong>Quê quán:</strong> {currentCandidate.personB.hometown}</p>
                        )}
                        {currentCandidate.personB.biography && (
                          <p className="text-[11px] text-slate-500 italic truncate">
                            {currentCandidate.personB.biography}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <p className="text-center text-slate-500 text-[11px]">
                    Nhấp vào một trong hai cột ở trên để chọn hồ sơ bạn muốn giữ lại làm hồ sơ chính thức (Surviving ID).
                  </p>
                </div>
              )}
            </>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={onClose}
              disabled={isMerging}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-medium"
            >
              Đóng
            </button>
            {candidates.length > 0 && (
              <button
                onClick={handleExecuteMerge}
                disabled={isMerging || !currentCandidate}
                className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-sm transition-all"
              >
                <GitMerge className="w-4 h-4" />
                <span>{isMerging ? "Đang sáp nhập..." : "Xác nhận sáp nhập hồ sơ"}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
