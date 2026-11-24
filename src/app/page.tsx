"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Person, PersonInput } from "../domain/models/person";
import { Relationship, RelationshipInput } from "../domain/models/relationship";
import { Branch } from "../domain/models/branch";
import { NamingPreferences, KinshipOverride, KinshipOverrideInput, defaultSouthernNamingPreferences } from "../domain/models/naming";
import { AuditLog } from "../domain/models/audit";
import { DuplicateCandidate } from "../lib/storage/repository";
import { getRepository } from "../lib/storage";
import { FamilyGraph } from "../domain/graph/familyGraph";
import { KinshipInference } from "../domain/kinship/kinshipInference";
import { FamilyGraphCanvas } from "../components/graph/FamilyGraphCanvas";
import { GraphControls, ViewMode } from "../components/graph/GraphControls";
import { PersonProfileDrawer } from "../components/profile/PersonProfileDrawer";
import { KinshipCalculatorModal } from "../components/profile/KinshipCalculatorModal";
import { KinshipOverrideModal } from "../components/profile/KinshipOverrideModal";
import { PersonFormModal } from "../components/admin/PersonFormModal";
import { RelationshipFormModal } from "../components/admin/RelationshipFormModal";
import { DuplicateDetectorModal } from "../components/admin/DuplicateDetectorModal";
import { DataImportExportModal } from "../components/admin/DataImportExportModal";
import { AdminDashboard } from "../components/admin/AdminDashboard";
import { LoginModal } from "../components/auth/LoginModal";
import { AuthProvider, useAuth } from "../lib/auth/authContext";
import { Shield, Sparkles, BookOpen, Layers, Plus, LogIn, LogOut, Eye } from "lucide-react";
import type { useReactFlow } from "@xyflow/react";

function FamilyAppContent() {
  const repository = useMemo(() => getRepository(), []);
  const { user, isAdmin, logout } = useAuth();

  // Data State
  const [persons, setPersons] = useState<Person[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [preferences, setPreferences] = useState<NamingPreferences>(defaultSouthernNamingPreferences);
  const [overrides, setOverrides] = useState<KinshipOverride[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateCandidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // App UI State
  const [selectedBranchId, setSelectedBranchId] = useState<string>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("full");
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [referencePersonId, setReferencePersonId] = useState<string | null>("p-admin-minh");
  const [rootPersonId, setRootPersonId] = useState<string | null>(null);
  const [kinshipSpeakerId, setKinshipSpeakerId] = useState<string | null>(null);
  const [kinshipPathNodeIds, setKinshipPathNodeIds] = useState<Set<string>>(new Set());

  // Modals & Drawers
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isKinshipModalOpen, setIsKinshipModalOpen] = useState(false);
  const [kinshipPersonBId, setKinshipPersonBId] = useState<string | null>(null);

  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [overrideSpeakerId, setOverrideSpeakerId] = useState<string>("");
  const [overrideTargetId, setOverrideTargetId] = useState<string>("");

  const [isPersonFormOpen, setIsPersonFormOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);

  const [isRelationshipFormOpen, setIsRelationshipFormOpen] = useState(false);
  const [relationshipSourcePersonId, setRelationshipSourcePersonId] = useState<string | null>(null);

  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [isImportExportModalOpen, setIsImportExportModalOpen] = useState(false);
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // React Flow Ref controls
  const [rfInstance, setRfInstance] = useState<ReturnType<typeof useReactFlow> | null>(null);

  // Load all data
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);

      // 1. Tải dữ liệu công khai phả hệ (khách xem và admin đều cần)
      const [pList, rList, bList, nPrefs, oList] = await Promise.all([
        repository.getAllPersons().catch((err) => {
          console.warn("Lỗi tải danh sách thành viên:", err);
          return [] as Person[];
        }),
        repository.getAllRelationships().catch((err) => {
          console.warn("Lỗi tải quan hệ phả hệ:", err);
          return [] as Relationship[];
        }),
        repository.getAllBranches().catch((err) => {
          console.warn("Lỗi tải các nhánh phả hệ:", err);
          return [] as Branch[];
        }),
        repository.getNamingPreferences().catch((err) => {
          console.warn("Lỗi tải cấu hình xưng hô:", err);
          return defaultSouthernNamingPreferences;
        }),
        repository.getAllOverrides().catch((err) => {
          console.warn("Lỗi tải ghi đè xưng hô:", err);
          return [] as KinshipOverride[];
        }),
      ]);

      setPersons(pList);
      setRelationships(rList);
      setBranches(bList);
      setPreferences(nPrefs);
      setOverrides(oList);

      // 2. Tải dữ liệu quản trị: CHỈ tải khi đã đăng nhập Admin
      if (isAdmin) {
        const [aLogs, dList] = await Promise.all([
          repository.getAuditLogs(100).catch((err) => {
            console.warn("Lỗi tải nhật ký thao tác (Audit Logs):", err);
            return [] as AuditLog[];
          }),
          repository.detectDuplicates().catch((err) => {
            console.warn("Lỗi quét trùng lặp thành viên:", err);
            return [] as DuplicateCandidate[];
          }),
        ]);
        setAuditLogs(aLogs);
        setDuplicates(dList);
      } else {
        setAuditLogs([]);
        setDuplicates([]);
      }

      if (pList.length > 0 && (!referencePersonId || !pList.some(p => p.id === referencePersonId))) {
        const adminPerson = pList.find(p => p.id === "p-admin-minh") || pList[0];
        setReferencePersonId(adminPerson.id);
      }

      // Detect / Load rootPersonId
      let detectedRoot = rootPersonId;
      if (!detectedRoot || !pList.some(p => p.id === detectedRoot)) {
        const storedRoot = typeof window !== "undefined" ? localStorage.getItem("gia_pha_root_person") : null;
        if (storedRoot && pList.some(p => p.id === storedRoot)) {
          detectedRoot = storedRoot;
        } else {
          const activeBranch = bList.find(b => b.id === (selectedBranchId === "all" ? "branch-root" : selectedBranchId));
          if (activeBranch?.rootPersonId && pList.some(p => p.id === activeBranch.rootPersonId)) {
            detectedRoot = activeBranch.rootPersonId;
          } else if (pList.length > 0) {
            // Find root person who has no parents and has descendants, or oldest birth year
            const parentRels = new Set(rList.filter(r => r.type === "PARENT_CHILD").map(r => r.toPersonId));
            const rootCandidates = pList.filter(p => !parentRels.has(p.id));
            if (rootCandidates.length > 0) {
              const childRels = new Set(rList.filter(r => r.type === "PARENT_CHILD").map(r => r.fromPersonId));
              const withChildren = rootCandidates.find(p => childRels.has(p.id));
              detectedRoot = withChildren ? withChildren.id : rootCandidates[0].id;
            } else {
              detectedRoot = pList[0].id;
            }
          }
        }
      }
      if (detectedRoot) {
        setRootPersonId(detectedRoot);
      }
    } catch (e) {
      console.error("Failed to load family data", e);
    } finally {
      setIsLoading(false);
    }
  }, [repository, referencePersonId, rootPersonId, selectedBranchId, isAdmin]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived graph
  const familyGraph = useMemo(() => {
    return new FamilyGraph(persons, relationships);
  }, [persons, relationships]);

  // Pre-calculate what kinshipSpeakerId calls all other members in the family
  const kinshipLabelsMap = useMemo(() => {
    if (!kinshipSpeakerId) return new Map<string, string>();
    const map = new Map<string, string>();
    for (const p of persons) {
      if (p.id === kinshipSpeakerId) {
        map.set(p.id, "Tôi (Người xưng hô)");
        continue;
      }
      try {
        const res = KinshipInference.inferKinship(
          kinshipSpeakerId,
          p.id,
          familyGraph,
          preferences,
          overrides
        );
        if (res.aCallsB) {
          map.set(p.id, res.aCallsB);
        } else if (res.relationshipType && res.relationshipType !== "UNRESOLVED") {
          map.set(p.id, res.relationshipType);
        } else {
          map.set(p.id, "Chưa rõ");
        }
      } catch {
        map.set(p.id, "Họ hàng");
      }
    }
    return map;
  }, [kinshipSpeakerId, persons, familyGraph, preferences, overrides]);

  const selectedPerson = useMemo(() => {
    return persons.find(p => p.id === selectedPersonId) || null;
  }, [persons, selectedPersonId]);

  // Handlers
  const handleSelectPerson = useCallback((personId: string) => {
    setSelectedPersonId(personId);
    setIsProfileOpen(true);
  }, []);

  const handleOpenKinship = useCallback((targetPersonId: string) => {
    // Highlight this person as the addressing focal point and show callout labels on all other people!
    setKinshipSpeakerId(targetPersonId);
    setSelectedPersonId(targetPersonId);
    setIsProfileOpen(false); // Close drawer to display the full interactive graph clearly
  }, []);

  const handleOpenOverride = useCallback((speakerId: string, targetId: string) => {
    if (!isAdmin) {
      setIsLoginModalOpen(true);
      return;
    }
    setOverrideSpeakerId(speakerId);
    setOverrideTargetId(targetId);
    setIsOverrideModalOpen(true);
  }, [isAdmin]);

  const handleSavePerson = async (input: PersonInput) => {
    if (editingPerson) {
      await repository.updatePerson(editingPerson.id, input);
    } else {
      await repository.createPerson(input);
    }
    await loadData();
  };

  const handleSaveRelationship = async (input: RelationshipInput) => {
    await repository.createRelationship(input);
    await loadData();
  };

  const handleSaveOverride = async (input: KinshipOverrideInput) => {
    const existing = overrides.find(o => o.speakerId === input.speakerId && o.targetId === input.targetId);
    if (existing) {
      await repository.updateOverride(existing.id, input);
    } else {
      await repository.createOverride(input);
    }
    await loadData();
  };

  const handleDeleteOverride = async (overrideId: string) => {
    await repository.deleteOverride(overrideId);
    await loadData();
  };

  const handleSetAsRoot = useCallback(async (personId: string) => {
    setRootPersonId(personId);
    if (typeof window !== "undefined") {
      localStorage.setItem("gia_pha_root_person", personId);
    }
    try {
      const targetBranchId = selectedBranchId === "all" ? (branches[0]?.id || "branch-root") : selectedBranchId;
      const targetBranch = branches.find(b => b.id === targetBranchId);
      if (targetBranch) {
        await repository.updateBranch(targetBranchId, { rootPersonId: personId });
        setBranches(prev => prev.map(b => b.id === targetBranchId ? { ...b, rootPersonId: personId } : b));
      }
    } catch (e) {
      console.warn("Failed to persist root person", e);
    }
  }, [branches, repository, selectedBranchId]);

  const handleZoomIn = () => rfInstance?.zoomIn({ duration: 300 });
  const handleZoomOut = () => rfInstance?.zoomOut({ duration: 300 });
  const handleFitView = () => {
    rfInstance?.fitView({ duration: 500, padding: 0.2 });
    setKinshipPathNodeIds(new Set());
    setViewMode("full");
  };

  if (isLoading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200">
        <div className="w-12 h-12 rounded-2xl bg-amber-600 text-white flex items-center justify-center font-bold text-xl shadow-lg animate-bounce">
          GP
        </div>
        <p className="mt-4 font-semibold text-sm">Đang tải dữ liệu gia phả...</p>
        <p className="text-xs text-slate-400 mt-1">Hệ thống suy luận phả hệ và quy ước Nam Bộ</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* Top Header Bar */}
      <header className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold shadow-md">
            GP
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>Gia Phả Gia Đình</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-800">
                Nam Bộ
              </span>
            </h1>
            <p className="text-[11px] text-slate-500">Mạng lưới phả hệ & suy luận cách xưng hô chuẩn mực</p>
          </div>
        </div>

        {/* Right Header Navigation */}
        <div className="flex items-center gap-2">
          {isAdmin ? (
            /* Admin Logged-in State */
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs">
                <Shield className="w-3.5 h-3.5 text-emerald-600" />
                <span className="font-semibold text-emerald-800 dark:text-emerald-300">
                  Quản trị viên ({user?.displayName || "Admin"})
                </span>
              </div>

              <button
                onClick={() => {
                  setEditingPerson(null);
                  setIsPersonFormOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Thêm thành viên</span>
              </button>

              <button
                onClick={() => setIsAdminDashboardOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Bảng quản trị</span>
              </button>

              <button
                onClick={() => logout()}
                title="Đăng xuất khỏi quyền Quản trị"
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* Viewer / Public State */
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
                <Eye className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-slate-600 dark:text-slate-400">Xem phả đồ (Chỉ đọc)</span>
              </div>

              <button
                onClick={() => setIsLoginModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Đăng nhập Quản trị</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Canvas Area or Admin Dashboard View */}
      {isAdminDashboardOpen ? (
        <AdminDashboard
          persons={persons}
          relationships={relationships}
          branches={branches}
          preferences={preferences}
          overrides={overrides}
          auditLogs={auditLogs}
          repository={repository}
          onRefreshData={loadData}
          onOpenPersonForm={p => {
            setEditingPerson(p || null);
            setIsPersonFormOpen(true);
          }}
          onOpenRelationshipForm={p => {
            setRelationshipSourcePersonId(p?.id || null);
            setIsRelationshipFormOpen(true);
          }}
          onOpenDuplicateModal={() => setIsDuplicateModalOpen(true)}
          onOpenImportExportModal={() => setIsImportExportModalOpen(true)}
          onClose={() => setIsAdminDashboardOpen(false)}
        />
      ) : (
        <div className="relative flex-1 flex flex-col overflow-hidden">
          {/* Floating Controls Bar */}
          <GraphControls
            branches={branches}
            selectedBranchId={selectedBranchId}
            onSelectBranch={setSelectedBranchId}
            viewMode={viewMode}
            onSelectViewMode={setViewMode}
            persons={persons}
            selectedPersonId={selectedPersonId}
            onSelectPerson={handleSelectPerson}
            referencePersonId={referencePersonId}
            onSelectReferencePerson={setReferencePersonId}
            rootPersonId={rootPersonId}
            onSelectRootPerson={handleSetAsRoot}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onFitView={handleFitView}
            isKinshipActive={!!kinshipSpeakerId}
            onOpenKinshipModal={() => {
              const activePersonId = selectedPersonId || referencePersonId || (persons[0]?.id ?? null);
              if (activePersonId) {
                if (kinshipSpeakerId === activePersonId) {
                  setKinshipSpeakerId(null);
                } else {
                  setKinshipSpeakerId(activePersonId);
                }
              }
            }}
          />

          {/* Interactive React Flow Canvas */}
          <div className="flex-1 w-full h-full relative">
            <FamilyGraphCanvas
              allPersons={persons}
              allRelationships={relationships}
              branches={branches}
              selectedBranchId={selectedBranchId}
              viewMode={viewMode}
              selectedPersonId={selectedPersonId}
              onSelectPerson={handleSelectPerson}
              referencePersonId={referencePersonId}
              rootPersonId={rootPersonId}
              kinshipSpeakerId={kinshipSpeakerId}
              kinshipLabelsMap={kinshipLabelsMap}
              onExitKinshipMode={() => setKinshipSpeakerId(null)}
              kinshipPathNodeIds={kinshipPathNodeIds}
              onInitReactFlow={setRfInstance}
            />
          </div>

          {/* Slide-in Profile Drawer */}
          <PersonProfileDrawer
            person={selectedPerson}
            graph={familyGraph}
            branches={branches}
            isOpen={isProfileOpen}
            onClose={() => setIsProfileOpen(false)}
            isAdmin={isAdmin}
            onOpenKinship={handleOpenKinship}
            onSelectPerson={handleSelectPerson}
            onSetViewMode={mode => setViewMode(mode)}
            onEditPerson={p => {
              setEditingPerson(p);
              setIsPersonFormOpen(true);
            }}
            onAddRelationship={p => {
              setRelationshipSourcePersonId(p.id);
              setIsRelationshipFormOpen(true);
            }}
            onSetAsReference={id => setReferencePersonId(id)}
            isReferencePerson={referencePersonId === selectedPersonId}
            onSetAsRoot={handleSetAsRoot}
            isRootPerson={rootPersonId === selectedPersonId}
          />
        </div>
      )}

      {/* Kinship Calculator Modal */}
      <KinshipCalculatorModal
        isOpen={isKinshipModalOpen}
        onClose={() => setIsKinshipModalOpen(false)}
        persons={persons}
        graph={familyGraph}
        preferences={preferences}
        overrides={overrides}
        initialPersonAId={referencePersonId}
        initialPersonBId={kinshipPersonBId || (persons.length > 1 ? persons[1].id : null)}
        onHighlightPath={pathNodes => setKinshipPathNodeIds(pathNodes)}
        onOpenOverrideModal={handleOpenOverride}
        isAdmin={isAdmin}
      />

      {/* Manual Override Modal */}
      <KinshipOverrideModal
        isOpen={isOverrideModalOpen}
        onClose={() => setIsOverrideModalOpen(false)}
        speakerId={overrideSpeakerId}
        targetId={overrideTargetId}
        persons={persons}
        existingOverride={overrides.find(o => o.speakerId === overrideSpeakerId && o.targetId === overrideTargetId)}
        onSaveOverride={handleSaveOverride}
        onDeleteOverride={handleDeleteOverride}
      />

      {/* Person Form Modal */}
      <PersonFormModal
        isOpen={isPersonFormOpen}
        onClose={() => setIsPersonFormOpen(false)}
        person={editingPerson}
        branches={branches}
        onSave={handleSavePerson}
      />

      {/* Relationship Form Modal */}
      <RelationshipFormModal
        isOpen={isRelationshipFormOpen}
        onClose={() => setIsRelationshipFormOpen(false)}
        persons={persons}
        initialFromPersonId={relationshipSourcePersonId}
        onSave={handleSaveRelationship}
      />

      {/* Duplicate Detector Modal */}
      <DuplicateDetectorModal
        isOpen={isDuplicateModalOpen}
        onClose={() => setIsDuplicateModalOpen(false)}
        candidates={duplicates}
        onMerge={async (survivingId, mergedId) => {
          const res = await repository.mergePersons(survivingId, mergedId);
          await loadData();
          return res;
        }}
        onRefresh={loadData}
      />

      {/* Data Import / Export Modal */}
      <DataImportExportModal
        isOpen={isImportExportModalOpen}
        onClose={() => setIsImportExportModalOpen(false)}
        repository={repository}
        onDataChanged={loadData}
      />

      {/* Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </div>
  );
}

export default function HomePage() {
  return (
    <AuthProvider>
      <FamilyAppContent />
    </AuthProvider>
  );
}
