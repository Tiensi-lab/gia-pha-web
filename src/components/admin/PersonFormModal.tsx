"use client";

import React, { useState, useEffect } from "react";
import { Person, PersonInput } from "../../domain/models/person";
import { Branch } from "../../domain/models/branch";
import { X, Save, AlertCircle } from "lucide-react";

interface PersonFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  person?: Person | null; // If null => create mode
  branches: Branch[];
  onSave: (input: PersonInput) => Promise<void>;
}

export const PersonFormModal: React.FC<PersonFormModalProps> = ({
  isOpen,
  onClose,
  person,
  branches,
  onSave,
}) => {
  const [fullName, setFullName] = useState("");
  const [preferredName, setPreferredName] = useState("");
  const [gender, setGender] = useState<Person["gender"]>("male");
  const [livingStatus, setLivingStatus] = useState<Person["livingStatus"]>("living");

  // Dates
  const [birthYear, setBirthYear] = useState<string>("");
  const [birthMonth, setBirthMonth] = useState<string>("");
  const [birthDay, setBirthDay] = useState<string>("");
  const [isBirthApprox, setIsBirthApprox] = useState<boolean>(false);

  const [deathYear, setDeathYear] = useState<string>("");
  const [deathMonth, setDeathMonth] = useState<string>("");
  const [deathDay, setDeathDay] = useState<string>("");

  // Ordinal
  const [siblingOrder, setSiblingOrder] = useState<string>("");
  const [familyOrdinalName, setFamilyOrdinalName] = useState<string>("");

  // Bio & branches
  const [hometown, setHometown] = useState("");
  const [biography, setBiography] = useState("");
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (person) {
      setFullName(person.fullName);
      setPreferredName(person.preferredName || "");
      setGender(person.gender);
      setLivingStatus(person.livingStatus);

      setBirthYear(person.birthDate?.year?.toString() || "");
      setBirthMonth(person.birthDate?.month?.toString() || "");
      setBirthDay(person.birthDate?.day?.toString() || "");
      setIsBirthApprox(!!person.birthDate?.isApproximate);

      setDeathYear(person.deathDate?.year?.toString() || "");
      setDeathMonth(person.deathDate?.month?.toString() || "");
      setDeathDay(person.deathDate?.day?.toString() || "");

      setSiblingOrder(person.siblingOrder?.toString() || "");
      setFamilyOrdinalName(person.familyOrdinalName || "");

      setHometown(person.hometown || "");
      setBiography(person.biography || "");
      setSelectedBranches(person.branchIds || []);
    } else {
      setFullName("");
      setPreferredName("");
      setGender("male");
      setLivingStatus("living");

      setBirthYear("");
      setBirthMonth("");
      setBirthDay("");
      setIsBirthApprox(false);

      setDeathYear("");
      setDeathMonth("");
      setDeathDay("");

      setSiblingOrder("");
      setFamilyOrdinalName("");

      setHometown("");
      setBiography("");
      setSelectedBranches(branches.length > 0 ? [branches[0].id] : ["branch-root"]);
    }
    setError(null);
  }, [person, isOpen, branches]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError("Vui lòng điền họ và tên");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const bYearNum = birthYear ? parseInt(birthYear, 10) : undefined;
      const bMonthNum = birthMonth ? parseInt(birthMonth, 10) : undefined;
      const bDayNum = birthDay ? parseInt(birthDay, 10) : undefined;

      const dYearNum = deathYear ? parseInt(deathYear, 10) : undefined;
      const dMonthNum = deathMonth ? parseInt(deathMonth, 10) : undefined;
      const dDayNum = deathDay ? parseInt(deathDay, 10) : undefined;

      const sOrderNum = siblingOrder ? parseInt(siblingOrder, 10) : undefined;

      const input: PersonInput = {
        id: person?.id || `person-${Date.now()}`,
        fullName: fullName.trim(),
        preferredName: preferredName.trim() || undefined,
        gender,
        livingStatus,
        birthDate: bYearNum
          ? {
              year: bYearNum,
              month: bMonthNum,
              day: bDayNum,
              isApproximate: isBirthApprox,
            }
          : undefined,
        deathDate: dYearNum
          ? {
              year: dYearNum,
              month: dMonthNum,
              day: dDayNum,
            }
          : undefined,
        siblingOrder: sOrderNum,
        familyOrdinalName: familyOrdinalName.trim() || undefined,
        hometown: hometown.trim() || undefined,
        biography: biography.trim() || undefined,
        branchIds: selectedBranches.length > 0 ? selectedBranches : ["branch-root"],
        visibility: person?.visibility || {
          isPublic: true,
          hideLivingDetails: true,
          hideNotes: true,
          hidePhoto: false,
        },
        createdBy: person?.createdBy || "admin",
      };

      await onSave(input);
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Đã có lỗi khi lưu hồ sơ";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleBranch = (bId: string) => {
    if (selectedBranches.includes(bId)) {
      setSelectedBranches(selectedBranches.filter(id => id !== bId));
    } else {
      setSelectedBranches([...selectedBranches, bId]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-amber-500/10 dark:bg-amber-950/30">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {person ? "Chỉnh sửa thông tin thành viên" : "Thêm thành viên mới"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Thông tin nhân khẩu học và vị trí thế thứ trong gia tộc
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-800 dark:text-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Họ và tên khai sinh: <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Ví dụ: Nguyễn Văn Ba"
                className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Tên thường gọi / Tên thân mật:
              </label>
              <input
                type="text"
                value={preferredName}
                onChange={e => setPreferredName(e.target.value)}
                placeholder="Ví dụ: Ba Hưng, Cậu Ba..."
                className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Gender & Living Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Giới tính:</label>
              <select
                value={gender}
                onChange={e => setGender(e.target.value as Person["gender"])}
                className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="male">Nam</option>
                <option value="female">Nữ</option>
                <option value="unknown">Chưa rõ</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Tình trạng:</label>
              <select
                value={livingStatus}
                onChange={e => setLivingStatus(e.target.value as Person["livingStatus"])}
                className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="living">Còn sống</option>
                <option value="deceased">Đã quy tiên / Đã mất</option>
                <option value="unknown">Chưa rõ</option>
              </select>
            </div>
          </div>

          {/* Southern Vietnamese Ordinal Rank */}
          <div className="p-3 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl space-y-2">
            <p className="font-bold text-amber-900 dark:text-amber-200">
              Thứ bậc & Danh xưng trong gia đình (Phong tục Nam Bộ):
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-slate-600 dark:text-slate-400">
                  Danh xưng thứ (Hai, Ba, Tư, Năm, Sáu, Bảy, Tám, Chín, Mười, Út):
                </label>
                <input
                  type="text"
                  value={familyOrdinalName}
                  onChange={e => setFamilyOrdinalName(e.target.value)}
                  placeholder="Ví dụ: Hai, Ba, Út..."
                  className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-600 dark:text-slate-400">
                  Thứ tự sinh (Số nguyên: 1 là con đầu lòng):
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={siblingOrder}
                  onChange={e => setSiblingOrder(e.target.value)}
                  placeholder="Ví dụ: 1"
                  className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Birth Date */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Ngày sinh:</label>
              <label className="flex items-center gap-1.5 text-slate-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isBirthApprox}
                  onChange={e => setIsBirthApprox(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span>Ước chừng / Khoảng chừng</span>
              </label>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="number"
                placeholder="Ngày (1-31)"
                min="1"
                max="31"
                value={birthDay}
                onChange={e => setBirthDay(e.target.value)}
                className="p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100"
              />
              <input
                type="number"
                placeholder="Tháng (1-12)"
                min="1"
                max="12"
                value={birthMonth}
                onChange={e => setBirthMonth(e.target.value)}
                className="p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100"
              />
              <input
                type="number"
                placeholder="Năm sinh (vd 1975)"
                min="1000"
                max="2100"
                value={birthYear}
                onChange={e => setBirthYear(e.target.value)}
                className="p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 font-semibold"
              />
            </div>
          </div>

          {/* Death Date (if deceased) */}
          {livingStatus === "deceased" && (
            <div className="space-y-1.5 p-3 bg-stone-50 dark:bg-slate-800/40 rounded-xl border border-stone-200 dark:border-slate-700">
              <label className="font-semibold text-stone-700 dark:text-stone-300">Ngày mất (Quy tiên):</label>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  placeholder="Ngày (1-31)"
                  min="1"
                  max="31"
                  value={deathDay}
                  onChange={e => setDeathDay(e.target.value)}
                  className="p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                />
                <input
                  type="number"
                  placeholder="Tháng (1-12)"
                  min="1"
                  max="12"
                  value={deathMonth}
                  onChange={e => setDeathMonth(e.target.value)}
                  className="p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                />
                <input
                  type="number"
                  placeholder="Năm mất (vd 2018)"
                  min="1000"
                  max="2100"
                  value={deathYear}
                  onChange={e => setDeathYear(e.target.value)}
                  className="p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold"
                />
              </div>
            </div>
          )}

          {/* Hometown */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300">Quê quán / Nơi cư ngụ:</label>
            <input
              type="text"
              value={hometown}
              onChange={e => setHometown(e.target.value)}
              placeholder="Ví dụ: Cai Lậy, Tiền Giang"
              className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100"
            />
          </div>

          {/* Branches */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700 dark:text-slate-300">Thuộc các nhánh gia phả:</label>
            <div className="flex flex-wrap gap-2">
              {branches.map(b => (
                <button
                  type="button"
                  key={b.id}
                  onClick={() => toggleBranch(b.id)}
                  className={`px-3 py-1 rounded-lg border text-xs font-medium transition-all ${
                    selectedBranches.includes(b.id)
                      ? "bg-amber-100 text-amber-900 border-amber-400 dark:bg-amber-950 dark:text-amber-200"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                  }`}
                >
                  {b.name}
                </button>
              ))}
            </div>
          </div>

          {/* Biography */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300">Tiểu sử & ghi chú:</label>
            <textarea
              rows={3}
              value={biography}
              onChange={e => setBiography(e.target.value)}
              placeholder="Ghi chép công đức, kỷ niệm, nghề nghiệp hoặc lưu ý đặc biệt..."
              className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
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
              <span>{isSubmitting ? "Đang lưu..." : "Lưu hồ sơ"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
