import { describe, it, expect } from "vitest";
import { InMemoryRepository } from "../inMemoryRepository";
import { PersonInput } from "../../../domain/models/person";
import { RelationshipInput } from "../../../domain/models/relationship";

describe("Duplicate Detection and Person Merging", () => {
  it("should detect potential duplicate candidates based on name and birth year", async () => {
    const repo = new InMemoryRepository();
    // Clear and add test candidates
    const backup = await repo.exportBackup();
    backup.persons = [];
    backup.relationships = [];
    await repo.importBackup(backup, "replace");

    const p1: PersonInput = {
      id: "p1",
      fullName: "Nguyễn Văn Hùng",
      gender: "male",
      livingStatus: "living",
      birthDate: { year: 1980 },
      hometown: "Bến Tre",
      branchIds: ["root"],
    };

    const p2: PersonInput = {
      id: "p2",
      fullName: "Nguyễn Văn Hùng",
      gender: "male",
      livingStatus: "living",
      birthDate: { year: 1980 },
      hometown: "Bến Tre",
      branchIds: ["root"],
    };

    await repo.createPerson(p1);
    await repo.createPerson(p2);

    const candidates = await repo.detectDuplicates();
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0].matchScore).toBeGreaterThanOrEqual(70);
    expect(candidates[0].reasons).toContain("Họ tên trùng khớp hoàn toàn");
  });

  it("should merge two person records atomically, transferring relationships", async () => {
    const repo = new InMemoryRepository();
    const backup = await repo.exportBackup();
    backup.persons = [];
    backup.relationships = [];
    await repo.importBackup(backup, "replace");

    // Parent
    await repo.createPerson({
      id: "parent",
      fullName: "Nguyễn Văn Cha",
      gender: "male",
      livingStatus: "living",
      branchIds: ["root"],
    });

    // Canonical child
    await repo.createPerson({
      id: "child-canonical",
      fullName: "Nguyễn Văn Con (Chính)",
      gender: "male",
      livingStatus: "living",
      branchIds: ["branch-1"],
    });

    // Duplicate child
    await repo.createPerson({
      id: "child-duplicate",
      fullName: "Nguyễn Văn Con (Trùng)",
      gender: "male",
      livingStatus: "living",
      biography: "Ghi chú từ hồ sơ trùng",
      branchIds: ["branch-2"],
    });

    // Grandchild linked to duplicate
    await repo.createPerson({
      id: "grandchild",
      fullName: "Nguyễn Văn Cháu",
      gender: "male",
      livingStatus: "living",
      branchIds: ["root"],
    });

    // Rel 1: parent -> child-canonical
    await repo.createRelationship({
      id: "r1",
      type: "PARENT_CHILD",
      fromPersonId: "parent",
      toPersonId: "child-canonical",
    });

    // Rel 2: child-duplicate -> grandchild
    await repo.createRelationship({
      id: "r2",
      type: "PARENT_CHILD",
      fromPersonId: "child-duplicate",
      toPersonId: "grandchild",
    });

    // Merge duplicate into canonical
    const result = await repo.mergePersons("child-canonical", "child-duplicate");
    expect(result.survivingPersonId).toBe("child-canonical");
    expect(result.mergedPersonId).toBe("child-duplicate");

    // Duplicate person should be gone
    const duplicate = await repo.getPerson("child-duplicate");
    expect(duplicate).toBeNull();

    // Canonical person should have merged biography and merged branchIds
    const surviving = await repo.getPerson("child-canonical");
    expect(surviving?.biography).toContain("Ghi chú từ hồ sơ trùng");
    expect(surviving?.branchIds).toContain("branch-1");
    expect(surviving?.branchIds).toContain("branch-2");

    // Relationship r2 should now point from child-canonical to grandchild
    const updatedR2 = await repo.getRelationship("r2");
    expect(updatedR2?.fromPersonId).toBe("child-canonical");
    expect(updatedR2?.toPersonId).toBe("grandchild");

    // Graph connectivity: child-canonical now has parent 'parent' and child 'grandchild'
    const graph = await repo.getGraph();
    expect(graph.getParentIds("child-canonical")).toContain("parent");
    expect(graph.getChildIds("child-canonical")).toContain("grandchild");
  });
});
