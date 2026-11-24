import { describe, it, expect } from "vitest";
import { ElkGenealogyLayout, calculateGenerations } from "../elkLayout";
import { Person } from "../../../domain/models/person";
import { Relationship } from "../../../domain/models/relationship";

describe("ELK Layout Engine", () => {
  const p1: Person = {
    id: "p1",
    fullName: "Trần Thị Tẩn",
    gender: "female",
    livingStatus: "deceased",
    branchIds: ["root"],
    visibility: { isPublic: true },
    createdAt: "",
    updatedAt: "",
    createdBy: "",
  };
  const p2: Person = {
    id: "p2",
    fullName: "Nguyễn Văn Trải",
    gender: "male",
    livingStatus: "living",
    branchIds: ["root"],
    visibility: { isPublic: true },
    createdAt: "",
    updatedAt: "",
    createdBy: "",
  };
  const p3: Person = {
    id: "p3",
    fullName: "Nguyễn Thị Thu Phương",
    gender: "female",
    livingStatus: "living",
    branchIds: ["root"],
    visibility: { isPublic: true },
    createdAt: "",
    updatedAt: "",
    createdBy: "",
  };
  const p4: Person = {
    id: "p4",
    fullName: "Nguyễn Tiến Sĩ",
    gender: "male",
    livingStatus: "living",
    branchIds: ["root"],
    visibility: { isPublic: true },
    createdAt: "",
    updatedAt: "",
    createdBy: "",
  };

  const rels: Relationship[] = [
    {
      id: "r1",
      type: "PARENT_CHILD",
      fromPersonId: "p1",
      toPersonId: "p2",
      createdAt: "",
      updatedAt: "",
      createdBy: "",
    },
    {
      id: "r2",
      type: "PARTNERSHIP",
      fromPersonId: "p2",
      toPersonId: "p3",
      createdAt: "",
      updatedAt: "",
      createdBy: "",
    },
    {
      id: "r3",
      type: "PARENT_CHILD",
      fromPersonId: "p2",
      toPersonId: "p4",
      createdAt: "",
      updatedAt: "",
      createdBy: "",
    },
    {
      id: "r4",
      type: "PARENT_CHILD",
      fromPersonId: "p3",
      toPersonId: "p4",
      createdAt: "",
      updatedAt: "",
      createdBy: "",
    },
  ];

  it("should calculate correct generations: grandmother=0, parents=1, child=2", () => {
    const gens = calculateGenerations([p1, p2, p3, p4], rels, "p1");
    expect(gens.get("p1")).toBe(0);
    expect(gens.get("p2")).toBe(1);
    expect(gens.get("p3")).toBe(1); // Spouse MUST be in the exact same generation
    expect(gens.get("p4")).toBe(2);
  });

  it("should place spouses on the EXACT same horizontal layer (Y coordinate)", async () => {
    const { nodes, edges } = await ElkGenealogyLayout.layout([p1, p2, p3, p4], rels, {
      rootPersonId: "p1",
    });

    const node1 = nodes.find(n => n.id === "p1")!;
    const node2 = nodes.find(n => n.id === "p2")!;
    const node3 = nodes.find(n => n.id === "p3")!;
    const node4 = nodes.find(n => n.id === "p4")!;

    expect(node1.position.y).toBeLessThan(node2.position.y);
    expect(node2.position.y).toBe(node3.position.y); // Husband & wife on same Y!
    expect(node4.position.y).toBeGreaterThan(node2.position.y);

    // Partnership edge should connect laterally
    const partnerEdge = edges.find(e => e.id === "r2")!;
    expect(partnerEdge).toBeDefined();
    expect(partnerEdge.label).toBe("Vợ chồng");
    expect(partnerEdge.style?.strokeDasharray).toBeUndefined(); // Solid line for active marriage
    expect(["left-target", "right-target"]).toContain(partnerEdge.targetHandle);
    expect(["left-source", "right-source"]).toContain(partnerEdge.sourceHandle);
  });
});
