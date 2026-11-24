import { describe, it, expect } from "vitest";
import { PersonSchema } from "../../../domain/models/person";
import { RelationshipSchema } from "../../../domain/models/relationship";
import { InMemoryRepository } from "../inMemoryRepository";

describe("Validation and Security Constraints", () => {
  it("should reject a person with empty fullName", () => {
    const invalidPerson = {
      id: "p-invalid",
      fullName: "",
      gender: "male",
      livingStatus: "living",
    };
    const result = PersonSchema.safeParse(invalidPerson);
    expect(result.success).toBe(false);
  });

  it("should reject a relationship where person is related to themselves", () => {
    const selfRel = {
      id: "rel-self",
      type: "PARENT_CHILD",
      fromPersonId: "p1",
      toPersonId: "p1",
    };
    const result = RelationshipSchema.safeParse(selfRel);
    expect(result.success).toBe(false);
  });

  it("should reject creating a genealogical cycle in the repository", async () => {
    const repo = new InMemoryRepository();
    const backup = await repo.exportBackup();
    backup.persons = [];
    backup.relationships = [];
    await repo.importBackup(backup, "replace");

    await repo.createPerson({ id: "p1", fullName: "Người 1", gender: "male", livingStatus: "living", branchIds: ["r"] });
    await repo.createPerson({ id: "p2", fullName: "Người 2", gender: "male", livingStatus: "living", branchIds: ["r"] });
    await repo.createPerson({ id: "p3", fullName: "Người 3", gender: "male", livingStatus: "living", branchIds: ["r"] });

    // p1 -> p2 (p1 is parent of p2)
    await repo.createRelationship({ id: "r1", type: "PARENT_CHILD", fromPersonId: "p1", toPersonId: "p2" });
    // p2 -> p3 (p2 is parent of p3)
    await repo.createRelationship({ id: "r2", type: "PARENT_CHILD", fromPersonId: "p2", toPersonId: "p3" });

    // Now try to make p3 the parent of p1 (cycle: p1 -> p2 -> p3 -> p1)
    await expect(
      repo.createRelationship({ id: "r3", type: "PARENT_CHILD", fromPersonId: "p3", toPersonId: "p1" })
    ).rejects.toThrow(/chu trình huyết thống/);
  });
});
