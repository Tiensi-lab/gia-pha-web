"use client";

import React, { useState } from "react";
import { FamilyRepository, BackupPayload } from "../../lib/storage/repository";
import { GedcomExporter } from "../../lib/gedcom/gedcomExporter";
import { GedcomParser } from "../../lib/gedcom/gedcomParser";
import {
  X,
  Download,
  Upload,
  RotateCcw,
  FileJson,
  FileText,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
} from "lucide-react";

interface DataImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  repository: FamilyRepository;
  onDataChanged: () => void;
}

export const DataImportExportModal: React.FC<DataImportExportModalProps> = ({
  isOpen,
  onClose,
  repository,
  onDataChanged,
}) => {
  const [activeTab, setActiveTab] = useState<"export" | "import" | "reset">("export");
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  // JSON Export
  const handleExportJson = async () => {
    try {
      setIsLoading(true);
      const backup = await repository.exportBackup();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gia-pha-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setStatusMessage({ type: "success", text: "Đã xuất dữ liệu sao lưu JSON thành công!" });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Xuất file thất bại";
      setStatusMessage({ type: "error", text: msg });
    } finally {
      setIsLoading(false);
    }
  };

  // GEDCOM Export
  const handleExportGedcom = async () => {
    try {
      setIsLoading(true);
      const [persons, rels] = await Promise.all([
        repository.getAllPersons(),
        repository.getAllRelationships(),
      ]);
      const gedcomText = GedcomExporter.export(persons, rels);
      const blob = new Blob([gedcomText], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gia-pha-${new Date().toISOString().slice(0, 10)}.ged`;
      a.click();
      URL.revokeObjectURL(url);
      setStatusMessage({ type: "success", text: "Đã xuất file tiêu chuẩn GEDCOM 5.5.1 thành công!" });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Xuất file GEDCOM thất bại";
      setStatusMessage({ type: "error", text: msg });
    } finally {
      setIsLoading(false);
    }
  };

  // JSON Import
  const handleImportJsonFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsLoading(true);
      const text = await file.text();
      const backup: BackupPayload = JSON.parse(text);
      if (!backup.persons || !backup.relationships) {
        throw new Error("File sao lưu JSON không đúng cấu trúc phả hệ");
      }
      const res = await repository.importBackup(backup, "replace");
      setStatusMessage({
        type: "success",
        text: `Khôi phục thành công ${res.importedCount} thành viên từ bản sao lưu JSON!`,
      });
      onDataChanged();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Nhập file thất bại";
      setStatusMessage({ type: "error", text: msg });
    } finally {
      setIsLoading(false);
      e.target.value = "";
    }
  };

  // GEDCOM Import
  const handleImportGedcomFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsLoading(true);
      const text = await file.text();
      const parseResult = GedcomParser.parse(text);

      const backup: BackupPayload = {
        version: "1.0",
        timestamp: new Date().toISOString(),
        spaceId: "default-space",
        persons: parseResult.persons,
        relationships: parseResult.relationships,
        branches: [{ id: "branch-root", name: "Nhánh GEDCOM Nhập", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }],
        namingPreferences: await repository.getNamingPreferences(),
        kinshipOverrides: [],
        auditLogs: [],
      };

      await repository.importBackup(backup, "replace");
      setStatusMessage({
        type: "success",
        text: `Đã nạp ${parseResult.persons.length} cá nhân và ${parseResult.relationships.length} mối quan hệ từ file GEDCOM!`,
      });
      onDataChanged();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Đọc file GEDCOM thất bại";
      setStatusMessage({ type: "error", text: msg });
    } finally {
      setIsLoading(false);
      e.target.value = "";
    }
  };

  // Reset to seed
  const handleResetSampleData = async () => {
    if (!confirm("Hành động này sẽ thay thế dữ liệu hiện tại bằng bộ dữ liệu mẫu 4 đời Nam Bộ ban đầu. Bạn có chắc chắn?")) {
      return;
    }
    try {
      setIsLoading(true);
      await repository.resetToSampleData();
      setStatusMessage({ type: "success", text: "Đã khôi phục dữ liệu mẫu gốc ban đầu thành công!" });
      onDataChanged();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Khôi phục dữ liệu mẫu thất bại";
      setStatusMessage({ type: "error", text: msg });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-amber-500/10 dark:bg-amber-950/30">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Sao lưu, Xuất nhập & Khôi phục dữ liệu
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Hỗ trợ định dạng JSON gốc và tiêu chuẩn quốc tế GEDCOM 5.5.1
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-xs font-semibold">
          <button
            onClick={() => { setActiveTab("export"); setStatusMessage(null); }}
            className={`flex-1 py-2.5 text-center border-b-2 transition-all ${
              activeTab === "export"
                ? "border-amber-600 text-amber-700 dark:text-amber-400 bg-white dark:bg-slate-800"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Xuất dữ liệu (Export)
          </button>
          <button
            onClick={() => { setActiveTab("import"); setStatusMessage(null); }}
            className={`flex-1 py-2.5 text-center border-b-2 transition-all ${
              activeTab === "import"
                ? "border-amber-600 text-amber-700 dark:text-amber-400 bg-white dark:bg-slate-800"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Nhập dữ liệu (Import)
          </button>
          <button
            onClick={() => { setActiveTab("reset"); setStatusMessage(null); }}
            className={`flex-1 py-2.5 text-center border-b-2 transition-all ${
              activeTab === "reset"
                ? "border-amber-600 text-amber-700 dark:text-amber-400 bg-white dark:bg-slate-800"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Dữ liệu mẫu (Reset)
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          {statusMessage && (
            <div
              className={`p-3 rounded-lg border flex items-center gap-2 ${
                statusMessage.type === "success"
                  ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
                  : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200"
              }`}
            >
              {statusMessage.type === "success" ? (
                <CheckCircle className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {activeTab === "export" && (
            <div className="space-y-3">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
                  <FileJson className="w-4 h-4 text-amber-600" />
                  <span>Xuất toàn bộ gia phả (JSON đầy đủ)</span>
                </div>
                <p className="text-slate-500 text-[11px]">
                  Bao gồm toàn bộ cây phả hệ, danh sách thành viên, các mối quan hệ, quy tắc xưng hô, ghi đè cá nhân và nhật ký sửa đổi.
                </p>
                <button
                  onClick={handleExportJson}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold shadow-sm transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Tải file sao lưu JSON</span>
                </button>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>Xuất chuẩn quốc tế GEDCOM 5.5.1 (.ged)</span>
                </div>
                <p className="text-slate-500 text-[11px]">
                  Tương thích với các phần mềm phả hệ quốc tế như FamilySearch, MyHeritage, Gramps, Ancestry.
                </p>
                <button
                  onClick={handleExportGedcom}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-sm transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Tải file GEDCOM (.ged)</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === "import" && (
            <div className="space-y-3">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
                  <FileJson className="w-4 h-4 text-amber-600" />
                  <span>Khôi phục từ file JSON sao lưu</span>
                </div>
                <p className="text-slate-500 text-[11px]">
                  Chọn file `.json` đã xuất trước đó để khôi phục toàn bộ dữ liệu.
                </p>
                <label className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold shadow-sm transition-all cursor-pointer">
                  <Upload className="w-4 h-4" />
                  <span>Chọn file JSON để phục hồi</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportJsonFile}
                    disabled={isLoading}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>Nhập từ file phả hệ GEDCOM (.ged)</span>
                </div>
                <p className="text-slate-500 text-[11px]">
                  Nạp phả hệ từ các file chuẩn GEDCOM xuất từ các nguồn bên ngoài.
                </p>
                <label className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-sm transition-all cursor-pointer">
                  <Upload className="w-4 h-4" />
                  <span>Chọn file GEDCOM (.ged)</span>
                  <input
                    type="file"
                    accept=".ged,.gedcom"
                    onChange={handleImportGedcomFile}
                    disabled={isLoading}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}

          {activeTab === "reset" && (
            <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 space-y-3">
              <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Khôi phục dữ liệu mẫu gia phả Nam Bộ ban đầu</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
                Tính năng này sẽ nạp lại dữ liệu gồm 4 thế hệ của dòng họ Nguyễn Văn (gồm Cụ Cố, Bác Hai cành trưởng, Ông Bà Nội, Ba Má, Cô Chú, Em họ và Chắt Bảo) cùng đầy đủ liên kết và quy tắc xưng hô mẫu.
              </p>
              <button
                onClick={handleResetSampleData}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold shadow-sm transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Xác nhận khôi phục dữ liệu mẫu</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
