import { Person } from "../../domain/models/person";
import { Relationship } from "../../domain/models/relationship";

export class GedcomExporter {
  public static export(persons: Person[], relationships: Relationship[]): string {
    const lines: string[] = [];

    // Header
    lines.push("0 HEAD");
    lines.push("1 SOUR GIA_PHA_GIA_DINH");
    lines.push("1 GEDC");
    lines.push("2 VERS 5.5.1");
    lines.push("2 FORM LINEAGE-LINKED");
    lines.push("1 CHAR UTF-8");

    // Individuals
    for (const p of persons) {
      lines.push(`0 @${p.id}@ INDI`);
      lines.push(`1 NAME ${p.fullName.replace(/\s+/g, " ")}`);
      if (p.gender === "male") lines.push("1 SEX M");
      else if (p.gender === "female") lines.push("1 SEX F");
      else lines.push("1 SEX U");

      if (p.birthDate) {
        lines.push("1 BIRT");
        if (p.birthDate.year) {
          const m = p.birthDate.month ? ` ${p.birthDate.month}` : "";
          const d = p.birthDate.day ? ` ${p.birthDate.day}` : "";
          lines.push(`2 DATE ${p.birthDate.year}${m}${d}`);
        }
        if (p.birthPlace) lines.push(`2 PLAC ${p.birthPlace}`);
      }

      if (p.livingStatus === "deceased" || p.deathDate) {
        lines.push("1 DEAT");
        if (p.deathDate?.year) {
          lines.push(`2 DATE ${p.deathDate.year}`);
        }
      }

      if (p.biography) {
        lines.push(`1 NOTE ${p.biography.replace(/\n/g, " ")}`);
      }
    }

    // Families (derived from relationships)
    // Group partnerships
    let famIndex = 1;
    const partnerships = relationships.filter(r => r.type === "PARTNERSHIP");

    for (const part of partnerships) {
      const famId = `FAM_${famIndex++}`;
      lines.push(`0 @${famId}@ FAM`);
      lines.push(`1 HUSB @${part.fromPersonId}@`);
      lines.push(`1 WIFE @${part.toPersonId}@`);

      // Find children where from or to is parent
      const parentRels = relationships.filter(
        r => r.type === "PARENT_CHILD" && (r.fromPersonId === part.fromPersonId || r.fromPersonId === part.toPersonId)
      );
      const childIds = Array.from(new Set(parentRels.map(r => r.toPersonId)));
      for (const cId of childIds) {
        lines.push(`1 CHIL @${cId}@`);
      }
    }

    lines.push("0 TRLR");
    return lines.join("\n");
  }
}
