import { describe, it, expect } from "vitest";
import { InMemoryRepository } from "../inMemoryRepository";
import { GedcomExporter } from "../../gedcom/gedcomExporter";
import { GedcomParser } from "../../gedcom/gedcomParser";

describe("Data Export, Import and Backup", () => {
  it("should export full backup and restore it with identical entity counts", async () => {
    const repo = new InMemoryRepository();
    const originalBackup = await repo.exportBackup();
    expect(originalBackup.persons.length).toBeGreaterThan(0);
    expect(originalBackup.relationships.length).toBeGreaterThan(0);

    // Wipe repository
    const emptyBackup = { ...originalBackup, persons: [], relationships: [] };
    await repo.importBackup(emptyBackup, "replace");
    let personsNow = await repo.getAllPersons();
    expect(personsNow.length).toBe(0);

    // Restore original backup
    await repo.importBackup(originalBackup, "replace");
    personsNow = await repo.getAllPersons();
    expect(personsNow.length).toBe(originalBackup.persons.length);

    const relsNow = await repo.getAllRelationships();
    expect(relsNow.length).toBe(originalBackup.relationships.length);
  });

  it("should export to GEDCOM format and parse back correctly", async () => {
    const repo = new InMemoryRepository();
    const persons = await repo.getAllPersons();
    const relationships = await repo.getAllRelationships();

    const gedcomOutput = GedcomExporter.export(persons, relationships);
    expect(gedcomOutput).toContain("0 HEAD");
    expect(gedcomOutput).toContain("1 SOUR GIA_PHA_GIA_DINH");
    expect(gedcomOutput).toContain("0 TRLR");

    const parsed = GedcomParser.parse(gedcomOutput);
    expect(parsed.persons.length).toBe(persons.length);
    // At least one person's full name matches
    const firstPerson = persons[0];
    const parsedMatch = parsed.persons.find(p => p.id === firstPerson.id);
    expect(parsedMatch?.fullName).toBe(firstPerson.fullName);
  });
});
