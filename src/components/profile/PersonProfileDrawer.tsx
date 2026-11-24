"use client";

import React from "react";
import { Person } from "../../domain/models/person";
import { FamilyGraph } from "../../domain/graph/familyGraph";
import { Branch } from "../../domain/models/branch";
import { formatGenealogicalDate, formatLifespan } from "../../lib/utils/dateFormatter";
import {
  X,
  User,
  Heart,
  Baby,
  Users,
  Compass,
  ArrowRightLeft,
  Calendar,
  MapPin,
  FileText,
  Edit,
  PlusCircle,
  Shield,
  Sparkles,
  Crown,
  GitFork,
} from "lucide-react";

interface PersonProfileDrawerProps {
  person: Person | null;
  graph: FamilyGraph;
  branches: Branch[];
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean;
  onOpenKinship: (targetPersonId: string) => void;
  onSelectPerson: (personId: string) => void;
  onSetViewMode: (mode: "ancestors" | "descendants" | "immediate" | "full") => void;
  onEditPerson?: (person: Person) => void;
  onAddRelationship?: (person: Person) => void;
  onSetAsReference?: (personId: string) => void;
  isReferencePerson?: boolean;
  onSetAsRoot?: (personId: string) => void;
  isRootPerson?: boolean;
}

export const PersonProfileDrawer: React.FC<PersonProfileDrawerProps> = ({
  person,
  graph,
  branches,
  isOpen,
  onClose,
  isAdmin = false,
  onOpenKinship,
  onSelectPerson,
  onSetViewMode,
  onEditPerson,
  onAddRelationship,
  onSetAsReference,
  isReferencePerson = false,
  onSetAsRoot,
  isRootPerson = false,
}) => {
  if (!isOpen || !person) return null;

  const parents = graph.getParents(person.id);
  const spouses = graph.getSpouses(person.id);
  const children = graph.getChildren(person.id);
  const siblings = graph.getSiblings(person.id);
  const cousins = graph.getCousins(person.id);

  const isMale = person.gender === "male";
  const isFemale = person.gender === "female";
  const isDeceased = person.livingStatus === "deceased";

  const personBranches = branches.filter(b => person.branchIds.includes(b.id));

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl z-40 flex flex-col transform transition-transform duration-300 ease-in-out">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center gap-2">
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center ${
              isMale
                ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                : isFemale
                ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
            }`}
          >
            <User className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{person.fullName}</h3>
            {person.preferredName && person.preferredName !== person.fullName && (
              <p className="text-xs text-amber-700 dark:text-amber-400">({person.preferredName})</p>
            )}
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body / Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
        {/* Quick status & ordinal */}
        <div className="flex flex-wrap items-center gap-2">
          {person.familyOrdinalName && (
            <span className="px-2 py-0.5 font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200 rounded">
              Thứ {person.familyOrdinalName} trong gia đình
            </span>
          )}
          <span
            className={`px-2 py-0.5 font-medium rounded ${
              isDeceased
                ? "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300"
                : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
            }`}
          >
            {isDeceased ? "Đã quy tiên" : "Hiện còn sống"}
          </span>
          {isReferencePerson && (
            <span className="px-2 py-0.5 font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 rounded flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Người xưng hô hiện tại
            </span>
          )}
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onOpenKinship(person.id)}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold shadow-sm transition-all text-xs"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Cách xưng hô</span>
            </button>

            {onSetAsReference && (
              <button
                onClick={() => onSetAsReference(person.id)}
                disabled={isReferencePerson}
                className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg font-medium transition-all text-xs ${
                  isReferencePerson
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 cursor-default"
                    : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>{isReferencePerson ? "Đang là Tôi" : "Đặt làm Tôi"}</span>
              </button>
            )}
          </div>

          {onSetAsRoot && (
            <button
              onClick={() => onSetAsRoot(person.id)}
              disabled={isRootPerson}
              className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg font-semibold transition-all text-xs border ${
                isRootPerson
                  ? "bg-amber-100 border-amber-300 text-amber-900 dark:bg-amber-950/60 dark:border-amber-700 dark:text-amber-200 cursor-default shadow-xs"
                  : "bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 dark:hover:bg-amber-900/50 border-amber-200 dark:border-amber-800 text-amber-850 dark:text-amber-300"
              }`}
            >
              <Crown className="w-3.5 h-3.5 text-amber-600" />
              <span>{isRootPerson ? "👑 Đây là Gốc phả hệ (Đời 1)" : "Đặt người này làm Gốc cây (Đời 1)"}</span>
            </button>
          )}
        </div>

        {/* Graph navigation filters */}
        <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
          <p className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-amber-600" /> Tiêu điểm sơ đồ:
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              onClick={() => onSetViewMode("ancestors")}
              className="px-2 py-1.5 bg-white dark:bg-slate-700 hover:bg-amber-50 text-slate-700 dark:text-slate-200 rounded border border-slate-200 dark:border-slate-600 font-medium text-center"
            >
              Xem tổ tiên
            </button>
            <button
              onClick={() => onSetViewMode("descendants")}
              className="px-2 py-1.5 bg-white dark:bg-slate-700 hover:bg-amber-50 text-slate-700 dark:text-slate-200 rounded border border-slate-200 dark:border-slate-600 font-medium text-center"
            >
              Xem con cháu
            </button>
            <button
              onClick={() => onSetViewMode("immediate")}
              className="px-2 py-1.5 bg-white dark:bg-slate-700 hover:bg-amber-50 text-slate-700 dark:text-slate-200 rounded border border-slate-200 dark:border-slate-600 font-medium text-center"
            >
              Xem trực hệ
            </button>
          </div>
        </div>

        {/* Life details */}
        <div className="space-y-2">
          <h4 className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[11px] text-slate-500">
            Thông tin ngày sinh & quê quán
          </h4>
          <div className="space-y-1.5 text-slate-700 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>
                <strong>Sinh nhật:</strong> {formatGenealogicalDate(person.birthDate)}
              </span>
            </div>
            {isDeceased && (
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>
                  <strong>Ngày mất:</strong> {formatGenealogicalDate(person.deathDate)}
                </span>
              </div>
            )}
            {person.hometown && (
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>
                  <strong>Quê quán:</strong> {person.hometown}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Branches */}
        {personBranches.length > 0 && (
          <div className="space-y-1.5">
            <h4 className="font-bold uppercase tracking-wider text-[11px] text-slate-500">
              Nhánh gia phả
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {personBranches.map(b => (
                <span
                  key={b.id}
                  className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                >
                  {b.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Relatives summary */}
        <div className="space-y-3">
          <h4 className="font-bold uppercase tracking-wider text-[11px] text-slate-500">
            Mối quan hệ trực hệ
          </h4>

          {/* Parents */}
          <div className="space-y-1">
            <p className="text-slate-500 font-medium">Cha / Mẹ ({parents.length}):</p>
            {parents.length === 0 ? (
              <p className="text-slate-400 italic">Chưa có thông tin cha mẹ</p>
            ) : (
              <div className="space-y-1">
                {parents.map(p => (
                  <button
                    key={p.id}
                    onClick={() => onSelectPerson(p.id)}
                    className="w-full text-left p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 hover:bg-amber-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between"
                  >
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{p.fullName}</span>
                    <span className="text-[11px] text-slate-400">{p.gender === "male" ? "Cha (Ba)" : "Mẹ (Má)"}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Spouses */}
          <div className="space-y-1">
            <p className="text-slate-500 font-medium flex items-center gap-1">
              <Heart className="w-3 h-3 text-rose-500" /> Phối ngẫu ({spouses.length}):
            </p>
            {spouses.length === 0 ? (
              <p className="text-slate-400 italic">Chưa có thông tin phối ngẫu</p>
            ) : (
              <div className="space-y-1">
                {spouses.map(s => (
                  <button
                    key={s.id}
                    onClick={() => onSelectPerson(s.id)}
                    className="w-full text-left p-2 rounded-lg bg-rose-50/50 dark:bg-rose-950/20 hover:bg-rose-50 border border-rose-200 dark:border-rose-900/50 flex items-center justify-between"
                  >
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{s.fullName}</span>
                    <span className="text-[11px] text-rose-600 dark:text-rose-400">{s.gender === "male" ? "Chồng" : "Vợ"}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Children */}
          <div className="space-y-1">
            <p className="text-slate-500 font-medium flex items-center gap-1">
              <Baby className="w-3 h-3 text-emerald-500" /> Con cái ({children.length}):
            </p>
            {children.length === 0 ? (
              <p className="text-slate-400 italic">Chưa ghi nhận con cái</p>
            ) : (
              <div className="space-y-1">
                {children.map(c => (
                  <button
                    key={c.id}
                    onClick={() => onSelectPerson(c.id)}
                    className="w-full text-left p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 hover:bg-amber-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between"
                  >
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{c.fullName}</span>
                    <span className="text-[11px] text-slate-400">{c.familyOrdinalName ? `Thứ ${c.familyOrdinalName}` : "Con"}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Siblings */}
          <div className="space-y-1.5">
            <p className="text-slate-500 font-medium flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-blue-500" /> Anh chị em ruột ({siblings.length}):
            </p>
            {siblings.length === 0 ? (
              <p className="text-slate-400 italic">Chưa có thông tin anh chị em ruột</p>
            ) : (
              <div className="space-y-1">
                {siblings.map(sib => (
                  <button
                    key={sib.person.id}
                    onClick={() => onSelectPerson(sib.person.id)}
                    className="w-full text-left p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 hover:bg-amber-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between transition-all"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{sib.person.fullName}</span>
                      {sib.person.familyOrdinalName && (
                        <span className="text-[10px] px-1 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 rounded">
                          Thứ {sib.person.familyOrdinalName}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                        {sib.roleDescription}
                      </span>
                      {sib.person.birthDate?.year && (
                        <span className="text-[10px] text-slate-400">
                          ({sib.person.birthDate.year})
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* First Cousins */}
          <div className="space-y-1.5">
            <p className="text-slate-500 font-medium flex items-center gap-1">
              <GitFork className="w-3.5 h-3.5 text-indigo-500" /> Anh chị em họ ({cousins.length}):
            </p>
            {cousins.length === 0 ? (
              <p className="text-slate-400 italic">Chưa ghi nhận anh chị em họ</p>
            ) : (
              <div className="space-y-1 max-h-48 overflow-y-auto pr-0.5">
                {cousins.map(c => (
                  <button
                    key={c.person.id}
                    onClick={() => onSelectPerson(c.person.id)}
                    className="w-full text-left p-2 rounded-lg bg-indigo-50/40 dark:bg-indigo-950/20 hover:bg-indigo-50/80 dark:hover:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-900/40 flex items-center justify-between transition-all"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">{c.person.fullName}</span>
                        <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                          ({c.lineage === "paternal" ? "Bên nội" : "Bên ngoại"})
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400">{c.seniorityReason}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
                        {c.roleTitle}
                      </span>
                      {c.person.birthDate?.year && (
                        <span className="text-[10px] text-slate-400">
                          ({c.person.birthDate.year})
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Biography */}
        {person.biography && (
          <div className="space-y-1.5">
            <h4 className="font-bold uppercase tracking-wider text-[11px] text-slate-500 flex items-center gap-1">
              <FileText className="w-3 h-3" /> Tiểu sử & ghi chú
            </h4>
            <div className="p-3 bg-amber-50/50 dark:bg-slate-800/50 border border-amber-200/50 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
              {person.biography}
            </div>
          </div>
        )}

        {/* Admin Actions */}
        {isAdmin && (
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1">
              <Shield className="w-3 h-3" /> Quản trị viên
            </p>
            <div className="grid grid-cols-2 gap-2">
              {onEditPerson && (
                <button
                  onClick={() => onEditPerson(person)}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg font-medium"
                >
                  <Edit className="w-3.5 h-3.5" /> Chỉnh sửa
                </button>
              )}
              {onAddRelationship && (
                <button
                  onClick={() => onAddRelationship(person)}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg font-medium"
                >
                  <PlusCircle className="w-3.5 h-3.5" /> Thêm quan hệ
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
