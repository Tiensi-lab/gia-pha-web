import { describe, it, expect } from "vitest";
import { ElkGenealogyLayout } from "../elkLayout";
import { Person } from "../../../domain/models/person";
import { Relationship } from "../../../domain/models/relationship";

describe("ELK Layout Engine", () => {
  it("should lay out a simple genealogy graph without crashing", async () => {
    const p1: Person = {
      id: "p1",
      fullName: "Nguyễn Văn Cha",
      gender: "male",
      livingStatus: "living",
      branchIds: ["root"],
      visibility: { isPublic: true },
      createdAt: "",
      updatedAt: "",
      createdBy: "",
    };
    const p2: Person = {
      id: "p2",
      fullName: "Nguyễn Văn Con",
      gender: "male",
      livingStatus: "living",
      branchIds: ["root"],
      visibility: { isPublic: true },
      createdAt: "",
      updatedAt: "",
      createdBy: "",
    };
    const rel: Relationship = {
      id: "r1",
      type: "PARENT_CHILD",
      fromPersonId: "p1",
      toPersonId: "p2",
      createdAt: "",
      updatedAt: "",
      createdBy: "",
    };

    const { nodes, edges } = await ElkGenealogyLayout.layout([p1, p2], [rel]);
    expect(nodes.length).toBe(2);
    expect(edges.length).toBe(1);
    expect(nodes[0].position).toBeDefined();
    expect(nodes[1].position).toBeDefined();
  });
});
