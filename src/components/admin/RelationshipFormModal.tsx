"use client";

import React, { useState, useEffect } from "react";
import { Person } from "../../domain/models/person";
import { Relationship, RelationshipInput, ParentChildNature } from "../../domain/models/relationship";
import { X, Save, AlertCircle } from "lucide-react";

interface RelationshipFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  persons: Person[];
  initialFromPersonId?: string | null;
  onSave: (input: RelationshipInput) => Promise<void>;
}

export const RelationshipFormModal: React.FC<RelationshipFormModalProps> = ({
  isOpen,
  onClose,
  persons,
  initialFromPersonId,
  onSave,
}) => {
  const [type, setType] = useState<Relationship["type"]>("PARENT_CHILD");
  const [fromPersonId, setFromPersonId] = useState<string>("");
  const [toPersonId, setToPersonId] = useState<string>("");
  const [nature, setNature] = useState<ParentChildNature>("biological");
  const [provisionalReason, setProvisionalReason] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialFromPersonId) {
      setFromPersonId(initialFromPersonId);
    } else if (persons.length > 0) {
      setFromPersonId(persons[0].id);
    }
    if (persons.length > 1) {
      const candidate = persons.find(p => p.id !== (initialFromPersonId || persons[0].id));
      if (candidate) setToPersonId(candidate.id);
    }
    setError(null);
  }, [initialFromPersonId, persons, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromPersonId || !toPersonId) {
      setError("Vui lòng chọn cả hai người tham gia mối quan hệ");
      return;
    }
    if (fromPersonId === toPersonId) {
      setError("Một người không thể thiết lập quan hệ gia đình với chính bản thân mình");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const input: RelationshipInput = {
        id: `rel-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type,
        fromPersonId,
        toPersonId,
        parentChildData: type === "PARENT_CHILD" ? { nature, confidence: "certain" } : undefined,
        partnershipData: type === "PARTNERSHIP" ? { isCurrent: true, marriageType: "traditional" } : undefined,
        provisionalSiblingData: type === "PROVISIONAL_SIBLING"
          ? { reason: provisionalReason.trim() || "Chưa có thông tin cha mẹ chung", confidence: "probable" }
          : undefined,
        notes: notes.trim() || undefined,
        createdBy: "admin",
      };

      await onSave(input);
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Đã có lỗi khi tạo quan hệ";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-amber-500/10 dark:bg-amber-950/30">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Thêm mối quan hệ gia tộc
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Thiết lập liên kết phụ hệ, hôn phối hoặc anh chị em lâm thời
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-800 dark:text-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Relationship Type Selection */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              Loại quan hệ:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setType("PARENT_CHILD")}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  type === "PARENT_CHILD"
                    ? "bg-amber-100 border-amber-500 text-amber-900 dark:bg-amber-950 dark:text-amber-200 font-bold shadow-sm"
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                }`}
              >
                Cha / Mẹ - Con
              </button>
              <button
                type="button"
                onClick={() => setType("PARTNERSHIP")}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  type === "PARTNERSHIP"
                    ? "bg-rose-100 border-rose-500 text-rose-900 dark:bg-rose-950 dark:text-rose-200 font-bold shadow-sm"
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                }`}
              >
                Hôn phối (Vợ / Chồng)
              </button>
              <button
                type="button"
                onClick={() => setType("PROVISIONAL_SIBLING")}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  type === "PROVISIONAL_SIBLING"
                    ? "bg-blue-100 border-blue-500 text-blue-900 dark:bg-blue-950 dark:text-blue-200 font-bold shadow-sm"
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                }`}
              >
                Anh chị em lâm thời
              </button>
            </div>
          </div>

          {/* People Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                {type === "PARENT_CHILD" ? "Người Cha / Mẹ:" : "Người thứ nhất:"}
              </label>
              <select
                value={fromPersonId}
                onChange={e => setFromPersonId(e.target.value)}
                className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
              >
                {persons.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.fullName} {p.familyOrdinalName ? `(Thứ ${p.familyOrdinalName})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                {type === "PARENT_CHILD" ? "Người Con:" : "Người thứ hai:"}
              </label>
              <select
                value={toPersonId}
                onChange={e => setToPersonId(e.target.value)}
                className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
              >
                {persons.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.fullName} {p.familyOrdinalName ? `(Thứ ${p.familyOrdinalName})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Specific Attributes */}
          {type === "PARENT_CHILD" && (
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Bản chất mối quan hệ phụ hệ:
              </label>
              <select
                value={nature}
                onChange={e => setNature(e.target.value as ParentChildNature)}
                className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="biological">Ruột thịt (Huyết thống sinh học)</option>
                <option value="adoptive">Con nuôi (Thủ tục nhận nuôi / dưỡng dưỡng)</option>
                <option value="step">Con riêng / Con kế</option>
                <option value="foster">Con đỡ đầu</option>
                <option value="unknown">Chưa xác định rõ</option>
              </select>
            </div>
          )}

          {type === "PROVISIONAL_SIBLING" && (
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Lý do xác nhận lâm thời: <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={provisionalReason}
                onChange={e => setProvisionalReason(e.target.value)}
                placeholder="Ví dụ: Lời truyền miệng là anh em ruột nhưng chưa rõ thông tin tên cha mẹ..."
                className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              Ghi chú thêm:
            </label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ghi chú về thời điểm, giấy tờ hoặc nhân chứng..."
              className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-medium"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold shadow-sm transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? "Đang kiểm tra & lưu..." : "Xác nhận tạo quan hệ"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
