"use client";

import React, { useState } from "react";
import { Branch } from "../../domain/models/branch";
import { Person } from "../../domain/models/person";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Search,
  Users,
  Compass,
  ArrowRightLeft,
  Sparkles,
  GitBranch,
  Crown,
  X,
} from "lucide-react";

export type ViewMode = "full" | "ancestors" | "descendants" | "immediate" | "path";

interface GraphControlsProps {
  branches: Branch[];
  selectedBranchId: string;
  onSelectBranch: (branchId: string) => void;
  viewMode: ViewMode;
  onSelectViewMode: (mode: ViewMode) => void;
  persons: Person[];
  selectedPersonId: string | null;
  onSelectPerson: (personId: string) => void;
  referencePersonId: string | null;
  onSelectReferencePerson: (personId: string) => void;
  rootPersonId?: string | null;
  onSelectRootPerson?: (personId: string) => void;
  isAdmin?: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onOpenKinshipModal: () => void;
  isKinshipActive?: boolean;
}

export const GraphControls: React.FC<GraphControlsProps> = ({
  branches,
  selectedBranchId,
  onSelectBranch,
  viewMode,
  onSelectViewMode,
  persons,
  selectedPersonId,
  onSelectPerson,
  referencePersonId,
  onSelectReferencePerson,
  rootPersonId,
  onSelectRootPerson,
  isAdmin = false,
  onZoomIn,
  onZoomOut,
  onFitView,
  onOpenKinshipModal,
  isKinshipActive = false,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  const filteredPersons = searchQuery.trim()
    ? persons.filter(
        p =>
          p.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.preferredName?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  return (
    <>
      {/* ========================================= */}
      {/* 1. DESKTOP CONTROLS (md:flex, Giữ nguyên 100%) */}
      {/* ========================================= */}
      <div className="hidden md:flex flex-wrap items-center justify-between gap-3 p-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm z-10">
        {/* Left side: Branch and View Mode selection */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Branch dropdown */}
          <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800 text-xs font-medium">
            <GitBranch className="w-3.5 h-3.5 text-amber-600" />
            <span>Nhánh:</span>
            <select
              value={selectedBranchId}
              onChange={e => onSelectBranch(e.target.value)}
              className="bg-transparent border-none text-xs font-semibold focus:outline-none cursor-pointer"
            >
              <option value="all">Toàn bộ các nhánh</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* View Mode buttons */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs">
            <button
              onClick={() => onSelectViewMode("full")}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                viewMode === "full"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Toàn phả đồ
            </button>
            <button
              onClick={() => onSelectViewMode("ancestors")}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                viewMode === "ancestors"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Tổ tiên
            </button>
            <button
              onClick={() => onSelectViewMode("descendants")}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                viewMode === "descendants"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Con cháu
            </button>
            <button
              onClick={() => onSelectViewMode("immediate")}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                viewMode === "immediate"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Trực hệ
            </button>
          </div>
        </div>

        {/* Center: Search person */}
        <div className="relative">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs w-56 border border-transparent focus-within:border-amber-400 focus-within:bg-white dark:focus-within:bg-slate-900 transition-all">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Tìm theo tên..."
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              className="w-full bg-transparent border-none text-xs focus:outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
            />
          </div>

          {/* Search Results Dropdown */}
          {isSearchOpen && filteredPersons.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl z-50 py-1">
              {filteredPersons.map(p => (
                <button
                  key={p.id}
                  onClick={() => {
                    onSelectPerson(p.id);
                    setIsSearchOpen(false);
                    setSearchQuery("");
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-amber-50 dark:hover:bg-slate-800 text-xs flex items-center justify-between"
                >
                  <span className="font-medium text-slate-900 dark:text-slate-100">{p.fullName}</span>
                  {p.familyOrdinalName && (
                    <span className="text-[10px] text-amber-700 dark:text-amber-300">
                      Thứ {p.familyOrdinalName}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right side: Root person & Reference person & Kinship compare button & Canvas zoom */}
        <div className="flex items-center gap-2">
          {/* Root person indicator / selector ("Gốc phả hệ / Thủy tổ") */}
          {rootPersonId && (
            <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700 text-xs font-medium">
              <Crown className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Gốc cây:</span>
              {isAdmin && onSelectRootPerson ? (
                <select
                  value={rootPersonId || ""}
                  onChange={e => onSelectRootPerson(e.target.value)}
                  className="bg-transparent border-none text-xs font-semibold focus:outline-none cursor-pointer max-w-[130px] truncate"
                  title="Thay đổi gốc cây phả hệ (Chỉ Quản trị viên)"
                >
                  {persons.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.fullName}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="font-semibold max-w-[130px] truncate" title="Gốc cây phả hệ hiện tại (Chỉ đọc)">
                  {persons.find(p => p.id === rootPersonId)?.fullName || "Chưa đặt"}
                </span>
              )}
            </div>
          )}

          {/* Reference person selector ("Tôi là ai") */}
          <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Tôi là:</span>
            <select
              value={referencePersonId || ""}
              onChange={e => onSelectReferencePerson(e.target.value)}
              className="bg-transparent border-none text-xs font-semibold focus:outline-none cursor-pointer max-w-[130px] truncate"
            >
              {persons.map(p => (
                <option key={p.id} value={p.id}>
                  {p.fullName}
                </option>
              ))}
            </select>
          </div>

          {/* Kinship button */}
          <button
            onClick={onOpenKinshipModal}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all ${
              isKinshipActive
                ? "bg-indigo-600 text-white ring-2 ring-indigo-400 animate-pulse"
                : "bg-amber-600 hover:bg-amber-700 text-white"
            }`}
            title={isKinshipActive ? "Đang bật chế độ xem xưng hô (Bấm để tắt)" : "Xem cách người này xưng hô với cả nhà"}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>{isKinshipActive ? "Đang xem xưng hô" : "Cách xưng hô"}</span>
          </button>

          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            <button
              onClick={onZoomIn}
              title="Phóng to"
              className="p-1 rounded hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onZoomOut}
              title="Thu nhỏ"
              className="p-1 rounded hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onFitView}
              title="Vừa màn hình"
              className="p-1 rounded hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================= */}
      {/* 2. MOBILE DEDICATED LAYOUT (md:hidden)    */}
      {/* ========================================= */}
      <div className="md:hidden">
        {/* Top Mobile Bar: Nhánh, Góc nhìn, Tìm kiếm, Canh giữa */}
        <div className="px-2.5 py-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between gap-1.5 z-20">
          <div className="flex items-center gap-1.5 min-w-0">
            {/* Nhánh selector */}
            <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 px-2 py-1 rounded-lg border border-amber-200 dark:border-amber-800 text-[11px] font-medium shrink-0">
              <GitBranch className="w-3 h-3 text-amber-600 shrink-0" />
              <select
                value={selectedBranchId}
                onChange={e => onSelectBranch(e.target.value)}
                className="bg-transparent border-none text-[11px] font-semibold focus:outline-none cursor-pointer max-w-[100px] truncate"
              >
                <option value="all">Tất cả nhánh</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Chế độ xem selector */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-medium shrink-0">
              <Compass className="w-3 h-3 text-amber-600 shrink-0" />
              <select
                value={viewMode}
                onChange={e => onSelectViewMode(e.target.value as ViewMode)}
                className="bg-transparent border-none text-[11px] font-semibold focus:outline-none cursor-pointer max-w-[95px] truncate"
              >
                <option value="full">Toàn phả đồ</option>
                <option value="ancestors">Tổ tiên</option>
                <option value="descendants">Con cháu</option>
                <option value="immediate">Trực hệ</option>
              </select>
            </div>
          </div>

          {/* Quick Actions (Search & Fit View) */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setIsMobileSearchOpen(prev => !prev)}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                isMobileSearchOpen
                  ? "bg-amber-600 text-white"
                  : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
              }`}
              title="Tìm kiếm thành viên"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onFitView}
              className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs"
              title="Canh vừa màn hình"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Mobile Search Overlay */}
        {isMobileSearchOpen && (
          <div className="p-2.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-lg relative z-30 animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs border border-amber-400">
              <Search className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <input
                type="text"
                autoFocus
                placeholder="Tìm theo tên thành viên..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border-none text-xs focus:outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Mobile Search Results */}
            {filteredPersons.length > 0 && (
              <div className="mt-2 max-h-52 overflow-y-auto rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700 shadow-md">
                {filteredPersons.map(p => (
                  <button
                    key={p.id}
                    onClick={() => {
                      onSelectPerson(p.id);
                      setIsMobileSearchOpen(false);
                      setSearchQuery("");
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-amber-50 dark:hover:bg-slate-700/50 text-xs flex items-center justify-between"
                  >
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{p.fullName}</span>
                    {p.familyOrdinalName && (
                      <span className="text-[10px] text-amber-700 dark:text-amber-300 font-medium bg-amber-50 dark:bg-amber-950 px-1.5 py-0.5 rounded">
                        Thứ {p.familyOrdinalName}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Mobile Bottom Floating Action Dock */}
        <div className="fixed bottom-3 inset-x-2.5 z-30 pointer-events-auto">
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xl px-2.5 py-2 flex items-center justify-between gap-1.5">
            {/* 1. Tôi là (Reference Person) */}
            <div className="flex-1 min-w-0 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 px-2 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800 text-[11px] font-medium">
              <Sparkles className="w-3 h-3 text-emerald-600 shrink-0" />
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 shrink-0 font-semibold">Tôi:</span>
              <select
                value={referencePersonId || ""}
                onChange={e => onSelectReferencePerson(e.target.value)}
                className="bg-transparent border-none text-[11px] font-bold focus:outline-none cursor-pointer w-full truncate text-emerald-900 dark:text-emerald-100"
              >
                {persons.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.preferredName || p.fullName}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Hero Action: Cách xưng hô (Center) */}
            <button
              onClick={onOpenKinshipModal}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold shadow-md transition-all ${
                isKinshipActive
                  ? "bg-indigo-600 text-white ring-2 ring-indigo-400 animate-pulse"
                  : "bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white"
              }`}
              title="Cách xưng hô trong gia đình"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>{isKinshipActive ? "Đang xưng hô" : "Cách xưng hô"}</span>
            </button>

            {/* 3. Gốc cây (Crown) */}
            <div className="flex-1 min-w-0 flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 px-2 py-1.5 rounded-xl border border-amber-300 dark:border-amber-700 text-[11px] font-medium">
              <Crown className="w-3 h-3 text-amber-600 shrink-0" />
              <span className="text-[10px] text-amber-700 dark:text-amber-400 shrink-0 font-semibold">Gốc:</span>
              {isAdmin && onSelectRootPerson ? (
                <select
                  value={rootPersonId || ""}
                  onChange={e => onSelectRootPerson(e.target.value)}
                  className="bg-transparent border-none text-[11px] font-bold focus:outline-none cursor-pointer w-full truncate text-amber-900 dark:text-amber-100"
                  title="Thay đổi gốc cây phả hệ (Chỉ Quản trị viên)"
                >
                  {persons.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.preferredName || p.fullName}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-[11px] font-bold truncate text-amber-900 dark:text-amber-100">
                  {persons.find(p => p.id === rootPersonId)?.preferredName || persons.find(p => p.id === rootPersonId)?.fullName || "Chưa đặt"}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
