import { FamilyGraph } from "../graph/familyGraph";
import { KinshipResult } from "../models/kinship";
import { NamingPreferences, defaultSouthernNamingPreferences, KinshipOverride } from "../models/naming";
import { KinshipClassifier } from "./kinshipClassifier";
import { SouthernVietnameseEngine } from "./southernVietnameseEngine";
import { KinshipExplainer } from "./kinshipExplainer";

export class KinshipInference {
  public static inferKinship(
    personAId: string,
    personBId: string,
    graph: FamilyGraph,
    preferences: Partial<NamingPreferences> = {},
    overrides: KinshipOverride[] = []
  ): KinshipResult {
    const fullPrefs: NamingPreferences = {
      ...defaultSouthernNamingPreferences,
      ...preferences,
    };

    const personA = graph.getPerson(personAId);
    const personB = graph.getPerson(personBId);

    if (!personA || !personB) {
      return {
        personAId,
        personBId,
        relationshipType: "UNRESOLVED",
        aCallsB: null,
        bCallsA: null,
        aSelfReference: null,
        bSelfReference: null,
        generationDifference: 0,
        relationshipPaths: [],
        lineage: "unknown",
        source: "automatic",
        status: "unknown",
        explanation: "Không tìm thấy thông tin thành viên trong hệ thống.",
      };
    }

    // Step 1: Compute normalized classification
    const classified = KinshipClassifier.classify(graph, personAId, personBId);

    // Step 2: Compute automatic terms based on Southern conventions
    const autoTerms = SouthernVietnameseEngine.compute(classified, personA, personB, fullPrefs);

    // Step 3: Compute human-readable explanation
    const explanation = KinshipExplainer.explain(classified, personA, personB, graph, fullPrefs);

    // Step 4: Check for manual overrides
    // Precedence:
    // 1. Pair-specific manual override (speaker: A -> target: B)
    // 2. Branch-specific override
    let appliedOverride: KinshipOverride | undefined;
    let overrideLevel: "pair" | "branch" | "global" = "global";

    const pairOverride = overrides.find(o => o.speakerId === personAId && o.targetId === personBId);
    if (pairOverride) {
      appliedOverride = pairOverride;
      overrideLevel = "pair";
    } else {
      // Check branch override if person B belongs to any specific branch with an override
      const branchOverride = overrides.find(o =>
        o.branchId && personB.branchIds.includes(o.branchId) && o.speakerId === personAId
      );
      if (branchOverride) {
        appliedOverride = branchOverride;
        overrideLevel = "branch";
      }
    }

    let effectiveACallsB = autoTerms.aCallsB;
    let effectiveASelf = autoTerms.aSelfReference;
    let isOverridden = false;

    if (appliedOverride) {
      isOverridden = true;
      effectiveACallsB = appliedOverride.addressTerm;
      if (appliedOverride.selfReferenceTerm) {
        effectiveASelf = appliedOverride.selfReferenceTerm;
      }
    }

    // Reciprocal override check: speaker: B -> target: A
    const reciprocalPairOverride = overrides.find(o => o.speakerId === personBId && o.targetId === personAId);
    let effectiveBCallsA = autoTerms.bCallsA;
    let effectiveBSelf = autoTerms.bSelfReference;

    if (reciprocalPairOverride) {
      effectiveBCallsA = reciprocalPairOverride.addressTerm;
      if (reciprocalPairOverride.selfReferenceTerm) {
        effectiveBSelf = reciprocalPairOverride.selfReferenceTerm;
      }
    }

    return {
      personAId,
      personBId,
      relationshipType: classified.type,
      aCallsB: effectiveACallsB,
      bCallsA: effectiveBCallsA,
      aSelfReference: effectiveASelf,
      bSelfReference: effectiveBSelf,
      generationDifference: classified.generationDiff,
      relationshipPaths: classified.paths,
      lineage: classified.lineage,
      source: isOverridden ? "manual" : "automatic",
      status: autoTerms.status,
      explanation,
      alternativeTerms: autoTerms.alternativeTerms,
      isOverridden,
      appliedOverride: isOverridden && appliedOverride ? {
        id: appliedOverride.id,
        level: overrideLevel,
        originalAutoTerm: autoTerms.aCallsB,
      } : undefined,
      ambiguityDetails: autoTerms.ambiguityDetails,
    };
  }
}
