import { PartialGenealogicalDate } from "../../domain/models/person";

export function formatGenealogicalDate(date?: PartialGenealogicalDate): string {
  if (!date) return "Chưa rõ";

  if (date.formattedRaw) {
    return date.formattedRaw;
  }

  const parts: string[] = [];
  if (date.day) {
    parts.push(date.day.toString().padStart(2, "0"));
  }
  if (date.month) {
    parts.push(date.month.toString().padStart(2, "0"));
  }
  if (date.year) {
    parts.push(date.year.toString());
  }

  let text = parts.join("/");
  if (!date.day && !date.month && date.year) {
    text = `Năm ${date.year}`;
  } else if (!date.day && date.month && date.year) {
    text = `Tháng ${date.month}/${date.year}`;
  }

  if (date.isApproximate) {
    text = `Khoảng ${text}`;
  }
  if (date.isLunar) {
    text += " (Âm lịch)";
    if (date.lunarDetails?.canChiYear) {
      text += ` - ${date.lunarDetails.canChiYear}`;
    }
  }

  return text || "Chưa rõ";
}

export function formatLifespan(
  birthDate?: PartialGenealogicalDate,
  deathDate?: PartialGenealogicalDate,
  livingStatus?: "living" | "deceased" | "unknown"
): string {
  const birthYear = birthDate?.year ? birthDate.year.toString() : "?";
  if (livingStatus === "living") {
    return `Sinh ${birthYear}`;
  }
  if (livingStatus === "deceased") {
    const deathYear = deathDate?.year ? deathDate.year.toString() : "?";
    return `${birthYear} - ${deathYear}`;
  }
  return birthDate?.year ? `Sinh ${birthDate.year}` : "Chưa rõ năm sinh";
}
