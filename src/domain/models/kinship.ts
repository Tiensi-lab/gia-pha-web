export type KinshipLineage = "paternal" | "maternal" | "mixed" | "affinal" | "direct" | "unknown";
export type KinshipStatus = "confirmed" | "ambiguous" | "unknown";
export type KinshipSource = "automatic" | "manual";

export interface PathStep {
  fromPersonId: string;
  toPersonId: string;
  edgeType: "PARENT" | "CHILD" | "SPOUSE" | "PROVISIONAL_SIBLING";
  nature?: string;
}

export interface RelationshipPath {
  nodes: string[]; // sequence of person IDs [start, ..., end]
  steps: PathStep[];
  pathLength: number;
}

export interface KinshipResult {
  personAId: string;
  personBId: string;

  relationshipType: string; // e.g. "PARENT", "CHILD", "SIBLING", "PATERNAL_UNCLE", "FIRST_COUSIN", etc.

  aCallsB: string | null;
  bCallsA: string | null;

  aSelfReference?: string | null;
  bSelfReference?: string | null;

  generationDifference: number; // generation(B) - generation(A). E.g. If B is child of A, genDiff = 1 (or -1 depending on convention; let's document clearly: genDiff = gen(B) - gen(A), so if B is child of A, B is +1 generation down)

  relationshipPaths: RelationshipPath[];

  lineage: KinshipLineage;

  source: KinshipSource;

  status: KinshipStatus;

  explanation: string;

  alternativeTerms?: string[];

  isOverridden?: boolean;
  appliedOverride?: {
    id: string;
    level: "pair" | "branch" | "global";
    originalAutoTerm?: string | null;
  };

  ambiguityDetails?: {
    missingInfo?: string[];
    candidates?: { term: string; condition: string }[];
  };
}
