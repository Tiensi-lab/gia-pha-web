"use client";

import React, { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Person } from "../../domain/models/person";
import { formatLifespan } from "../../lib/utils/dateFormatter";
import { User, Sparkles, Crown } from "lucide-react";

export interface PersonNodeData {
  person: Person;
  isSelected?: boolean;
  isRef?: boolean;
  isRoot?: boolean;
  isCompare?: boolean;
  isKinshipSpeaker?: boolean;
  kinshipLabel?: string;
  isInKinshipPath?: boolean;
  isAncestor?: boolean;
  isDescendant?: boolean;
}

export const PersonNode = memo(({ data }: NodeProps) => {
  const nodeData = data as unknown as PersonNodeData;
  const {
    person,
    isSelected,
    isRef,
    isRoot,
    isCompare,
    isKinshipSpeaker,
    kinshipLabel,
    isInKinshipPath,
    isAncestor,
    isDescendant,
  } = nodeData;

  const isMale = person.gender === "male";
  const isFemale = person.gender === "female";
  const isDeceased = person.livingStatus === "deceased";

  let ringClass = "border-slate-300 dark:border-slate-700 hover:border-amber-400";
  if (isKinshipSpeaker) {
    ringClass = "border-indigo-600 ring-4 ring-indigo-500/60 shadow-2xl scale-105 bg-indigo-50/20";
  } else if (isSelected) {
    ringClass = "border-amber-500 ring-4 ring-amber-400/40 shadow-lg scale-105";
  } else if (isRoot) {
    ringClass = "border-amber-500 ring-2 ring-amber-400/60 shadow-md bg-amber-50/10";
  } else if (isRef) {
    ringClass = "border-emerald-500 ring-4 ring-emerald-400/40 shadow-lg";
  } else if (isCompare) {
    ringClass = "border-purple-500 ring-4 ring-purple-400/40 shadow-lg";
  } else if (isInKinshipPath) {
    ringClass = "border-blue-500 ring-4 ring-blue-400/40 shadow-md";
  } else if (isAncestor) {
    ringClass = "border-amber-300 ring-2 ring-amber-200/50";
  } else if (isDescendant) {
    ringClass = "border-teal-300 ring-2 ring-teal-200/50";
  }

  return (
    <div
      className={`relative w-[220px] rounded-xl bg-white dark:bg-slate-900 border-2 p-3 shadow-sm transition-all cursor-pointer ${ringClass}`}
    >
      {/* Handles */}
      <Handle type="target" position={Position.Top} id="top" className="!w-2 !h-2 !bg-slate-400 !border-white" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="!w-2 !h-2 !bg-slate-400 !border-white" />
      
      {/* Lateral handles for horizontal marriage connections */}
      <Handle type="target" position={Position.Left} id="left-target" className="!w-2 !h-2 !bg-rose-400 !border-white" />
      <Handle type="source" position={Position.Left} id="left-source" className="!w-2 !h-2 !bg-rose-400 !border-white" />
      <Handle type="target" position={Position.Right} id="right-target" className="!w-2 !h-2 !bg-rose-400 !border-white" />
      <Handle type="source" position={Position.Right} id="right-source" className="!w-2 !h-2 !bg-rose-400 !border-white" />

      {/* Badges on top */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1">
          {isKinshipSpeaker && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-indigo-600 text-white rounded flex items-center gap-0.5 shadow-sm animate-pulse">
              <Sparkles className="w-2.5 h-2.5" /> Điểm nhìn xưng hô
            </span>
          )}
          {isRoot && (
            <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-amber-500 text-white rounded flex items-center gap-0.5 shadow-xs">
              <Crown className="w-2.5 h-2.5" /> Gốc cây
            </span>
          )}
          {person.familyOrdinalName && (
            <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200 rounded">
              Thứ {person.familyOrdinalName}
            </span>
          )}
          {isRef && (
            <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 rounded flex items-center gap-0.5">
              <Sparkles className="w-2.5 h-2.5" /> Tôi
            </span>
          )}
        </div>

        {/* Living / Deceased badge */}
        <span
          className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
            isDeceased
              ? "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300"
              : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
          }`}
        >
          {isDeceased ? "Đã mất" : "Còn sống"}
        </span>
      </div>

      {/* Main Person Content */}
      <div className="flex items-start gap-2.5">
        {/* Avatar / Icon */}
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border ${
            isMale
              ? "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800"
              : isFemale
              ? "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800"
              : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300"
          }`}
        >
          <User className="w-5 h-5" />
        </div>

        {/* Text info */}
        <div className="overflow-hidden min-w-0 flex-1">
          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate" title={person.fullName}>
            {person.fullName}
          </h4>
          {person.preferredName && person.preferredName !== person.fullName && (
            <p className="text-[11px] text-amber-700 dark:text-amber-400 truncate">
              ({person.preferredName})
            </p>
          )}
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {formatLifespan(person.birthDate, person.deathDate, person.livingStatus)}
          </p>
        </div>
      </div>

      {/* Kinship Callout Label when a person is selected for addressing */}
      {kinshipLabel && !isKinshipSpeaker && (
        <div className="mt-2.5 py-1 px-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between shadow-xs animate-in fade-in zoom-in-95 duration-200">
          <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
            Gọi là:
          </span>
          <span className="text-xs font-black text-indigo-800 dark:text-indigo-200">
            {kinshipLabel}
          </span>
        </div>
      )}
    </div>
  );
});

PersonNode.displayName = "PersonNode";
