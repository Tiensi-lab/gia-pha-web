import { Person } from "../../domain/models/person";
import { Relationship } from "../../domain/models/relationship";

export interface GedcomParseResult {
  persons: Person[];
  relationships: Relationship[];
  unsupportedTags: string[];
}

export class GedcomParser {
  public static parse(content: string): GedcomParseResult {
    const lines = content.split(/\r?\n/);
    const persons: Person[] = [];
    const relationships: Relationship[] = [];
    const unsupportedTags: string[] = [];

    let currentIndi: Partial<Person> | null = null;
    let currentFam: { id: string; husb?: string; wife?: string; children: string[] } | null = null;
    let inBirt = false;
    let inDeat = false;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      const match = line.match(/^(\d+)(?:\s+(@[^@]+@))?\s+([A-Za-z0-9_]+)(?:\s+(.*))?$/);
      if (!match) continue;

      const level = parseInt(match[1], 10);
      const id = match[2]?.replace(/@/g, "");
      const tag = match[3];
      const value = match[4]?.trim() || "";

      if (level === 0) {
        if (currentIndi && currentIndi.id) {
          persons.push({
            id: currentIndi.id,
            fullName: currentIndi.fullName || "Chưa rõ tên",
            gender: currentIndi.gender || "unknown",
            livingStatus: currentIndi.livingStatus || "unknown",
            birthDate: currentIndi.birthDate,
            deathDate: currentIndi.deathDate,
            biography: currentIndi.biography,
            branchIds: ["branch-root"],
            visibility: { isPublic: true },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: "gedcom-import",
          });
          currentIndi = null;
        }

        if (currentFam) {
          // Process family partnerships and children
          if (currentFam.husb && currentFam.wife) {
            relationships.push({
              id: `rel-part-${currentFam.husb}-${currentFam.wife}`,
              type: "PARTNERSHIP",
              fromPersonId: currentFam.husb,
              toPersonId: currentFam.wife,
              partnershipData: { isCurrent: true, marriageType: "traditional" },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              createdBy: "gedcom-import",
            });
          }

          for (const cId of currentFam.children) {
            if (currentFam.husb) {
              relationships.push({
                id: `rel-pc-${currentFam.husb}-${cId}`,
                type: "PARENT_CHILD",
                fromPersonId: currentFam.husb,
                toPersonId: cId,
                parentChildData: { nature: "biological" },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                createdBy: "gedcom-import",
              });
            }
            if (currentFam.wife) {
              relationships.push({
                id: `rel-pc-${currentFam.wife}-${cId}`,
                type: "PARENT_CHILD",
                fromPersonId: currentFam.wife,
                toPersonId: cId,
                parentChildData: { nature: "biological" },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                createdBy: "gedcom-import",
              });
            }
          }
          currentFam = null;
        }

        if (tag === "INDI" || (value === "INDI" && id)) {
          currentIndi = { id: id || `p-${Date.now()}` };
          inBirt = false;
          inDeat = false;
        } else if (tag === "FAM" || (value === "FAM" && id)) {
          currentFam = { id: id || `f-${Date.now()}`, children: [] };
        }
      } else if (currentIndi) {
        if (tag === "NAME") {
          currentIndi.fullName = value.replace(/\//g, "").trim();
        } else if (tag === "SEX") {
          if (value === "M") currentIndi.gender = "male";
          else if (value === "F") currentIndi.gender = "female";
          else currentIndi.gender = "unknown";
        } else if (tag === "BIRT") {
          inBirt = true;
          inDeat = false;
        } else if (tag === "DEAT") {
          inDeat = true;
          inBirt = false;
          currentIndi.livingStatus = "deceased";
        } else if (tag === "DATE") {
          const yearMatch = value.match(/\b\d{4}\b/);
          const year = yearMatch ? parseInt(yearMatch[0], 10) : undefined;
          if (inBirt) {
            currentIndi.birthDate = { year, formattedRaw: value };
          } else if (inDeat) {
            currentIndi.deathDate = { year, formattedRaw: value };
          }
        } else if (tag === "NOTE") {
          currentIndi.biography = value;
        } else {
          if (!unsupportedTags.includes(tag)) unsupportedTags.push(tag);
        }
      } else if (currentFam) {
        if (tag === "HUSB") currentFam.husb = value.replace(/@/g, "");
        else if (tag === "WIFE") currentFam.wife = value.replace(/@/g, "");
        else if (tag === "CHIL") currentFam.children.push(value.replace(/@/g, ""));
        else {
          if (!unsupportedTags.includes(tag)) unsupportedTags.push(tag);
        }
      }
    }

    // Flush last individual or family
    if (currentIndi && currentIndi.id) {
      persons.push({
        id: currentIndi.id,
        fullName: currentIndi.fullName || "Chưa rõ tên",
        gender: currentIndi.gender || "unknown",
        livingStatus: currentIndi.livingStatus || "unknown",
        birthDate: currentIndi.birthDate,
        deathDate: currentIndi.deathDate,
        biography: currentIndi.biography,
        branchIds: ["branch-root"],
        visibility: { isPublic: true },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: "gedcom-import",
      });
    }

    return { persons, relationships, unsupportedTags };
  }
}
