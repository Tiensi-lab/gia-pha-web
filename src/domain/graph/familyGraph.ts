import { Person } from "../models/person";
import { Relationship } from "../models/relationship";

export interface SiblingInfo {
  person: Person;
  type: "full" | "half_paternal" | "half_maternal" | "provisional";
  sharedParentIds: string[];
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
    const myParentIds = this.getParentIds(personId);
    const siblingsMap = new Map<string, SiblingInfo>();

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

        siblingsMap.set(siblingId, {
          person: sibling,
          type,
          sharedParentIds: shared,
        });
      }
    }

    // Add provisional siblings (when parents unknown)
    const provIds = this.getProvisionalSiblingIds(personId);
    for (const provId of provIds) {
      if (!siblingsMap.has(provId)) {
        const sibling = this.getPerson(provId);
        if (sibling) {
          siblingsMap.set(provId, {
            person: sibling,
            type: "provisional",
            sharedParentIds: [],
          });
        }
      }
    }

    return Array.from(siblingsMap.values());
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
