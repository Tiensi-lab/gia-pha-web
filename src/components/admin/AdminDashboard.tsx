"use client";

import React, { useState, useMemo } from "react";
import { Person } from "../../domain/models/person";
import { Relationship } from "../../domain/models/relationship";
import { Branch } from "../../domain/models/branch";
import { NamingPreferences, KinshipOverride } from "../../domain/models/naming";
import { AuditLog } from "../../domain/models/audit";
import { FamilyRepository } from "../../lib/storage/repository";
import { formatLifespan, formatGenealogicalDate } from "../../lib/utils/dateFormatter";
import {
  Users,
  GitCommit,
  GitBranch,
  BookOpen,
  History,
  Plus,
  Search,
  Edit,
  Trash2,
  Archive,
  RotateCcw,
  GitMerge,
  Download,
  Upload,
  Settings,
  Shield,
  Heart,
  CheckCircle2,
  UserCheck,
  UserX,
  FileText,
} from "lucide-react";

interface AdminDashboardProps {
  persons: Person[];
  relationships: Relationship[];
  branches: Branch[];
  preferences: NamingPreferences;
  overrides: KinshipOverride[];
  auditLogs: AuditLog[];
  repository: FamilyRepository;
  onRefreshData: () => void;
  onOpenPersonForm: (person?: Person) => void;
  onOpenRelationshipForm: (person?: Person) => void;
  onOpenDuplicateModal: () => void;
  onOpenImportExportModal: () => void;
  onClose: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  persons,
  relationships,
  branches,
  preferences,
  overrides,
  auditLogs,
  repository,
  onRefreshData,
  onOpenPersonForm,
  onOpenRelationshipForm,
  onOpenDuplicateModal,
  onOpenImportExportModal,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<"overview" | "people" | "relationships" | "rules" | "audit">("overview");
  const [searchPerson, setSearchPerson] = useState("");
  const [prefForm, setPrefForm] = useState<NamingPreferences>({ ...preferences });
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);
  const [prefsSuccess, setPrefsSuccess] = useState(false);

  // Overview metrics
  const livingCount = persons.filter(p => p.livingStatus === "living").length;
  const deceasedCount = persons.filter(p => p.livingStatus === "deceased").length;
  const incompleteCount = persons.filter(p => !p.birthDate?.year || !p.gender || p.gender === "unknown").length;

  const filteredPersons = useMemo(() => {
    if (!searchPerson.trim()) return persons;
    const q = searchPerson.toLowerCase();
    return persons.filter(
      p => p.fullName.toLowerCase().includes(q) || p.preferredName?.toLowerCase().includes(q)
    );
  }, [persons, searchPerson]);

  const handleDeletePerson = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa thành viên "${name}" cùng toàn bộ mối quan hệ liên đới?`)) {
      return;
    }
    await repository.deletePerson(id);
    onRefreshData();
  };

  const handleArchivePerson = async (id: string) => {
    await repository.archivePerson(id);
    onRefreshData();
  };

  const handleRestorePerson = async (id: string) => {
    await repository.restorePerson(id);
    onRefreshData();
  };

  const handleDeleteRelationship = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa mối quan hệ này?")) return;
    await repository.deleteRelationship(id);
    onRefreshData();
  };

  const handleDeleteOverride = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa ghi đè xưng hô này?")) return;
    await repository.deleteOverride(id);
    onRefreshData();
  };

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingPrefs(true);
      await repository.updateNamingPreferences(prefForm);
      setPrefsSuccess(true);
      setTimeout(() => setPrefsSuccess(false), 2500);
      onRefreshData();
    } finally {
      setIsSavingPrefs(false);
    }
  };

  const personMap = useMemo(() => new Map(persons.map(p => [p.id, p])), [persons]);

  return (
    <div className="w-full h-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden text-xs">
      {/* Top Bar */}
      <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold shadow">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Bảng Quản Trị Gia Phả Gia Đình
            </h2>
            <p className="text-[11px] text-slate-500">
              Hệ thống quản lý dữ liệu, kiểm tra tính toàn vẹn và quy tắc xưng hô
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenDuplicateModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950 dark:hover:bg-amber-900 dark:text-amber-200 rounded-lg font-medium border border-amber-200 dark:border-amber-800"
          >
            <GitMerge className="w-3.5 h-3.5" />
            <span>Kiểm tra trùng lặp</span>
          </button>

          <button
            onClick={onOpenImportExportModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg font-medium"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Sao lưu & Xuất nhập</span>
          </button>

          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-semibold"
          >
            Quay lại sơ đồ
          </button>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 shrink-0 font-semibold">
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-2 py-3 px-3 border-b-2 transition-all ${
            activeTab === "overview"
              ? "border-amber-600 text-amber-700 dark:text-amber-400"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Tổng quan số liệu</span>
        </button>

        <button
          onClick={() => setActiveTab("people")}
          className={`flex items-center gap-2 py-3 px-3 border-b-2 transition-all ${
            activeTab === "people"
              ? "border-amber-600 text-amber-700 dark:text-amber-400"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Danh sách thành viên ({persons.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("relationships")}
          className={`flex items-center gap-2 py-3 px-3 border-b-2 transition-all ${
            activeTab === "relationships"
              ? "border-amber-600 text-amber-700 dark:text-amber-400"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <GitCommit className="w-4 h-4" />
          <span>Mối quan hệ ({relationships.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("rules")}
          className={`flex items-center gap-2 py-3 px-3 border-b-2 transition-all ${
            activeTab === "rules"
              ? "border-amber-600 text-amber-700 dark:text-amber-400"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Quy tắc xưng hô & Ghi đè ({overrides.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("audit")}
          className={`flex items-center gap-2 py-3 px-3 border-b-2 transition-all ${
            activeTab === "audit"
              ? "border-amber-600 text-amber-700 dark:text-amber-400"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <History className="w-4 h-4" />
          <span>Nhật ký hoạt động ({auditLogs.length})</span>
        </button>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto p-5">
        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-5 max-w-5xl mx-auto">
            {/* Metric cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm space-y-1">
                <span className="text-slate-500 text-[11px] font-medium">Tổng số thành viên</span>
                <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{persons.length}</p>
                <p className="text-[10px] text-amber-600 font-medium">Toàn bộ cây phả hệ</p>
              </div>

              <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm space-y-1">
                <span className="text-slate-500 text-[11px] font-medium">Hiện còn sống</span>
                <p className="text-2xl font-black text-emerald-600">{livingCount}</p>
                <p className="text-[10px] text-slate-400">Được bảo vệ quyền riêng tư</p>
              </div>

              <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm space-y-1">
                <span className="text-slate-500 text-[11px] font-medium">Đã quy tiên</span>
                <p className="text-2xl font-black text-stone-600 dark:text-stone-300">{deceasedCount}</p>
                <p className="text-[10px] text-slate-400">Tổ tiên & tiền nhân</p>
              </div>

              <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm space-y-1">
                <span className="text-slate-500 text-[11px] font-medium">Số nhánh gia phả</span>
                <p className="text-2xl font-black text-blue-600">{branches.length}</p>
                <p className="text-[10px] text-slate-400">Chi họ & nội ngoại</p>
              </div>
            </div>

            {/* Quick Actions & Incomplete records */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm space-y-3">
                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Thao tác nhanh</h4>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onOpenPersonForm()}
                    className="flex items-center justify-center gap-1.5 p-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold shadow-sm"
                  >
                    <Plus className="w-4 h-4" /> Thêm thành viên
                  </button>
                  <button
                    onClick={() => onOpenRelationshipForm()}
                    className="flex items-center justify-center gap-1.5 p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg font-semibold"
                  >
                    <Plus className="w-4 h-4" /> Thêm mối quan hệ
                  </button>
                </div>
              </div>

              <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  Chất lượng dữ liệu ({incompleteCount} hồ sơ chưa hoàn thiện)
                </h4>
                <p className="text-slate-500 text-[11px]">
                  Các hồ sơ chưa ghi nhận năm sinh hoặc giới tính sẽ được hệ thống gắn cờ để người quản trị bổ sung nhằm đảm bảo tính toán xưng hô chính xác.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PEOPLE MANAGEMENT */}
        {activeTab === "people" && (
          <div className="space-y-4 max-w-6xl mx-auto">
            <div className="flex items-center justify-between gap-3">
              <div className="relative w-72">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm thành viên theo tên..."
                  value={searchPerson}
                  onChange={e => setSearchPerson(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                />
              </div>

              <button
                onClick={() => onOpenPersonForm()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm thành viên
              </button>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-semibold">
                    <th className="p-3">Họ và tên</th>
                    <th className="p-3">Thứ bậc</th>
                    <th className="p-3">Giới tính</th>
                    <th className="p-3">Năm sinh / mất</th>
                    <th className="p-3">Quê quán</th>
                    <th className="p-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredPersons.map(p => {
                    const isArchived = p.notes?.includes("[ARCHIVED]");
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                        <td className="p-3">
                          <span className="font-semibold text-slate-900 dark:text-slate-100">{p.fullName}</span>
                          {p.preferredName && (
                            <span className="text-amber-700 dark:text-amber-400 ml-1">({p.preferredName})</span>
                          )}
                          {isArchived && (
                            <span className="ml-2 px-1.5 py-0.2 bg-stone-200 text-stone-700 rounded text-[10px]">
                              Đã lưu trữ
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          {p.familyOrdinalName ? `Thứ ${p.familyOrdinalName}` : "-"}
                        </td>
                        <td className="p-3">
                          {p.gender === "male" ? "Nam" : p.gender === "female" ? "Nữ" : "Chưa rõ"}
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-400">
                          {formatLifespan(p.birthDate, p.deathDate, p.livingStatus)}
                        </td>
                        <td className="p-3 text-slate-500">{p.hometown || "-"}</td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => onOpenPersonForm(p)}
                              title="Chỉnh sửa"
                              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            {isArchived ? (
                              <button
                                onClick={() => handleRestorePerson(p.id)}
                                title="Phục hồi"
                                className="p-1 rounded hover:bg-slate-100 text-emerald-600"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleArchivePerson(p.id)}
                                title="Lưu trữ (ẩn)"
                                className="p-1 rounded hover:bg-slate-100 text-stone-500"
                              >
                                <Archive className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeletePerson(p.id, p.fullName)}
                              title="Xóa vĩnh viễn"
                              className="p-1 rounded hover:bg-rose-50 text-rose-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: RELATIONSHIPS MANAGEMENT */}
        {activeTab === "relationships" && (
          <div className="space-y-4 max-w-6xl mx-auto">
            <div className="flex items-center justify-between">
              <p className="text-slate-500 font-medium">Danh sách các mối quan hệ đã lưu trong phả hệ</p>
              <button
                onClick={() => onOpenRelationshipForm()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm mối quan hệ
              </button>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-semibold">
                    <th className="p-3">Loại quan hệ</th>
                    <th className="p-3">Người nguồn</th>
                    <th className="p-3">Người đích</th>
                    <th className="p-3">Chi tiết / Tính chất</th>
                    <th className="p-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {relationships.map(r => {
                    const fromP = personMap.get(r.fromPersonId);
                    const toP = personMap.get(r.toPersonId);
                    return (
                      <tr key={r.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                        <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                          {r.type === "PARENT_CHILD"
                            ? "Cha/Mẹ -> Con"
                            : r.type === "PARTNERSHIP"
                            ? "Hôn phối (Vợ chồng)"
                            : "Anh chị em lâm thời"}
                        </td>
                        <td className="p-3 font-medium text-slate-900 dark:text-slate-100">
                          {fromP?.fullName || r.fromPersonId}
                        </td>
                        <td className="p-3 font-medium text-slate-900 dark:text-slate-100">
                          {toP?.fullName || r.toPersonId}
                        </td>
                        <td className="p-3 text-slate-500">
                          {r.type === "PARENT_CHILD"
                            ? r.parentChildData?.nature === "biological"
                              ? "Ruột thịt"
                              : "Con nuôi / Con riêng"
                            : r.type === "PROVISIONAL_SIBLING"
                            ? r.provisionalSiblingData?.reason
                            : "Hôn nhân chính thức"}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleDeleteRelationship(r.id)}
                            title="Xóa quan hệ"
                            className="p-1 rounded hover:bg-rose-50 text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: NAMING RULES & OVERRIDES */}
        {activeTab === "rules" && (
          <div className="space-y-6 max-w-4xl mx-auto">
            {/* Global Settings Form */}
            <form onSubmit={handleSavePreferences} className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                    Quy ước xưng hô phong tục Nam Bộ (Level 1: Global Conventions)
                  </h4>
                  <p className="text-slate-500 text-[11px]">
                    Cấu hình danh xưng mặc định trong gia đình theo văn hóa miền Nam
                  </p>
                </div>
                {prefsSuccess && (
                  <span className="px-2 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold rounded text-[10px] flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Đã cập nhật
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Gọi Cha:</label>
                  <input
                    type="text"
                    value={prefForm.fatherTerm}
                    onChange={e => setPrefForm({ ...prefForm, fatherTerm: e.target.value })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Gọi Mẹ:</label>
                  <input
                    type="text"
                    value={prefForm.motherTerm}
                    onChange={e => setPrefForm({ ...prefForm, motherTerm: e.target.value })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Anh của Cha:</label>
                  <input
                    type="text"
                    value={prefForm.paternalMaleElderTerm}
                    onChange={e => setPrefForm({ ...prefForm, paternalMaleElderTerm: e.target.value })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Em trai của Cha:</label>
                  <input
                    type="text"
                    value={prefForm.paternalMaleYoungerTerm}
                    onChange={e => setPrefForm({ ...prefForm, paternalMaleYoungerTerm: e.target.value })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <label className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prefForm.prioritizeBranchSeniority}
                    onChange={e => setPrefForm({ ...prefForm, prioritizeBranchSeniority: e.target.checked })}
                    className="rounded text-amber-600 focus:ring-amber-500"
                  />
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">Ưu tiên thứ bậc chi họ (cành anh / cành em)</p>
                    <p className="text-slate-500 text-[10px]">Theo câu tục ngữ: "Bé bằng củ khoai, cứ vai mà gọi"</p>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prefForm.useOrdinalTitles}
                    onChange={e => setPrefForm({ ...prefForm, useOrdinalTitles: e.target.checked })}
                    className="rounded text-amber-600 focus:ring-amber-500"
                  />
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">Ghép danh xưng thứ (Hai, Ba, Tư, Út...)</p>
                    <p className="text-slate-500 text-[10px]">Ví dụ: Bác Hai, Chú Ba, Cậu Tư, Dì Út</p>
                  </div>
                </label>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSavingPrefs}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold shadow-sm"
                >
                  {isSavingPrefs ? "Đang lưu..." : "Lưu cài đặt quy ước"}
                </button>
              </div>
            </form>

            {/* Manual Overrides Table */}
            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm space-y-3">
              <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                Danh sách ghi đè xưng hô thủ công (Level 3 Overrides)
              </h4>
              {overrides.length === 0 ? (
                <p className="text-slate-400 italic">Chưa có quy tắc ghi đè riêng biệt nào.</p>
              ) : (
                <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-semibold">
                        <th className="p-2.5">Người gọi</th>
                        <th className="p-2.5">Người được gọi</th>
                        <th className="p-2.5">Từ xưng hô ghi đè</th>
                        <th className="p-2.5">Ghi chú</th>
                        <th className="p-2.5 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {overrides.map(o => {
                        const spk = personMap.get(o.speakerId);
                        const tgt = personMap.get(o.targetId);
                        return (
                          <tr key={o.id}>
                            <td className="p-2.5 font-medium">{spk?.fullName || o.speakerId}</td>
                            <td className="p-2.5 font-medium">{tgt?.fullName || o.targetId}</td>
                            <td className="p-2.5 font-bold text-amber-700 dark:text-amber-400">{o.addressTerm}</td>
                            <td className="p-2.5 text-slate-500">{o.notes || "-"}</td>
                            <td className="p-2.5 text-right">
                              <button
                                onClick={() => handleDeleteOverride(o.id)}
                                className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: AUDIT LOGS */}
        {activeTab === "audit" && (
          <div className="space-y-4 max-w-5xl mx-auto">
            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              Nhật ký thay đổi và kiểm toán dữ liệu (Audit Trail)
            </h4>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-semibold">
                    <th className="p-3">Thời gian</th>
                    <th className="p-3">Hành động</th>
                    <th className="p-3">Đối tượng</th>
                    <th className="p-3">Mô tả chi tiết</th>
                    <th className="p-3">Người thực hiện</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {auditLogs.map(l => (
                    <tr key={l.id} className="hover:bg-slate-50/80">
                      <td className="p-3 text-slate-500 whitespace-nowrap">
                        {new Date(l.timestamp).toLocaleString("vi-VN")}
                      </td>
                      <td className="p-3 font-semibold text-amber-700 dark:text-amber-400">
                        {l.action}
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-300">
                        {l.entityType} ({l.entityId})
                      </td>
                      <td className="p-3 text-slate-800 dark:text-slate-200">
                        {l.description}
                      </td>
                      <td className="p-3 text-slate-500">{l.performedBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
