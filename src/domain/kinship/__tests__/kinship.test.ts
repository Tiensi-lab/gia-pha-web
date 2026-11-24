import { describe, it, expect } from "vitest";
import { FamilyGraph } from "../../graph/familyGraph";
import { GraphCycleDetector } from "../../graph/graphCycleDetector";
import { KinshipInference } from "../kinshipInference";
import { Person } from "../../models/person";
import { Relationship } from "../../models/relationship";
import { KinshipOverride, defaultSouthernNamingPreferences } from "../../models/naming";

describe("Kinship and Graph Engine Tests", () => {
  const createPerson = (id: string, name: string, gender: Person["gender"], extra: Partial<Person> = {}): Person => ({
    id,
    fullName: name,
    gender,
    livingStatus: "living",
    branchIds: ["main"],
    visibility: { isPublic: true },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: "test",
    ...extra,
  });

  const createRel = (
    id: string,
    type: Relationship["type"],
    fromPersonId: string,
    toPersonId: string,
    extra: Partial<Relationship> = {}
  ): Relationship => ({
    id,
    type,
    fromPersonId,
    toPersonId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: "test",
    ...extra,
  });

  it("1. Direct parent-child relation: Father and Son", () => {
    const father = createPerson("p1", "Nguyễn Văn Ba", "male");
    const son = createPerson("p2", "Nguyễn Văn Con", "male");
    const rel = createRel("r1", "PARENT_CHILD", "p1", "p2");

    const graph = new FamilyGraph([father, son], [rel]);
    const res = KinshipInference.inferKinship("p2", "p1", graph);

    expect(res.relationshipType).toBe("FATHER");
    expect(res.aCallsB).toBe("Ba");
    expect(res.bCallsA).toBe("Con");
    expect(res.aSelfReference).toBe("Con");
    expect(res.bSelfReference).toBe("Ba");
    expect(res.generationDifference).toBe(-1);
  });

  it("2. Paternal grandparents: Paternal grandfather and grandchild", () => {
    const gf = createPerson("gf", "Nguyễn Văn Nội", "male");
    const f = createPerson("f", "Nguyễn Văn Cha", "male");
    const child = createPerson("c", "Nguyễn Văn Cháu", "male");

    const r1 = createRel("r1", "PARENT_CHILD", "gf", "f");
    const r2 = createRel("r2", "PARENT_CHILD", "f", "c");

    const graph = new FamilyGraph([gf, f, child], [r1, r2]);
    const res = KinshipInference.inferKinship("c", "gf", graph);

    expect(res.relationshipType).toBe("PATERNAL_GRANDFATHER");
    expect(res.aCallsB).toBe("Ông nội");
    expect(res.lineage).toBe("paternal");
  });

  it("3. Maternal grandparents: Maternal grandmother and grandchild", () => {
    const gm = createPerson("gm", "Trần Thị Ngoại", "female");
    const m = createPerson("m", "Trần Thị Mẹ", "female");
    const child = createPerson("c", "Lê Văn Cháu", "male");

    const r1 = createRel("r1", "PARENT_CHILD", "gm", "m");
    const r2 = createRel("r2", "PARENT_CHILD", "m", "c");

    const graph = new FamilyGraph([gm, m, child], [r1, r2]);
    const res = KinshipInference.inferKinship("c", "gm", graph);

    expect(res.relationshipType).toBe("MATERNAL_GRANDMOTHER");
    expect(res.aCallsB).toBe("Bà ngoại");
    expect(res.lineage).toBe("maternal");
  });

  it("4. Great-grandparents (Ông cố)", () => {
    const ggf = createPerson("ggf", "Nguyễn Văn Cố", "male");
    const gf = createPerson("gf", "Nguyễn Văn Nội", "male");
    const f = createPerson("f", "Nguyễn Văn Cha", "male");
    const child = createPerson("c", "Nguyễn Văn Chắt", "male");

    const r1 = createRel("r1", "PARENT_CHILD", "ggf", "gf");
    const r2 = createRel("r2", "PARENT_CHILD", "gf", "f");
    const r3 = createRel("r3", "PARENT_CHILD", "f", "c");

    const graph = new FamilyGraph([ggf, gf, f, child], [r1, r2, r3]);
    const res = KinshipInference.inferKinship("c", "ggf", graph);

    expect(res.relationshipType).toBe("PATERNAL_GREAT_GRANDPARENT");
    expect(res.aCallsB).toBe("Ông cố");
    expect(res.bCallsA).toBe("Chắt");
  });

  it("5. Paternal uncles and aunts: Bác (elder brother of father) & Chú (younger brother) & Cô (sister)", () => {
    const gf = createPerson("gf", "Ông Nội", "male");
    const elderUncle = createPerson("u1", "Nguyễn Văn Bác", "male", { siblingOrder: 1, familyOrdinalName: "Hai" });
    const father = createPerson("f", "Nguyễn Văn Ba", "male", { siblingOrder: 2, familyOrdinalName: "Ba" });
    const youngerUncle = createPerson("u2", "Nguyễn Văn Chú", "male", { siblingOrder: 3, familyOrdinalName: "Tư" });
    const aunt = createPerson("a1", "Nguyễn Thị Cô", "female", { siblingOrder: 4, familyOrdinalName: "Năm" });
    const child = createPerson("c", "Nguyễn Văn Cháu", "male");

    const rels = [
      createRel("r1", "PARENT_CHILD", "gf", "u1"),
      createRel("r2", "PARENT_CHILD", "gf", "f"),
      createRel("r3", "PARENT_CHILD", "gf", "u2"),
      createRel("r4", "PARENT_CHILD", "gf", "a1"),
      createRel("r5", "PARENT_CHILD", "f", "c"),
    ];

    const graph = new FamilyGraph([gf, elderUncle, father, youngerUncle, aunt, child], rels);

    const resBác = KinshipInference.inferKinship("c", "u1", graph);
    expect(resBác.relationshipType).toBe("PATERNAL_ELDER_UNCLE");
    expect(resBác.aCallsB).toContain("Bác");

    const resChú = KinshipInference.inferKinship("c", "u2", graph);
    expect(resChú.relationshipType).toBe("PATERNAL_YOUNGER_UNCLE");
    expect(resChú.aCallsB).toContain("Chú");

    const resCô = KinshipInference.inferKinship("c", "a1", graph);
    expect(resCô.relationshipType).toBe("PATERNAL_AUNT");
    expect(resCô.aCallsB).toContain("Cô");
  });

  it("6. Maternal uncles and aunts: Cậu (brother of mother) & Dì (sister of mother)", () => {
    const gm = createPerson("gm", "Bà Ngoại", "female");
    const mother = createPerson("m", "Trần Thị Mẹ", "female", { familyOrdinalName: "Ba" });
    const uncle = createPerson("u", "Trần Văn Cậu", "male", { familyOrdinalName: "Tư" });
    const aunt = createPerson("d", "Trần Thị Dì", "female", { familyOrdinalName: "Hai" });
    const child = createPerson("c", "Nguyễn Văn Con", "male");

    const rels = [
      createRel("r1", "PARENT_CHILD", "gm", "m"),
      createRel("r2", "PARENT_CHILD", "gm", "u"),
      createRel("r3", "PARENT_CHILD", "gm", "d"),
      createRel("r4", "PARENT_CHILD", "m", "c"),
    ];

    const graph = new FamilyGraph([gm, mother, uncle, aunt, child], rels);

    const resCậu = KinshipInference.inferKinship("c", "u", graph);
    expect(resCậu.relationshipType).toBe("MATERNAL_UNCLE");
    expect(resCậu.aCallsB).toContain("Cậu");

    const resDì = KinshipInference.inferKinship("c", "d", graph);
    expect(resDì.relationshipType).toBe("MATERNAL_AUNT");
    expect(resDì.aCallsB).toContain("Dì");
  });

  it("7. First cousins: Branch seniority prioritization", () => {
    const gf = createPerson("gf", "Cụ Tổ", "male");
    // Elder branch father (Bác Hai)
    const elderFather = createPerson("f_elder", "Nguyễn Văn Bác", "male", { siblingOrder: 1, familyOrdinalName: "Hai" });
    // Younger branch father (Ba)
    const youngerFather = createPerson("f_younger", "Nguyễn Văn Ba", "male", { siblingOrder: 2, familyOrdinalName: "Ba" });

    // Child of elder branch is younger in chronological age (born 2010)
    const cousinA = createPerson("cA", "Nguyễn Văn Anh Họ", "male", { birthDate: { year: 2010 } });
    // Child of younger branch is older in chronological age (born 2000)
    const cousinB = createPerson("cB", "Nguyễn Văn Em Họ", "male", { birthDate: { year: 2000 } });

    const rels = [
      createRel("r1", "PARENT_CHILD", "gf", "f_elder"),
      createRel("r2", "PARENT_CHILD", "gf", "f_younger"),
      createRel("r3", "PARENT_CHILD", "f_elder", "cA"),
      createRel("r4", "PARENT_CHILD", "f_younger", "cB"),
    ];

    const graph = new FamilyGraph([gf, elderFather, youngerFather, cousinA, cousinB], rels);

    // cB (younger branch) calls cA (senior branch) -> "Anh họ", despite cB being 10 years older!
    const res = KinshipInference.inferKinship("cB", "cA", graph, { prioritizeBranchSeniority: true });
    expect(res.relationshipType).toBe("FIRST_COUSIN");
    expect(res.aCallsB).toContain("Anh họ");
    expect(res.bCallsA).toContain("Em họ");
  });

  it("8. Graph cycle rejection: Child cannot become ancestor of parent", () => {
    const p1 = createPerson("p1", "Người Cha", "male");
    const p2 = createPerson("p2", "Người Con", "male");
    const r1 = createRel("r1", "PARENT_CHILD", "p1", "p2");

    const graph = new FamilyGraph([p1, p2], [r1]);

    // Attempting to add p2 as parent of p1
    const check = GraphCycleDetector.canAddRelationship(graph, {
      type: "PARENT_CHILD",
      fromPersonId: "p2",
      toPersonId: "p1",
    });

    expect(check.isValid).toBe(false);
    expect(check.error).toContain("chu trình huyết thống");
  });

  it("9. Duplicate relationship rejection", () => {
    const p1 = createPerson("p1", "Người Cha", "male");
    const p2 = createPerson("p2", "Người Con", "male");
    const r1 = createRel("r1", "PARENT_CHILD", "p1", "p2");

    const graph = new FamilyGraph([p1, p2], [r1]);

    const check = GraphCycleDetector.canAddRelationship(graph, {
      type: "PARENT_CHILD",
      fromPersonId: "p1",
      toPersonId: "p2",
    });

    expect(check.isValid).toBe(false);
    expect(check.error).toContain("đã tồn tại");
  });

  it("10. Siblings with one shared parent (Half siblings)", () => {
    const father = createPerson("f", "Nguyễn Văn Cha", "male");
    const mother1 = createPerson("m1", "Trần Thị Vợ Cả", "female");
    const mother2 = createPerson("m2", "Lê Thị Vợ Hai", "female");
    const child1 = createPerson("c1", "Nguyễn Văn Anh", "male", { siblingOrder: 1 });
    const child2 = createPerson("c2", "Nguyễn Văn Em", "male", { siblingOrder: 2 });

    const rels = [
      createRel("r1", "PARENT_CHILD", "f", "c1"),
      createRel("r2", "PARENT_CHILD", "m1", "c1"),
      createRel("r3", "PARENT_CHILD", "f", "c2"),
      createRel("r4", "PARENT_CHILD", "m2", "c2"),
    ];

    const graph = new FamilyGraph([father, mother1, mother2, child1, child2], rels);
    const siblings = graph.getSiblings("c1");
    expect(siblings.length).toBe(1);
    expect(siblings[0].type).toBe("half_paternal");

    const res = KinshipInference.inferKinship("c2", "c1", graph);
    expect(res.relationshipType).toBe("HALF_SIBLING");
    expect(res.aCallsB).toContain("Anh");
  });

  it("11. Multiple marriages / Spouses", () => {
    const husband = createPerson("h", "Nguyễn Văn Chồng", "male");
    const wife1 = createPerson("w1", "Trần Thị Vợ 1", "female");
    const wife2 = createPerson("w2", "Lê Thị Vợ 2", "female");

    const rels = [
      createRel("r1", "PARTNERSHIP", "h", "w1"),
      createRel("r2", "PARTNERSHIP", "h", "w2"),
    ];

    const graph = new FamilyGraph([husband, wife1, wife2], rels);
    expect(graph.getSpouses("h").length).toBe(2);

    const res = KinshipInference.inferKinship("h", "w1", graph);
    expect(res.relationshipType).toBe("SPOUSE");
    expect(res.aCallsB).toBe("Em");
    expect(res.bCallsA).toBe("Anh");
  });

  it("12. In-laws: Thím (Wife of paternal younger uncle) and Dượng (Husband of aunt)", () => {
    const gf = createPerson("gf", "Ông Nội", "male");
    const f = createPerson("f", "Ba", "male", { siblingOrder: 1 });
    const chú = createPerson("u", "Chú", "male", { siblingOrder: 2, familyOrdinalName: "Ba" });
    const thím = createPerson("t", "Thím", "female");
    const child = createPerson("c", "Cháu", "male");

    const rels = [
      createRel("r1", "PARENT_CHILD", "gf", "f"),
      createRel("r2", "PARENT_CHILD", "gf", "u"),
      createRel("r3", "PARTNERSHIP", "u", "t"),
      createRel("r4", "PARENT_CHILD", "f", "c"),
    ];

    const graph = new FamilyGraph([gf, f, chú, thím, child], rels);
    const res = KinshipInference.inferKinship("c", "t", graph);

    expect(res.relationshipType).toBe("AUNT_BY_MARRIAGE");
    expect(res.aCallsB).toContain("Thím");
  });

  it("13. Manual terminology override precedence", () => {
    const aunt = createPerson("a", "Dì Bảy", "female");
    const nephew = createPerson("n", "Cháu", "male");
    const mother = createPerson("m", "Mẹ", "female");

    const rels = [
      createRel("r1", "PARENT_CHILD", "m", "n"),
      createRel("r2", "PROVISIONAL_SIBLING", "m", "a"),
    ];
    const graph = new FamilyGraph([aunt, nephew, mother], rels);

    // Automatic would give "Dì"
    const autoRes = KinshipInference.inferKinship("n", "a", graph);
    expect(autoRes.source).toBe("automatic");

    // Add manual pair override: caller calls her "Dì Hai Nhỏ"
    const override: KinshipOverride = {
      id: "ov1",
      speakerId: "n",
      targetId: "a",
      addressTerm: "Dì Hai Nhỏ",
      selfReferenceTerm: "Con Út",
      createdBy: "admin",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const manualRes = KinshipInference.inferKinship("n", "a", graph, {}, [override]);
    expect(manualRes.source).toBe("manual");
    expect(manualRes.isOverridden).toBe(true);
    expect(manualRes.aCallsB).toBe("Dì Hai Nhỏ");
    expect(manualRes.aSelfReference).toBe("Con Út");
    expect(manualRes.appliedOverride?.originalAutoTerm).toBeDefined();
  });

  it("14. Naming preference change: 'Ba' vs 'Cha'", () => {
    const father = createPerson("f", "Nguyễn Văn Cha", "male");
    const son = createPerson("s", "Nguyễn Văn Con", "male");
    const rel = createRel("r1", "PARENT_CHILD", "f", "s");
    const graph = new FamilyGraph([father, son], [rel]);

    const res1 = KinshipInference.inferKinship("s", "f", graph, { fatherTerm: "Cha" });
    expect(res1.aCallsB).toBe("Cha");

    const res2 = KinshipInference.inferKinship("s", "f", graph, { fatherTerm: "Tía" });
    expect(res2.aCallsB).toBe("Tía");
  });

  it("15. Provisional sibling without known parents", () => {
    const p1 = createPerson("p1", "Người Anh", "male", { siblingOrder: 1 });
    const p2 = createPerson("p2", "Người Em", "female", { siblingOrder: 2 });
    const rel = createRel("r1", "PROVISIONAL_SIBLING", "p1", "p2", {
      provisionalSiblingData: { reason: "Cùng họ và ghi chép miệng là anh em ruột" },
    });

    const graph = new FamilyGraph([p1, p2], [rel]);
    const res = KinshipInference.inferKinship("p2", "p1", graph);

    expect(res.relationshipType).toBe("PROVISIONAL_SIBLING");
    expect(res.aCallsB).toBe("Anh");
    expect(res.bCallsA).toBe("Em");
  });

  it("16. Uncertain birth order flags ambiguity", () => {
    const father = createPerson("f", "Ba", "male");
    const sib1 = createPerson("s1", "Anh/Em 1", "male"); // no birthDate, no ordinal
    const sib2 = createPerson("s2", "Anh/Em 2", "male"); // no birthDate, no ordinal

    const rels = [
      createRel("r1", "PARENT_CHILD", "f", "s1"),
      createRel("r2", "PARENT_CHILD", "f", "s2"),
    ];
    const graph = new FamilyGraph([father, sib1, sib2], rels);

    const res = KinshipInference.inferKinship("s1", "s2", graph);
    expect(res.status).toBe("ambiguous");
    expect(res.ambiguityDetails?.missingInfo).toBeDefined();
    expect(res.ambiguityDetails?.candidates?.length).toBeGreaterThan(0);
  });

  it("17. Cousins through siblings of grandparents (Second cousins / Họ hàng khác thế hệ)", () => {
    const ggf = createPerson("ggf", "Cụ Tổ Chung", "male");
    const gf1 = createPerson("gf1", "Ông Nội", "male", { siblingOrder: 1 });
    const gf2 = createPerson("gf2", "Ông Bác", "male", { siblingOrder: 2 });
    const f1 = createPerson("f1", "Ba", "male");
    const uncle2 = createPerson("u2", "Bác Họ", "male");
    const me = createPerson("me", "Tôi", "male");
    const cousin2 = createPerson("c2", "Cháu Họ", "male");

    const rels = [
      createRel("r1", "PARENT_CHILD", "ggf", "gf1"),
      createRel("r2", "PARENT_CHILD", "ggf", "gf2"),
      createRel("r3", "PARENT_CHILD", "gf1", "f1"),
      createRel("r4", "PARENT_CHILD", "gf2", "u2"),
      createRel("r5", "PARENT_CHILD", "f1", "me"),
      createRel("r6", "PARENT_CHILD", "u2", "c2"),
    ];

    const graph = new FamilyGraph([ggf, gf1, gf2, f1, uncle2, me, cousin2], rels);
    const res = KinshipInference.inferKinship("me", "c2", graph);

    expect(res.relationshipType).toBe("DISTANT_COUSIN");
    expect(res.lineage).toBe("paternal");
  });

  it("18. Disconnected family graphs", () => {
    const p1 = createPerson("p1", "Người Nhánh 1", "male");
    const p2 = createPerson("p2", "Người Nhánh 2", "female");
    const graph = new FamilyGraph([p1, p2], []);

    const res = KinshipInference.inferKinship("p1", "p2", graph);
    expect(res.relationshipType).toBe("UNRESOLVED");
    expect(res.status).toBe("unknown");
  });

  it("19. Connecting separate branches and recalculating", () => {
    const b1_root = createPerson("b1", "Cụ Nhánh 1", "male");
    const b1_child = createPerson("b1_c", "Con Nhánh 1", "male");
    const b2_root = createPerson("b2", "Cụ Nhánh 2", "female");
    const b2_child = createPerson("b2_c", "Con Nhánh 2", "female");

    const rels = [
      createRel("r1", "PARENT_CHILD", "b1", "b1_c"),
      createRel("r2", "PARENT_CHILD", "b2", "b2_c"),
    ];

    const graph = new FamilyGraph([b1_root, b1_child, b2_root, b2_child], rels);

    // Prior to connection: unresolved
    let res = KinshipInference.inferKinship("b1_c", "b2_c", graph);
    expect(res.relationshipType).toBe("UNRESOLVED");

    // Connect the two branches via marriage between b1_c and b2_c
    const marriageRel = createRel("r3", "PARTNERSHIP", "b1_c", "b2_c");
    graph.addRelationship(marriageRel);

    // After connection: SPOUSE
    res = KinshipInference.inferKinship("b1_c", "b2_c", graph);
    expect(res.relationshipType).toBe("SPOUSE");
    expect(res.aCallsB).toBe("Em");
    expect(res.bCallsA).toBe("Anh");
  });
});
