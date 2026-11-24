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
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onOpenKinshipModal: () => void;
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
  onZoomIn,
  onZoomOut,
  onFitView,
  onOpenKinshipModal,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const filteredPersons = searchQuery.trim()
    ? persons.filter(
        p =>
          p.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.preferredName?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm z-10">
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

      {/* Right side: Reference person & Kinship compare button & Canvas zoom */}
      <div className="flex items-center gap-2">
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
          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
        >
          <ArrowRightLeft className="w-3.5 h-3.5" />
          <span>Cách xưng hô</span>
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
  );
};
