"use client";

import React, { useState, useEffect } from "react";
import { Person } from "../../domain/models/person";
import { KinshipOverride, KinshipOverrideInput } from "../../domain/models/naming";
import { X, Save, Trash2, RotateCcw, AlertCircle } from "lucide-react";

interface KinshipOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  speakerId: string;
  targetId: string;
  persons: Person[];
  existingOverride?: KinshipOverride | null;
  originalAutoTerm?: string | null;
  onSaveOverride: (input: KinshipOverrideInput) => Promise<void>;
  onDeleteOverride: (overrideId: string) => Promise<void>;
}

export const KinshipOverrideModal: React.FC<KinshipOverrideModalProps> = ({
  isOpen,
  onClose,
  speakerId,
  targetId,
  persons,
  existingOverride,
  originalAutoTerm,
  onSaveOverride,
  onDeleteOverride,
}) => {
  const [addressTerm, setAddressTerm] = useState("");
  const [selfReferenceTerm, setSelfReferenceTerm] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (existingOverride) {
      setAddressTerm(existingOverride.addressTerm);
      setSelfReferenceTerm(existingOverride.selfReferenceTerm || "");
      setNotes(existingOverride.notes || "");
    } else {
      setAddressTerm("");
      setSelfReferenceTerm("");
      setNotes("");
    }
    setError(null);
  }, [existingOverride, isOpen]);

  if (!isOpen) return null;

  const speaker = persons.find(p => p.id === speakerId);
  const target = persons.find(p => p.id === targetId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressTerm.trim()) {
      setError("Vui lòng nhập từ xưng hô mong muốn");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSaveOverride({
        id: existingOverride?.id || `ov-${Date.now()}`,
        speakerId,
        targetId,
        addressTerm: addressTerm.trim(),
        selfReferenceTerm: selfReferenceTerm.trim() || undefined,
        notes: notes.trim() || undefined,
        createdBy: "admin",
      });
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Đã xảy ra lỗi khi lưu ghi đè";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!existingOverride) return;
    if (!confirm("Bạn có chắc chắn muốn hủy bỏ ghi đè này và khôi phục cách gọi tự động theo phả hệ?")) {
      return;
    }
    try {
      setIsSubmitting(true);
      await onDeleteOverride(existingOverride.id);
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Đã xảy ra lỗi khi xóa";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-amber-500/10 dark:bg-amber-950/30">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {existingOverride ? "Chỉnh sửa ghi đè xưng hô" : "Tạo ghi đè xưng hô thủ công"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Quy tắc riêng ưu tiên cấp độ cá nhân (Level 3 Custom Override)
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

          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1">
            <p className="text-slate-500">
              Người gọi: <strong className="text-slate-900 dark:text-slate-100">{speaker?.fullName || speakerId}</strong>
            </p>
            <p className="text-slate-500">
              Người được gọi: <strong className="text-slate-900 dark:text-slate-100">{target?.fullName || targetId}</strong>
            </p>
            {originalAutoTerm && (
              <p className="text-slate-500 pt-1 border-t border-slate-200 dark:border-slate-700">
                Gợi ý tự động của phả hệ: <span className="font-semibold text-amber-700 dark:text-amber-400">{originalAutoTerm}</span>
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              Từ xưng hô tùy chỉnh (Ví dụ: "Dì Hai Nhỏ", "Bác Tám", "Chú Út Đực"): <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={addressTerm}
              onChange={e => setAddressTerm(e.target.value)}
              placeholder="Nhập cách xưng hô thực tế trong nhà..."
              className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              Từ người nói tự xưng (Tùy chọn, ví dụ: "Con", "Cháu Hai", "Em"):
            </label>
            <input
              type="text"
              value={selfReferenceTerm}
              onChange={e => setSelfReferenceTerm(e.target.value)}
              placeholder="Từ tự xưng..."
              className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              Ghi chú lý do tùy chỉnh:
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ví dụ: Tập quán gọi theo tên con đầu lòng hoặc thói quen gia đình..."
              className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
            />
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
            {existingOverride ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950 dark:hover:bg-rose-900 dark:text-rose-300 rounded-lg font-medium border border-rose-200 dark:border-rose-800"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Khôi phục tự động</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-medium"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold shadow-sm transition-all"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSubmitting ? "Đang lưu..." : "Lưu ghi đè"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
