import { FamilyGraph } from "../graph/familyGraph";
import { LcaDetector, AncestorDistance } from "../graph/lcaDetector";
import { GraphTraversal } from "../graph/graphTraversal";
import { KinshipLineage, RelationshipPath } from "../models/kinship";
import { Person } from "../models/person";

export type NormalizedRelationshipType =
  | "SELF"
  | "FATHER"
  | "MOTHER"
  | "SON"
  | "DAUGHTER"
  | "SPOUSE"
  | "FULL_SIBLING"
  | "HALF_SIBLING"
  | "PROVISIONAL_SIBLING"
  | "PATERNAL_GRANDFATHER"
  | "PATERNAL_GRANDMOTHER"
  | "MATERNAL_GRANDFATHER"
  | "MATERNAL_GRANDMOTHER"
  | "PATERNAL_GREAT_GRANDPARENT"
  | "MATERNAL_GREAT_GRANDPARENT"
  | "GREAT_GREAT_GRANDPARENT"
  | "GRANDCHILD"
  | "GREAT_GRANDCHILD"
  | "GREAT_GREAT_GRANDCHILD"
  | "PATERNAL_ELDER_UNCLE"      // Bác trai (anh của cha)
  | "PATERNAL_YOUNGER_UNCLE"    // Chú (em trai của cha)
  | "PATERNAL_AUNT"             // Cô (chị/em gái của cha)
  | "MATERNAL_UNCLE"            // Cậu (anh/em trai của mẹ)
  | "MATERNAL_AUNT"             // Dì (chị/em gái của mẹ)
  | "NIECE_NEPHEW"              // Cháu (con của anh chị em ruột)
  | "FIRST_COUSIN"              // Anh chị em họ
  | "COUSIN_REMOVED"            // Họ hàng khác thế hệ
  | "DISTANT_COUSIN"            // Anh chị em họ đời 2 trở lên
  | "FATHER_IN_LAW"             // Ba chồng / Ba vợ
  | "MOTHER_IN_LAW"             // Má chồng / Má vợ
  | "SON_IN_LAW"                // Con rể
  | "DAUGHTER_IN_LAW"           // Con dâu
  | "BROTHER_IN_LAW"            // Anh rể / Em rể
  | "SISTER_IN_LAW"             // Chị dâu / Em dâu
  | "AUNT_BY_MARRIAGE"          // Thím (vợ chú), Mợ (vợ cậu), Bác gái (vợ bác)
  | "UNCLE_BY_MARRIAGE"         // Dượng (chồng cô hoặc dì)
  | "CO_IN_LAW"                 // Thông gia
  | "AFFINAL_RELATIVE"          // Họ hàng bên vợ/chồng
  | "DISTANT_RELATIVE"          // Họ hàng xa
  | "UNRESOLVED";               // Chưa rõ quan hệ

export interface ClassifiedRelationship {
  type: NormalizedRelationshipType;
  lineage: KinshipLineage;
  generationDiff: number; // generation(B) - generation(A). E.g. parent is -1, child is +1
  nearestCommonAncestors: AncestorDistance[];
  paths: RelationshipPath[];
  branchSeniority: "senior" | "junior" | "equal" | "unknown"; // "senior" if B belongs to senior branch/elder sibling branch
  orderComparison: "older" | "younger" | "same" | "unknown";   // chronological or sibling order of B relative to A
  details: {
    intermediatePersonIds?: string[];
    isDirectBloodline: boolean;
    isAffinal: boolean;
    isAdoptiveOrStep: boolean;
  };
}

export class KinshipClassifier {
  public static classify(
    graph: FamilyGraph,
    personAId: string,
    personBId: string
  ): ClassifiedRelationship {
    const personA = graph.getPerson(personAId);
    const personB = graph.getPerson(personBId);

    if (!personA || !personB) {
      return {
        type: "UNRESOLVED",
        lineage: "unknown",
        generationDiff: 0,
        nearestCommonAncestors: [],
        paths: [],
        branchSeniority: "unknown",
        orderComparison: "unknown",
        details: { isDirectBloodline: false, isAffinal: false, isAdoptiveOrStep: false },
      };
    }

    if (personAId === personBId) {
      return {
        type: "SELF",
        lineage: "direct" as unknown as KinshipLineage,
        generationDiff: 0,
        nearestCommonAncestors: [],
        paths: [{ nodes: [personAId], steps: [], pathLength: 0 }],
        branchSeniority: "equal",
        orderComparison: "same",
        details: { isDirectBloodline: true, isAffinal: false, isAdoptiveOrStep: false },
      };
    }

    // 1. Spouses (Partnership)
    const spousesA = graph.getSpouseIds(personAId);
    if (spousesA.includes(personBId)) {
      return {
        type: "SPOUSE",
        lineage: "affinal",
        generationDiff: 0,
        nearestCommonAncestors: [],
        paths: [{
          nodes: [personAId, personBId],
          steps: [{ fromPersonId: personAId, toPersonId: personBId, edgeType: "SPOUSE" }],
          pathLength: 1,
        }],
        branchSeniority: "equal",
        orderComparison: this.compareAgeOrOrder(personA, personB),
        details: { isDirectBloodline: false, isAffinal: true, isAdoptiveOrStep: false },
      };
    }

    // 2. Direct Parents / Children
    const parentsOfA = graph.getParentIds(personAId);
    const parentsOfB = graph.getParentIds(personBId);

    if (parentsOfA.includes(personBId)) {
      // B is parent of A
      const isFather = personB.gender === "male";
      const isMother = personB.gender === "female";
      return {
        type: isFather ? "FATHER" : isMother ? "MOTHER" : "FATHER",
        lineage: isFather ? "paternal" : "maternal",
        generationDiff: -1,
        nearestCommonAncestors: [],
        paths: [{
          nodes: [personAId, personBId],
          steps: [{ fromPersonId: personAId, toPersonId: personBId, edgeType: "PARENT" }],
          pathLength: 1,
        }],
        branchSeniority: "senior",
        orderComparison: "older",
        details: { isDirectBloodline: true, isAffinal: false, isAdoptiveOrStep: false },
      };
    }

    if (parentsOfB.includes(personAId)) {
      // B is child of A
      const isSon = personB.gender === "male";
      const isDaughter = personB.gender === "female";
      return {
        type: isSon ? "SON" : isDaughter ? "DAUGHTER" : "SON",
        lineage: personA.gender === "male" ? "paternal" : "maternal",
        generationDiff: 1,
        nearestCommonAncestors: [],
        paths: [{
          nodes: [personAId, personBId],
          steps: [{ fromPersonId: personAId, toPersonId: personBId, edgeType: "CHILD" }],
          pathLength: 1,
        }],
        branchSeniority: "junior",
        orderComparison: "younger",
        details: { isDirectBloodline: true, isAffinal: false, isAdoptiveOrStep: false },
      };
    }

    // 3. Direct Siblings (full, half, or provisional)
    const siblingsOfA = graph.getSiblings(personAId);
    const sibInfo = siblingsOfA.find(s => s.person.id === personBId);
    if (sibInfo) {
      const order = this.compareSiblingOrder(personA, personB);
      let sibType: NormalizedRelationshipType = "FULL_SIBLING";
      if (sibInfo.type === "half_paternal" || sibInfo.type === "half_maternal") {
        sibType = "HALF_SIBLING";
      } else if (sibInfo.type === "provisional") {
        sibType = "PROVISIONAL_SIBLING";
      }
      return {
        type: sibType,
        lineage: sibInfo.type === "half_maternal" ? "maternal" : "paternal",
        generationDiff: 0,
        nearestCommonAncestors: [],
        paths: [{
          nodes: [personAId, personBId],
          steps: sibInfo.sharedParentIds.length > 0
            ? [
                { fromPersonId: personAId, toPersonId: sibInfo.sharedParentIds[0], edgeType: "PARENT" },
                { fromPersonId: sibInfo.sharedParentIds[0], toPersonId: personBId, edgeType: "CHILD" },
              ]
            : [{ fromPersonId: personAId, toPersonId: personBId, edgeType: "PROVISIONAL_SIBLING" }],
          pathLength: 2,
        }],
        branchSeniority: order === "older" ? "senior" : order === "younger" ? "junior" : "unknown",
        orderComparison: order,
        details: { isDirectBloodline: true, isAffinal: false, isAdoptiveOrStep: false },
      };
    }

    // 4. Grandparents and Grandchildren
    // Grandparents of A
    for (const pId of parentsOfA) {
      const parent = graph.getPerson(pId);
      const isParentFather = parent?.gender === "male";
      const gParents = graph.getParentIds(pId);

      if (gParents.includes(personBId)) {
        const isBGrandfather = personB.gender === "male";
        return {
          type: isParentFather
            ? isBGrandfather ? "PATERNAL_GRANDFATHER" : "PATERNAL_GRANDMOTHER"
            : isBGrandfather ? "MATERNAL_GRANDFATHER" : "MATERNAL_GRANDMOTHER",
          lineage: isParentFather ? "paternal" : "maternal",
          generationDiff: -2,
          nearestCommonAncestors: [],
          paths: [{
            nodes: [personAId, pId, personBId],
            steps: [
              { fromPersonId: personAId, toPersonId: pId, edgeType: "PARENT" },
              { fromPersonId: pId, toPersonId: personBId, edgeType: "PARENT" },
            ],
            pathLength: 2,
          }],
          branchSeniority: "senior",
          orderComparison: "older",
          details: { isDirectBloodline: true, isAffinal: false, isAdoptiveOrStep: false },
        };
      }
    }

    // Grandchildren of A (B's parents have A as parent)
    for (const pId of parentsOfB) {
      if (parentsOfA.includes(pId)) continue; // that would be sibling
      const grandParentIds = graph.getParentIds(pId);
      if (grandParentIds.includes(personAId)) {
        const isSon = graph.getPerson(pId)?.gender === "male";
        return {
          type: "GRANDCHILD",
          lineage: isSon ? "paternal" : "maternal",
          generationDiff: 2,
          nearestCommonAncestors: [],
          paths: [{
            nodes: [personAId, pId, personBId],
            steps: [
              { fromPersonId: personAId, toPersonId: pId, edgeType: "CHILD" },
              { fromPersonId: pId, toPersonId: personBId, edgeType: "CHILD" },
            ],
            pathLength: 2,
          }],
          branchSeniority: "junior",
          orderComparison: "younger",
          details: { isDirectBloodline: true, isAffinal: false, isAdoptiveOrStep: false },
        };
      }
    }

    // 5. Great-grandparents (3 generations up)
    const ancestorsAWithDist = LcaDetector.getAncestorsWithDistance(graph, personAId);
    const bDistInA = ancestorsAWithDist.get(personBId);
    if (bDistInA) {
      if (bDistInA.distance === 3) {
        return {
          type: bDistInA.lineage === "paternal" ? "PATERNAL_GREAT_GRANDPARENT" : "MATERNAL_GREAT_GRANDPARENT",
          lineage: bDistInA.lineage,
          generationDiff: -3,
          nearestCommonAncestors: [],
          paths: GraphTraversal.findShortestPath(graph, personAId, personBId)
            ? [GraphTraversal.findShortestPath(graph, personAId, personBId)!]
            : [],
          branchSeniority: "senior",
          orderComparison: "older",
          details: { isDirectBloodline: true, isAffinal: false, isAdoptiveOrStep: false },
        };
      }
      if (bDistInA.distance >= 4) {
        return {
          type: "GREAT_GREAT_GRANDPARENT",
          lineage: bDistInA.lineage,
          generationDiff: -bDistInA.distance,
          nearestCommonAncestors: [],
          paths: GraphTraversal.findShortestPath(graph, personAId, personBId)
            ? [GraphTraversal.findShortestPath(graph, personAId, personBId)!]
            : [],
          branchSeniority: "senior",
          orderComparison: "older",
          details: { isDirectBloodline: true, isAffinal: false, isAdoptiveOrStep: false },
        };
      }
    }

    // Great-grandchildren (3+ generations down)
    const ancestorsBWithDist = LcaDetector.getAncestorsWithDistance(graph, personBId);
    const aDistInB = ancestorsBWithDist.get(personAId);
    if (aDistInB) {
      if (aDistInB.distance === 3) {
        return {
          type: "GREAT_GRANDCHILD",
          lineage: aDistInB.lineage,
          generationDiff: 3,
          nearestCommonAncestors: [],
          paths: GraphTraversal.findShortestPath(graph, personAId, personBId)
            ? [GraphTraversal.findShortestPath(graph, personAId, personBId)!]
            : [],
          branchSeniority: "junior",
          orderComparison: "younger",
          details: { isDirectBloodline: true, isAffinal: false, isAdoptiveOrStep: false },
        };
      }
      if (aDistInB.distance >= 4) {
        return {
          type: "GREAT_GREAT_GRANDCHILD",
          lineage: aDistInB.lineage,
          generationDiff: aDistInB.distance,
          nearestCommonAncestors: [],
          paths: GraphTraversal.findShortestPath(graph, personAId, personBId)
            ? [GraphTraversal.findShortestPath(graph, personAId, personBId)!]
            : [],
          branchSeniority: "junior",
          orderComparison: "younger",
          details: { isDirectBloodline: true, isAffinal: false, isAdoptiveOrStep: false },
        };
      }
    }

    // 6. Aunts / Uncles and Nieces / Nephews
    // B is sibling of parent of A (Bác / Chú / Cô / Cậu / Dì)
    for (const pId of parentsOfA) {
      const parent = graph.getPerson(pId);
      if (!parent) continue;
      const parentSibs = graph.getSiblings(pId);
      const isParentSibling = parentSibs.find(s => s.person.id === personBId);

      if (isParentSibling) {
        const isParentFather = parent.gender === "male";
        const isParentMother = parent.gender === "female";
        const orderRelativeToParent = this.compareSiblingOrder(parent, personB);

        let uncleType: NormalizedRelationshipType = "PATERNAL_YOUNGER_UNCLE";
        let lineage: KinshipLineage = isParentFather ? "paternal" : "maternal";

        if (isParentFather) {
          if (personB.gender === "female") {
            uncleType = "PATERNAL_AUNT"; // Cô
          } else {
            // Male: older than father = Bác, younger = Chú
            if (orderRelativeToParent === "older") {
              uncleType = "PATERNAL_ELDER_UNCLE"; // Bác
            } else {
              uncleType = "PATERNAL_YOUNGER_UNCLE"; // Chú
            }
          }
        } else if (isParentMother) {
          if (personB.gender === "male") {
            uncleType = "MATERNAL_UNCLE"; // Cậu
          } else {
            uncleType = "MATERNAL_AUNT"; // Dì
          }
        }

        return {
          type: uncleType,
          lineage,
          generationDiff: -1,
          nearestCommonAncestors: [],
          paths: [{
            nodes: [personAId, pId, personBId],
            steps: [
              { fromPersonId: personAId, toPersonId: pId, edgeType: "PARENT" },
              { fromPersonId: pId, toPersonId: personBId, edgeType: "CHILD" }, // sibling traversal via parents or direct
            ],
            pathLength: 2,
          }],
          branchSeniority: "senior",
          orderComparison: "older",
          details: { isDirectBloodline: true, isAffinal: false, isAdoptiveOrStep: false },
        };
      }
    }

    // A is sibling of parent of B (B is niece/nephew of A)
    for (const pId of parentsOfB) {
      const parentOfB = graph.getPerson(pId);
      if (!parentOfB) continue;
      const parentSibs = graph.getSiblings(pId);
      if (parentSibs.some(s => s.person.id === personAId)) {
        return {
          type: "NIECE_NEPHEW",
          lineage: parentOfB.gender === "male" ? "paternal" : "maternal",
          generationDiff: 1,
          nearestCommonAncestors: [],
          paths: [{
            nodes: [personAId, pId, personBId],
            steps: [
              { fromPersonId: personAId, toPersonId: pId, edgeType: "CHILD" },
              { fromPersonId: pId, toPersonId: personBId, edgeType: "CHILD" },
            ],
            pathLength: 2,
          }],
          branchSeniority: "junior",
          orderComparison: "younger",
          details: { isDirectBloodline: true, isAffinal: false, isAdoptiveOrStep: false },
        };
      }
    }

    // 7. Common Ancestor search for Cousins & Distant Blood Relatives
    const commonAncestors = LcaDetector.findCommonAncestors(graph, personAId, personBId);
    if (commonAncestors.length > 0) {
      const nearest = commonAncestors[0];
      const distA = nearest.distanceA;
      const distB = nearest.distanceB;

      // Both distances = 2: First Cousins! (Anh chị em họ / Con chú con bác / Con cô con cậu)
      if (distA === 2 && distB === 2) {
        // Find parent of A and parent of B under this ancestor
        const parentsAUnderAncestor = parentsOfA.filter(pId => ancestorsAWithDist.get(pId)?.distance === 1);
        const parentsBUnderAncestor = parentsOfB.filter(pId => ancestorsBWithDist.get(pId)?.distance === 1);

        let branchSeniority: "senior" | "junior" | "equal" | "unknown" = "unknown";
        if (parentsAUnderAncestor.length > 0 && parentsBUnderAncestor.length > 0) {
          const parentA = graph.getPerson(parentsAUnderAncestor[0]);
          const parentB = graph.getPerson(parentsBUnderAncestor[0]);
          if (parentA && parentB) {
            const parentOrder = this.compareSiblingOrder(parentA, parentB);
            if (parentOrder === "older") {
              // parent B is older than parent A => B's branch is senior!
              branchSeniority = "senior";
            } else if (parentOrder === "younger") {
              // parent B is younger than parent A => B's branch is junior!
              branchSeniority = "junior";
            }
          }
        }

        const lineage: KinshipLineage = nearest.pathFromA === "paternal" && nearest.pathFromB === "paternal"
          ? "paternal"
          : nearest.pathFromA === "maternal" && nearest.pathFromB === "maternal"
          ? "maternal"
          : "mixed";

        const orderComp = this.compareAgeOrOrder(personA, personB);

        return {
          type: "FIRST_COUSIN",
          lineage,
          generationDiff: 0,
          nearestCommonAncestors: commonAncestors.slice(0, 2),
          paths: GraphTraversal.findAllPaths(graph, personAId, personBId, 2, 6),
          branchSeniority,
          orderComparison: orderComp,
          details: { isDirectBloodline: true, isAffinal: false, isAdoptiveOrStep: false },
        };
      }

      // Generation difference in cousins (e.g. distA = 2, distB = 3 or vice-versa)
      if (Math.abs(distA - distB) > 0) {
        const genDiff = distB - distA;
        return {
          type: "COUSIN_REMOVED",
          lineage: nearest.pathFromA === "paternal" && nearest.pathFromB === "paternal" ? "paternal" : "mixed",
          generationDiff: genDiff,
          nearestCommonAncestors: [nearest],
          paths: GraphTraversal.findAllPaths(graph, personAId, personBId, 2, 8),
          branchSeniority: genDiff < 0 ? "senior" : "junior",
          orderComparison: genDiff < 0 ? "older" : "younger",
          details: { isDirectBloodline: true, isAffinal: false, isAdoptiveOrStep: false },
        };
      }

      // Distant cousins (distA === distB >= 3)
      return {
        type: "DISTANT_COUSIN",
        lineage: nearest.pathFromA === "paternal" && nearest.pathFromB === "paternal" ? "paternal" : "mixed",
        generationDiff: 0,
        nearestCommonAncestors: [nearest],
        paths: GraphTraversal.findAllPaths(graph, personAId, personBId, 2, 8),
        branchSeniority: "unknown",
        orderComparison: this.compareAgeOrOrder(personA, personB),
        details: { isDirectBloodline: true, isAffinal: false, isAdoptiveOrStep: false },
      };
    }

    // 8. Affinal / In-law Relationships (Through Spouses)
    // 8a. Parents-in-law: B is parent of A's spouse
    for (const spouseId of spousesA) {
      const spouseParents = graph.getParentIds(spouseId);
      if (spouseParents.includes(personBId)) {
        return {
          type: personB.gender === "female" ? "MOTHER_IN_LAW" : "FATHER_IN_LAW",
          lineage: "affinal",
          generationDiff: -1,
          nearestCommonAncestors: [],
          paths: [{
            nodes: [personAId, spouseId, personBId],
            steps: [
              { fromPersonId: personAId, toPersonId: spouseId, edgeType: "SPOUSE" },
              { fromPersonId: spouseId, toPersonId: personBId, edgeType: "PARENT" },
            ],
            pathLength: 2,
          }],
          branchSeniority: "senior",
          orderComparison: "older",
          details: { isDirectBloodline: false, isAffinal: true, isAdoptiveOrStep: false },
        };
      }
    }

    // 8b. Child-in-law: B is spouse of A's child
    const childrenOfA = graph.getChildIds(personAId);
    for (const childId of childrenOfA) {
      const childSpouses = graph.getSpouseIds(childId);
      if (childSpouses.includes(personBId)) {
        return {
          type: personB.gender === "female" ? "DAUGHTER_IN_LAW" : "SON_IN_LAW",
          lineage: "affinal",
          generationDiff: 1,
          nearestCommonAncestors: [],
          paths: [{
            nodes: [personAId, childId, personBId],
            steps: [
              { fromPersonId: personAId, toPersonId: childId, edgeType: "CHILD" },
              { fromPersonId: childId, toPersonId: personBId, edgeType: "SPOUSE" },
            ],
            pathLength: 2,
          }],
          branchSeniority: "junior",
          orderComparison: "younger",
          details: { isDirectBloodline: false, isAffinal: true, isAdoptiveOrStep: false },
        };
      }
    }

    // 8c. Sibling-in-law: B is spouse of A's sibling
    for (const sib of siblingsOfA) {
      const sibSpouses = graph.getSpouseIds(sib.person.id);
      if (sibSpouses.includes(personBId)) {
        const order = this.compareSiblingOrder(personA, sib.person);
        const isBFemale = personB.gender === "female";
        return {
          type: isBFemale ? "SISTER_IN_LAW" : "BROTHER_IN_LAW",
          lineage: "affinal",
          generationDiff: 0,
          nearestCommonAncestors: [],
          paths: [{
            nodes: [personAId, sib.person.id, personBId],
            steps: [
              { fromPersonId: personAId, toPersonId: sib.person.id, edgeType: "CHILD" },
              { fromPersonId: sib.person.id, toPersonId: personBId, edgeType: "SPOUSE" },
            ],
            pathLength: 2,
          }],
          branchSeniority: order === "older" ? "senior" : order === "younger" ? "junior" : "unknown",
          orderComparison: order,
          details: { isDirectBloodline: false, isAffinal: true, isAdoptiveOrStep: false },
        };
      }
    }

    // 8d. Uncle/Aunt by Marriage (Thím, Mợ, Dượng, Bác gái)
    // Check if B is spouse of an uncle/aunt of A
    for (const pId of parentsOfA) {
      const parentSibs = graph.getSiblings(pId);
      for (const uncleAunt of parentSibs) {
        const uncleAuntSpouses = graph.getSpouseIds(uncleAunt.person.id);
        if (uncleAuntSpouses.includes(personBId)) {
          const parent = graph.getPerson(pId);
          const isPaternal = parent?.gender === "male";
          const orderRelativeToParent = parent ? this.compareSiblingOrder(parent, uncleAunt.person) : "unknown";

          let termType: NormalizedRelationshipType = "AUNT_BY_MARRIAGE";
          if (isPaternal) {
            if (uncleAunt.person.gender === "male") {
              // Uncle's wife: if uncle is elder => Bác dâu/Bác gái; if uncle is younger (chú) => Thím
              termType = orderRelativeToParent === "older" ? "AUNT_BY_MARRIAGE" : "AUNT_BY_MARRIAGE";
            } else {
              // Aunt's (cô) husband => Dượng
              termType = "UNCLE_BY_MARRIAGE";
            }
          } else {
            // Maternal side:
            if (uncleAunt.person.gender === "male") {
              // Cậu's wife => Mợ
              termType = "AUNT_BY_MARRIAGE";
            } else {
              // Dì's husband => Dượng
              termType = "UNCLE_BY_MARRIAGE";
            }
          }

          return {
            type: termType,
            lineage: isPaternal ? "paternal" : "maternal",
            generationDiff: -1,
            nearestCommonAncestors: [],
            paths: [{
              nodes: [personAId, pId, uncleAunt.person.id, personBId],
              steps: [
                { fromPersonId: personAId, toPersonId: pId, edgeType: "PARENT" },
                { fromPersonId: pId, toPersonId: uncleAunt.person.id, edgeType: "CHILD" },
                { fromPersonId: uncleAunt.person.id, toPersonId: personBId, edgeType: "SPOUSE" },
              ],
              pathLength: 3,
            }],
            branchSeniority: "senior",
            orderComparison: "older",
            details: { isDirectBloodline: false, isAffinal: true, isAdoptiveOrStep: false },
          };
        }
      }
    }

    // 8e. Co-in-laws (Thông gia): A is parent of X, B is parent of Y, X and Y are spouses
    for (const childIdA of childrenOfA) {
      const childSpouses = graph.getSpouseIds(childIdA);
      for (const spouseChildId of childSpouses) {
        const spouseParents = graph.getParentIds(spouseChildId);
        if (spouseParents.includes(personBId)) {
          return {
            type: "CO_IN_LAW",
            lineage: "affinal",
            generationDiff: 0,
            nearestCommonAncestors: [],
            paths: [{
              nodes: [personAId, childIdA, spouseChildId, personBId],
              steps: [
                { fromPersonId: personAId, toPersonId: childIdA, edgeType: "CHILD" },
                { fromPersonId: childIdA, toPersonId: spouseChildId, edgeType: "SPOUSE" },
                { fromPersonId: spouseChildId, toPersonId: personBId, edgeType: "PARENT" },
              ],
              pathLength: 3,
            }],
            branchSeniority: "equal",
            orderComparison: this.compareAgeOrOrder(personA, personB),
            details: { isDirectBloodline: false, isAffinal: true, isAdoptiveOrStep: false },
          };
        }
      }
    }

    // Check if there is any general connected path
    const shortestPath = GraphTraversal.findShortestPath(graph, personAId, personBId);
    if (shortestPath) {
      return {
        type: "DISTANT_RELATIVE",
        lineage: "mixed",
        generationDiff: 0,
        nearestCommonAncestors: [],
        paths: [shortestPath],
        branchSeniority: "unknown",
        orderComparison: this.compareAgeOrOrder(personA, personB),
        details: { isDirectBloodline: false, isAffinal: true, isAdoptiveOrStep: false },
      };
    }

    return {
      type: "UNRESOLVED",
      lineage: "unknown",
      generationDiff: 0,
      nearestCommonAncestors: [],
      paths: [],
      branchSeniority: "unknown",
      orderComparison: "unknown",
      details: { isDirectBloodline: false, isAffinal: false, isAdoptiveOrStep: false },
    };
  }

  /**
   * Compares sibling order between two people who are known siblings.
   * "older" means person B is older than person A.
   */
  public static compareSiblingOrder(personA: Person, personB: Person): "older" | "younger" | "same" | "unknown" {
    // 1. Sibling order integer: 1 is eldest
    if (personA.siblingOrder !== undefined && personB.siblingOrder !== undefined) {
      if (personB.siblingOrder < personA.siblingOrder) return "older";
      if (personB.siblingOrder > personA.siblingOrder) return "younger";
      return "same";
    }

    // 2. Family ordinal name: In Southern Vietnam: "Hai" is 2 (eldest child), "Ba" is 3, "Tư" is 4, etc.
    const ordinalRank: Record<string, number> = {
      "hai": 2, "ba": 3, "tư": 4, "bốn": 4, "năm": 5, "sáu": 6, "bảy": 7, "tám": 8, "chín": 9, "mười": 10,
    };
    if (personA.familyOrdinalName && personB.familyOrdinalName) {
      const aLower = personA.familyOrdinalName.toLowerCase().trim();
      const bLower = personB.familyOrdinalName.toLowerCase().trim();

      if (aLower === "út" && bLower !== "út") return "older"; // B is older than A (A is youngest)
      if (bLower === "út" && aLower !== "út") return "younger"; // B is youngest

      const rankA = ordinalRank[aLower];
      const rankB = ordinalRank[bLower];
      if (rankA && rankB) {
        if (rankB < rankA) return "older";
        if (rankB > rankA) return "younger";
        return "same";
      }
    }

    // 3. Birth date comparison
    return this.compareAgeOrOrder(personA, personB);
  }

  public static compareAgeOrOrder(personA: Person, personB: Person): "older" | "younger" | "same" | "unknown" {
    const yA = personA.birthDate?.year;
    const yB = personB.birthDate?.year;

    if (yA && yB) {
      if (yB < yA) return "older"; // born earlier => older
      if (yB > yA) return "younger";
      const mA = personA.birthDate?.month;
      const mB = personB.birthDate?.month;
      if (mA && mB) {
        if (mB < mA) return "older";
        if (mB > mA) return "younger";
        const dA = personA.birthDate?.day;
        const dB = personB.birthDate?.day;
        if (dA && dB) {
          if (dB < dA) return "older";
          if (dB > dA) return "younger";
        }
      }
      return "same";
    }

    return "unknown";
  }
}
