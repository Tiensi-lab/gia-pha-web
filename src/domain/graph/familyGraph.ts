import { Person } from "../models/person";
import { Relationship } from "../models/relationship";

export interface SiblingInfo {
  person: Person;
  type: "full" | "half_paternal" | "half_maternal" | "provisional";
  sharedParentIds: string[];
  role: "elder_brother" | "elder_sister" | "younger_brother" | "younger_sister" | "sibling";
  roleDescription: string;
  seniority: "senior" | "junior" | "equal" | "unknown";
}

export interface CousinInfo {
  person: Person;
  lineage: "paternal" | "maternal";
  parentOfMe: Person;
  parentOfCousin: Person;
  parentRelation: string;
  role: "elder_male_cousin" | "elder_female_cousin" | "younger_male_cousin" | "younger_female_cousin" | "cousin";
  roleTitle: string;
  seniorityReason: string;
}

/**
 * Compare chronological or birth-order seniority between two persons.
 * "senior": a is older/higher-order than b.
 * "junior": a is younger/lower-order than b.
 */
export function comparePersonSeniority(
  a: Person,
  b: Person
): "senior" | "junior" | "equal" | "unknown" {
  // 1. By sibling order (1=Hai, 2=Ba...)
  if (a.siblingOrder !== undefined && b.siblingOrder !== undefined) {
    if (a.siblingOrder < b.siblingOrder) return "senior";
    if (a.siblingOrder > b.siblingOrder) return "junior";
  }

  // 2. By birth date
  if (a.birthDate?.year && b.birthDate?.year) {
    if (a.birthDate.year < b.birthDate.year) return "senior";
    if (a.birthDate.year > b.birthDate.year) return "junior";
    if (a.birthDate.month && b.birthDate.month) {
      if (a.birthDate.month < b.birthDate.month) return "senior";
      if (a.birthDate.month > b.birthDate.month) return "junior";
      if (a.birthDate.day && b.birthDate.day) {
        if (a.birthDate.day < b.birthDate.day) return "senior";
        if (a.birthDate.day > b.birthDate.day) return "junior";
      }
    }
    return "equal";
  }

  return "unknown";
}

export class FamilyGraph {
  private persons: Map<string, Person> = new Map();
  private relationships: Map<string, Relationship> = new Map();

  // Fast indexing
  private parentToChildren: Map<string, Set<string>> = new Map();
  private childToParents: Map<string, Set<string>> = new Map();
  private spouseMap: Map<string, Set<string>> = new Map();
  private provisionalSiblingMap: Map<string, Set<string>> = new Map();

  constructor(persons: Person[] = [], relationships: Relationship[] = []) {
    for (const p of persons) {
      this.addPerson(p);
    }
    for (const r of relationships) {
      this.addRelationship(r);
    }
  }

  public addPerson(person: Person): void {
    this.persons.set(person.id, { ...person });
    if (!this.parentToChildren.has(person.id)) this.parentToChildren.set(person.id, new Set());
    if (!this.childToParents.has(person.id)) this.childToParents.set(person.id, new Set());
    if (!this.spouseMap.has(person.id)) this.spouseMap.set(person.id, new Set());
    if (!this.provisionalSiblingMap.has(person.id)) this.provisionalSiblingMap.set(person.id, new Set());
  }

  public getPerson(id: string): Person | undefined {
    return this.persons.get(id);
  }

  public getAllPersons(): Person[] {
    return Array.from(this.persons.values());
  }

  public removePerson(id: string): void {
    this.persons.delete(id);
    this.parentToChildren.delete(id);
    this.childToParents.delete(id);
    this.spouseMap.delete(id);
    this.provisionalSiblingMap.delete(id);

    // Clean up relationships referencing this person
    const toRemove: string[] = [];
    for (const [relId, rel] of this.relationships) {
      if (rel.fromPersonId === id || rel.toPersonId === id) {
        toRemove.push(relId);
      }
    }
    for (const relId of toRemove) {
      this.removeRelationship(relId);
    }
  }

  public addRelationship(rel: Relationship): void {
    this.relationships.set(rel.id, { ...rel });
    const from = rel.fromPersonId;
    const to = rel.toPersonId;

    if (!this.parentToChildren.has(from)) this.parentToChildren.set(from, new Set());
    if (!this.childToParents.has(to)) this.childToParents.set(to, new Set());
    if (!this.spouseMap.has(from)) this.spouseMap.set(from, new Set());
    if (!this.spouseMap.has(to)) this.spouseMap.set(to, new Set());
    if (!this.provisionalSiblingMap.has(from)) this.provisionalSiblingMap.set(from, new Set());
    if (!this.provisionalSiblingMap.has(to)) this.provisionalSiblingMap.set(to, new Set());

    if (rel.type === "PARENT_CHILD") {
      this.parentToChildren.get(from)!.add(to);
      this.childToParents.get(to)!.add(from);
    } else if (rel.type === "PARTNERSHIP") {
      this.spouseMap.get(from)!.add(to);
      this.spouseMap.get(to)!.add(from);
    } else if (rel.type === "PROVISIONAL_SIBLING") {
      this.provisionalSiblingMap.get(from)!.add(to);
      this.provisionalSiblingMap.get(to)!.add(from);
    }
  }

  public getRelationship(id: string): Relationship | undefined {
    return this.relationships.get(id);
  }

  public getAllRelationships(): Relationship[] {
    return Array.from(this.relationships.values());
  }

  public removeRelationship(id: string): void {
    const rel = this.relationships.get(id);
    if (!rel) return;
    this.relationships.delete(id);

    const from = rel.fromPersonId;
    const to = rel.toPersonId;

    if (rel.type === "PARENT_CHILD") {
      this.parentToChildren.get(from)?.delete(to);
      this.childToParents.get(to)?.delete(from);
    } else if (rel.type === "PARTNERSHIP") {
      this.spouseMap.get(from)?.delete(to);
      this.spouseMap.get(to)?.delete(from);
    } else if (rel.type === "PROVISIONAL_SIBLING") {
      this.provisionalSiblingMap.get(from)?.delete(to);
      this.provisionalSiblingMap.get(to)?.delete(from);
    }
  }

  public getParentIds(childId: string): string[] {
    const set = this.childToParents.get(childId);
    return set ? Array.from(set) : [];
  }

  public getParents(childId: string): Person[] {
    return this.getParentIds(childId)
      .map(id => this.persons.get(id))
      .filter((p): p is Person => !!p);
  }

  public getChildIds(parentId: string): string[] {
    const set = this.parentToChildren.get(parentId);
    return set ? Array.from(set) : [];
  }

  public getChildren(parentId: string): Person[] {
    return this.getChildIds(parentId)
      .map(id => this.persons.get(id))
      .filter((p): p is Person => !!p);
  }

  public getSpouseIds(personId: string): string[] {
    const set = this.spouseMap.get(personId);
    return set ? Array.from(set) : [];
  }

  public getSpouses(personId: string): Person[] {
    return this.getSpouseIds(personId)
      .map(id => this.persons.get(id))
      .filter((p): p is Person => !!p);
  }

  public getProvisionalSiblingIds(personId: string): string[] {
    const set = this.provisionalSiblingMap.get(personId);
    return set ? Array.from(set) : [];
  }

  public getSiblings(personId: string): SiblingInfo[] {
    const me = this.getPerson(personId);
    const myParentIds = this.getParentIds(personId);
    const siblingsMap = new Map<string, SiblingInfo>();

    const calculateSiblingRole = (
      sibling: Person,
      type: SiblingInfo["type"]
    ): {
      role: SiblingInfo["role"];
      roleDescription: string;
      seniority: SiblingInfo["seniority"];
    } => {
      if (!me) {
        return { role: "sibling", roleDescription: "Anh/Chị/Em", seniority: "unknown" };
      }

      // Seniority: is sibling older ("senior") or younger ("junior") than me?
      const seniority = comparePersonSeniority(sibling, me);
      const isMale = sibling.gender === "male";
      const isFemale = sibling.gender === "female";

      const suffix =
        type === "full"
          ? "ruột"
          : type === "half_paternal"
          ? "cùng cha"
          : type === "half_maternal"
          ? "cùng mẹ"
          : "(lâm thời)";

      if (seniority === "senior") {
        if (isMale) {
          return { role: "elder_brother", roleDescription: `Anh ${suffix}`, seniority };
        } else if (isFemale) {
          return { role: "elder_sister", roleDescription: `Chị ${suffix}`, seniority };
        } else {
          return { role: "sibling", roleDescription: `Anh/Chị ${suffix}`, seniority };
        }
      } else if (seniority === "junior") {
        if (isMale) {
          return { role: "younger_brother", roleDescription: `Em trai ${suffix}`, seniority };
        } else if (isFemale) {
          return { role: "younger_sister", roleDescription: `Em gái ${suffix}`, seniority };
        } else {
          return { role: "sibling", roleDescription: `Em ${suffix}`, seniority };
        }
      }

      return {
        role: "sibling",
        roleDescription: isMale ? `Anh/Em trai ${suffix}` : isFemale ? `Chị/Em gái ${suffix}` : `Anh/Chị/Em ${suffix}`,
        seniority: "unknown",
      };
    };

    for (const parentId of myParentIds) {
      const coChildren = this.getChildIds(parentId);
      const parent = this.getPerson(parentId);
      const isFather = parent?.gender === "male";
      const isMother = parent?.gender === "female";

      for (const siblingId of coChildren) {
        if (siblingId === personId) continue;
        const sibling = this.getPerson(siblingId);
        if (!sibling) continue;

        const otherParentIds = this.getParentIds(siblingId);
        const shared = myParentIds.filter(pId => otherParentIds.includes(pId));

        let type: SiblingInfo["type"] = "full";
        if (myParentIds.length > 0 && otherParentIds.length > 0) {
          if (shared.length >= 2 || (myParentIds.length === 1 && otherParentIds.length === 1 && shared.length === 1)) {
            type = "full";
          } else if (isFather) {
            type = "half_paternal";
          } else if (isMother) {
            type = "half_maternal";
          } else {
            type = "half_paternal";
          }
        }

        const roleInfo = calculateSiblingRole(sibling, type);

        siblingsMap.set(siblingId, {
          person: sibling,
          type,
          sharedParentIds: shared,
          ...roleInfo,
        });
      }
    }

    // Add provisional siblings (when parents unknown)
    const provIds = this.getProvisionalSiblingIds(personId);
    for (const provId of provIds) {
      if (!siblingsMap.has(provId)) {
        const sibling = this.getPerson(provId);
        if (sibling) {
          const roleInfo = calculateSiblingRole(sibling, "provisional");
          siblingsMap.set(provId, {
            person: sibling,
            type: "provisional",
            sharedParentIds: [],
            ...roleInfo,
          });
        }
      }
    }

    // Sort siblings by birth order / birth date (elders first)
    return Array.from(siblingsMap.values()).sort((a, b) => {
      const cmp = comparePersonSeniority(a.person, b.person);
      if (cmp === "senior") return -1;
      if (cmp === "junior") return 1;
      return (a.person.birthDate?.year ?? 9999) - (b.person.birthDate?.year ?? 9999);
    });
  }

  /**
   * Automatically infer all First Cousins (Anh chị em họ) based on parent-sibling connections.
   * Accurately determines whether each cousin is Anh họ / Chị họ / Em họ following Southern customs.
   */
  public getCousins(personId: string): CousinInfo[] {
    const me = this.getPerson(personId);
    if (!me) return [];

    const myParents = this.getParents(personId);
    const cousinsMap = new Map<string, CousinInfo>();

    for (const parent of myParents) {
      const isFather = parent.gender === "male";
      const lineage: CousinInfo["lineage"] = isFather ? "paternal" : "maternal";
      const parentSiblings = this.getSiblings(parent.id);

      for (const pSib of parentSiblings) {
        const uncleAunt = pSib.person;
        // Determine whether this uncle/aunt is senior (elder) or junior (younger) compared to my parent
        const parentSeniority = comparePersonSeniority(uncleAunt, parent);

        let parentRelation = "";
        const ordinal = uncleAunt.familyOrdinalName ? ` ${uncleAunt.familyOrdinalName}` : "";
        if (isFather) {
          if (uncleAunt.gender === "male") {
            parentRelation = parentSeniority === "senior" ? `Bác${ordinal}` : `Chú${ordinal}`;
          } else {
            parentRelation = `Cô${ordinal}`;
          }
        } else {
          if (uncleAunt.gender === "male") {
            parentRelation = `Cậu${ordinal}`;
          } else {
            parentRelation = `Dì${ordinal}`;
          }
        }

        const cousinPersons = this.getChildren(uncleAunt.id);
        for (const cousin of cousinPersons) {
          if (cousin.id === personId) continue;
          if (cousinsMap.has(cousin.id)) continue;

          // Priority 1: Branch seniority of parents ("Bé bằng củ khoai, cứ vai mà gọi")
          let isElder = false;
          let isJunior = false;
          let seniorityReason = "";

          if (parentSeniority === "senior") {
            isElder = true;
            seniorityReason = `Con của ${parentRelation} (Cành trên)`;
          } else if (parentSeniority === "junior") {
            isJunior = true;
            seniorityReason = `Con của ${parentRelation} (Cành dưới)`;
          } else {
            // Priority 2: Fall back to direct age comparison between cousins
            const directSeniority = comparePersonSeniority(cousin, me);
            if (directSeniority === "senior") {
              isElder = true;
              seniorityReason = "Lớn tuổi hơn";
            } else if (directSeniority === "junior") {
              isJunior = true;
              seniorityReason = "Nhỏ tuổi hơn";
            } else {
              seniorityReason = `Con của ${parentRelation}`;
            }
          }

          let role: CousinInfo["role"] = "cousin";
          let roleTitle = "Anh/Chị/Em họ";
          if (isElder) {
            if (cousin.gender === "male") {
              role = "elder_male_cousin";
              roleTitle = "Anh họ";
            } else if (cousin.gender === "female") {
              role = "elder_female_cousin";
              roleTitle = "Chị họ";
            } else {
              roleTitle = "Anh/Chị họ";
            }
          } else if (isJunior) {
            if (cousin.gender === "male") {
              role = "younger_male_cousin";
              roleTitle = "Em họ (trai)";
            } else if (cousin.gender === "female") {
              role = "younger_female_cousin";
              roleTitle = "Em họ (gái)";
            } else {
              roleTitle = "Em họ";
            }
          }

          cousinsMap.set(cousin.id, {
            person: cousin,
            lineage,
            parentOfMe: parent,
            parentOfCousin: uncleAunt,
            parentRelation,
            role,
            roleTitle,
            seniorityReason,
          });
        }
      }
    }

    // Sort cousins: Paternal first, elders first, then birth year
    return Array.from(cousinsMap.values()).sort((a, b) => {
      if (a.lineage !== b.lineage) return a.lineage === "paternal" ? -1 : 1;
      if (a.role.startsWith("elder") && b.role.startsWith("younger")) return -1;
      if (a.role.startsWith("younger") && b.role.startsWith("elder")) return 1;
      return (a.person.birthDate?.year ?? 9999) - (b.person.birthDate?.year ?? 9999);
    });
  }

  public getAncestors(personId: string, maxDepth: number = 100): Set<string> {
    const ancestors = new Set<string>();
    const queue: { id: string; depth: number }[] = [{ id: personId, depth: 0 }];
    const visited = new Set<string>([personId]);

    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;
      if (depth >= maxDepth) continue;

      const parentIds = this.getParentIds(id);
      for (const parentId of parentIds) {
        if (!visited.has(parentId)) {
          visited.add(parentId);
          ancestors.add(parentId);
          queue.push({ id: parentId, depth: depth + 1 });
        }
      }
    }

    return ancestors;
  }

  public getDescendants(personId: string, maxDepth: number = 100): Set<string> {
    const descendants = new Set<string>();
    const queue: { id: string; depth: number }[] = [{ id: personId, depth: 0 }];
    const visited = new Set<string>([personId]);

    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;
      if (depth >= maxDepth) continue;

      const childIds = this.getChildIds(id);
      for (const childId of childIds) {
        if (!visited.has(childId)) {
          visited.add(childId);
          descendants.add(childId);
          queue.push({ id: childId, depth: depth + 1 });
        }
      }
    }

    return descendants;
  }

  public clone(): FamilyGraph {
    return new FamilyGraph(this.getAllPersons(), this.getAllRelationships());
  }
}
