import { ClassifiedRelationship } from "./kinshipClassifier";
import { NamingPreferences } from "../models/naming";
import { Person } from "../models/person";
import { KinshipStatus } from "../models/kinship";

export interface ComputedKinshipTerms {
  aCallsB: string | null;
  bCallsA: string | null;
  aSelfReference: string | null;
  bSelfReference: string | null;
  status: KinshipStatus;
  alternativeTerms: string[];
  ambiguityDetails?: {
    missingInfo?: string[];
    candidates?: { term: string; condition: string }[];
  };
}

export class SouthernVietnameseEngine {
  public static compute(
    classified: ClassifiedRelationship,
    personA: Person,
    personB: Person,
    prefs: NamingPreferences
  ): ComputedKinshipTerms {
    const isAMale = personA.gender === "male";
    const isAFemale = personA.gender === "female";
    const isBMale = personB.gender === "male";
    const isBFemale = personB.gender === "female";

    const ordinalB = prefs.useOrdinalTitles && personB.familyOrdinalName
      ? ` ${personB.familyOrdinalName}`
      : "";
    const ordinalA = prefs.useOrdinalTitles && personA.familyOrdinalName
      ? ` ${personA.familyOrdinalName}`
      : "";

    switch (classified.type) {
      case "SELF":
        return {
          aCallsB: "Bản thân tôi",
          bCallsA: "Bản thân tôi",
          aSelfReference: "Tôi",
          bSelfReference: "Tôi",
          status: "confirmed",
          alternativeTerms: ["Mình"],
        };

      case "FATHER":
        return {
          aCallsB: prefs.fatherTerm,
          bCallsA: "Con",
          aSelfReference: "Con",
          bSelfReference: prefs.fatherTerm,
          status: "confirmed",
          alternativeTerms: ["Cha", "Tía", "Bố"].filter(t => t !== prefs.fatherTerm),
        };

      case "MOTHER":
        return {
          aCallsB: prefs.motherTerm,
          bCallsA: "Con",
          aSelfReference: "Con",
          bSelfReference: prefs.motherTerm,
          status: "confirmed",
          alternativeTerms: ["Mẹ", "Má", "U"].filter(t => t !== prefs.motherTerm),
        };

      case "SON":
        return {
          aCallsB: "Con",
          bCallsA: isAMale ? prefs.fatherTerm : prefs.motherTerm,
          aSelfReference: isAMale ? prefs.fatherTerm : prefs.motherTerm,
          bSelfReference: "Con",
          status: "confirmed",
          alternativeTerms: ["Con trai"],
        };

      case "DAUGHTER":
        return {
          aCallsB: "Con",
          bCallsA: isAMale ? prefs.fatherTerm : prefs.motherTerm,
          aSelfReference: isAMale ? prefs.fatherTerm : prefs.motherTerm,
          bSelfReference: "Con",
          status: "confirmed",
          alternativeTerms: ["Con gái"],
        };

      case "SPOUSE":
        if (isAMale) {
          return {
            aCallsB: "Em",
            bCallsA: "Anh",
            aSelfReference: "Anh",
            bSelfReference: "Em",
            status: "confirmed",
            alternativeTerms: ["Bà xã", "Vợ", "Mình"],
          };
        } else {
          return {
            aCallsB: "Anh",
            bCallsA: "Em",
            aSelfReference: "Em",
            bSelfReference: "Anh",
            status: "confirmed",
            alternativeTerms: ["Ông xã", "Chồng", "Mình"],
          };
        }

      case "FULL_SIBLING":
      case "HALF_SIBLING":
      case "PROVISIONAL_SIBLING": {
        const order = classified.orderComparison;
        if (order === "older") {
          // B is older than A
          const bTitle = isBMale ? `Anh${ordinalB}` : `Chị${ordinalB}`;
          return {
            aCallsB: bTitle,
            bCallsA: "Em",
            aSelfReference: "Em",
            bSelfReference: isBMale ? "Anh" : "Chị",
            status: "confirmed",
            alternativeTerms: isBMale ? ["Anh Hai", "Anh"] : ["Chị Hai", "Chị"],
          };
        } else if (order === "younger") {
          // B is younger than A
          const aTitle = isAMale ? `Anh${ordinalA}` : `Chị${ordinalA}`;
          return {
            aCallsB: `Em${ordinalB}`,
            bCallsA: aTitle,
            aSelfReference: isAMale ? "Anh" : "Chị",
            bSelfReference: "Em",
            status: "confirmed",
            alternativeTerms: ["Em"],
          };
        } else {
          // Unknown order
          return {
            aCallsB: isBMale ? "Anh" : isBFemale ? "Chị" : "Anh/Chị/Em",
            bCallsA: isAMale ? "Anh" : isAFemale ? "Chị" : "Anh/Chị/Em",
            aSelfReference: "Tôi",
            bSelfReference: "Tôi",
            status: "ambiguous",
            alternativeTerms: ["Anh", "Chị", "Em"],
            ambiguityDetails: {
              missingInfo: ["Thứ tự sinh (ngày sinh hoặc ngôi thứ trong gia đình) giữa hai anh chị em"],
              candidates: [
                { term: isBMale ? "Anh" : "Chị", condition: "Nếu người này lớn tuổi hơn bạn" },
                { term: "Em", condition: "Nếu người này nhỏ tuổi hơn bạn" },
              ],
            },
          };
        }
      }

      case "PATERNAL_GRANDFATHER":
        return {
          aCallsB: prefs.paternalGrandfatherTerm,
          bCallsA: "Cháu nội",
          aSelfReference: "Cháu",
          bSelfReference: "Ông",
          status: "confirmed",
          alternativeTerms: ["Ông", "Nội"],
        };

      case "PATERNAL_GRANDMOTHER":
        return {
          aCallsB: prefs.paternalGrandmotherTerm,
          bCallsA: "Cháu nội",
          aSelfReference: "Cháu",
          bSelfReference: "Bà",
          status: "confirmed",
          alternativeTerms: ["Bà", "Nội"],
        };

      case "MATERNAL_GRANDFATHER":
        return {
          aCallsB: prefs.maternalGrandfatherTerm,
          bCallsA: "Cháu ngoại",
          aSelfReference: "Cháu",
          bSelfReference: "Ông",
          status: "confirmed",
          alternativeTerms: ["Ông", "Ngoại"],
        };

      case "MATERNAL_GRANDMOTHER":
        return {
          aCallsB: prefs.maternalGrandmotherTerm,
          bCallsA: "Cháu ngoại",
          aSelfReference: "Cháu",
          bSelfReference: "Bà",
          status: "confirmed",
          alternativeTerms: ["Bà", "Ngoại"],
        };

      case "GRANDCHILD": {
        const title = classified.lineage === "paternal" ? "Cháu nội" : "Cháu ngoại";
        return {
          aCallsB: title,
          bCallsA: isAMale ? "Ông" : "Bà",
          aSelfReference: isAMale ? "Ông" : "Bà",
          bSelfReference: "Cháu",
          status: "confirmed",
          alternativeTerms: ["Cháu"],
        };
      }

      case "PATERNAL_GREAT_GRANDPARENT":
        return {
          aCallsB: isBMale ? "Ông cố" : "Bà cố",
          bCallsA: "Chắt",
          aSelfReference: "Chắt",
          bSelfReference: "Cố",
          status: "confirmed",
          alternativeTerms: ["Cố", isBMale ? "Cố ông" : "Cố bà"],
        };

      case "MATERNAL_GREAT_GRANDPARENT":
        return {
          aCallsB: isBMale ? "Ông cố ngoại" : "Bà cố ngoại",
          bCallsA: "Chắt ngoại",
          aSelfReference: "Chắt",
          bSelfReference: "Cố",
          status: "confirmed",
          alternativeTerms: ["Ông cố", "Bà cố", "Cố"],
        };

      case "GREAT_GRANDCHILD":
        return {
          aCallsB: "Chắt",
          bCallsA: isBMale ? "Ông cố" : "Bà cố",
          aSelfReference: "Cố",
          bSelfReference: "Chắt",
          status: "confirmed",
          alternativeTerms: ["Chắt nội", "Chắt ngoại"],
        };

      case "GREAT_GREAT_GRANDPARENT":
        return {
          aCallsB: isBMale ? "Ông sơ" : "Bà sơ",
          bCallsA: "Chút",
          aSelfReference: "Chút",
          bSelfReference: "Sơ",
          status: "confirmed",
          alternativeTerms: ["Sơ"],
        };

      case "GREAT_GREAT_GRANDCHILD":
        return {
          aCallsB: "Chút",
          bCallsA: isBMale ? "Ông sơ" : "Bà sơ",
          aSelfReference: "Sơ",
          bSelfReference: "Chút",
          status: "confirmed",
          alternativeTerms: ["Chít"],
        };

      case "PATERNAL_ELDER_UNCLE":
        return {
          aCallsB: `${prefs.paternalMaleElderTerm}${ordinalB}`,
          bCallsA: "Cháu",
          aSelfReference: "Cháu",
          bSelfReference: "Bác",
          status: "confirmed",
          alternativeTerms: ["Bác Hai", "Bác trai", "Bác"],
        };

      case "PATERNAL_YOUNGER_UNCLE":
        return {
          aCallsB: `${prefs.paternalMaleYoungerTerm}${ordinalB}`,
          bCallsA: "Cháu",
          aSelfReference: "Cháu",
          bSelfReference: "Chú",
          status: "confirmed",
          alternativeTerms: ["Chú Ba", "Chú Út", "Chú"],
        };

      case "PATERNAL_AUNT":
        return {
          aCallsB: `${prefs.paternalFemaleTerm}${ordinalB}`,
          bCallsA: "Cháu",
          aSelfReference: "Cháu",
          bSelfReference: "Cô",
          status: "confirmed",
          alternativeTerms: ["Cô Ba", "Cô Út", "Cô"],
        };

      case "MATERNAL_UNCLE":
        return {
          aCallsB: `${prefs.maternalMaleTerm}${ordinalB}`,
          bCallsA: "Cháu",
          aSelfReference: "Cháu",
          bSelfReference: "Cậu",
          status: "confirmed",
          alternativeTerms: ["Cậu Ba", "Cậu Bảy", "Cậu Út", "Cậu"],
        };

      case "MATERNAL_AUNT":
        return {
          aCallsB: `${prefs.maternalFemaleTerm}${ordinalB}`,
          bCallsA: "Cháu",
          aSelfReference: "Cháu",
          bSelfReference: "Dì",
          status: "confirmed",
          alternativeTerms: ["Dì Hai", "Dì Ba", "Dì Út", "Dì"],
        };

      case "NIECE_NEPHEW": {
        const aUncleTitle = isAMale ? "Bác/Chú/Cậu" : "Cô/Dì";
        return {
          aCallsB: "Cháu",
          bCallsA: aUncleTitle,
          aSelfReference: aUncleTitle,
          bSelfReference: "Cháu",
          status: "confirmed",
          alternativeTerms: ["Cháu ruột"],
        };
      }

      case "FIRST_COUSIN": {
        // First cousins (Anh chị em họ):
        // According to Southern Vietnamese custom:
        // Priority 1: If branch seniority is prioritized and known
        let aCallsB = "";
        let bCallsA = "";
        let aSelf = "";
        let bSelf = "";
        let status: KinshipStatus = "confirmed";
        const missing: string[] = [];
        const candidates: { term: string; condition: string }[] = [];

        if (prefs.prioritizeBranchSeniority && classified.branchSeniority !== "unknown") {
          if (classified.branchSeniority === "senior") {
            // B's branch is senior -> B is Anh/Chị regardless of age
            aCallsB = isBMale ? `Anh họ${ordinalB}` : `Chị họ${ordinalB}`;
            bCallsA = "Em họ";
            aSelf = "Em";
            bSelf = isBMale ? "Anh" : "Chị";
          } else {
            // B's branch is junior -> B is Em
            aCallsB = `Em họ${ordinalB}`;
            bCallsA = isAMale ? "Anh họ" : "Chị họ";
            aSelf = isAMale ? "Anh" : "Chị";
            bSelf = "Em";
          }
        } else if (classified.orderComparison !== "unknown") {
          // If based on age or order
          if (classified.orderComparison === "older") {
            aCallsB = isBMale ? `Anh họ${ordinalB}` : `Chị họ${ordinalB}`;
            bCallsA = "Em họ";
            aSelf = "Em";
            bSelf = isBMale ? "Anh" : "Chị";
          } else {
            aCallsB = `Em họ${ordinalB}`;
            bCallsA = isAMale ? "Anh họ" : "Chị họ";
            aSelf = isAMale ? "Anh" : "Chị";
            bSelf = "Em";
          }
        } else {
          // Ambiguous
          status = "ambiguous";
          aCallsB = isBMale ? "Anh họ" : isBFemale ? "Chị họ" : "Anh/Chị/Em họ";
          bCallsA = isAMale ? "Anh họ" : isAFemale ? "Chị họ" : "Anh/Chị/Em họ";
          aSelf = "Tôi";
          bSelf = "Tôi";
          missing.push("Thứ bậc nhánh họ (cành anh / cành em) hoặc năm sinh của hai người");
          candidates.push(
            { term: isBMale ? "Anh họ" : "Chị họ", condition: "Nếu thuộc cành trên hoặc lớn tuổi hơn" },
            { term: "Em họ", condition: "Nếu thuộc cành dưới hoặc nhỏ tuổi hơn" }
          );
        }

        return {
          aCallsB,
          bCallsA,
          aSelfReference: aSelf,
          bSelfReference: bSelf,
          status,
          alternativeTerms: ["Anh em bạn chú bác", "Anh em con cô con cậu", "Anh em con cậu con dì"],
          ambiguityDetails: missing.length > 0 ? { missingInfo: missing, candidates } : undefined,
        };
      }

      case "COUSIN_REMOVED": {
        // Cousin once/twice removed (different generations)
        const genDiff = classified.generationDiff;
        if (genDiff > 0) {
          // B is 1+ generations below A
          return {
            aCallsB: "Cháu họ",
            bCallsA: isAMale ? "Chú/Bác họ" : "Cô/Dì họ",
            aSelfReference: isAMale ? "Chú" : "Cô",
            bSelfReference: "Cháu",
            status: "confirmed",
            alternativeTerms: ["Cháu"],
          };
        } else {
          // B is 1+ generations above A
          const isPaternal = classified.lineage === "paternal";
          const title = isBMale ? (isPaternal ? "Bác/Chú họ" : "Cậu họ") : (isPaternal ? "Cô họ" : "Dì họ");
          return {
            aCallsB: title,
            bCallsA: "Cháu họ",
            aSelfReference: "Cháu",
            bSelfReference: title,
            status: "confirmed",
            alternativeTerms: [title],
          };
        }
      }

      case "FATHER_IN_LAW":
        return {
          aCallsB: isAMale ? "Ba vợ" : "Ba chồng",
          bCallsA: isAMale ? "Con rể" : "Con dâu",
          aSelfReference: "Con",
          bSelfReference: "Ba",
          status: "confirmed",
          alternativeTerms: ["Ba", "Bố"],
        };

      case "MOTHER_IN_LAW":
        return {
          aCallsB: isAMale ? "Má vợ" : "Má chồng",
          bCallsA: isAMale ? "Con rể" : "Con dâu",
          aSelfReference: "Con",
          bSelfReference: "Má",
          status: "confirmed",
          alternativeTerms: ["Má", "Mẹ"],
        };

      case "SON_IN_LAW":
        return {
          aCallsB: "Con rể",
          bCallsA: isAMale ? "Ba" : "Má",
          aSelfReference: isAMale ? "Ba" : "Má",
          bSelfReference: "Con",
          status: "confirmed",
          alternativeTerms: ["Con"],
        };

      case "DAUGHTER_IN_LAW":
        return {
          aCallsB: "Con dâu",
          bCallsA: isAMale ? "Ba" : "Má",
          aSelfReference: isAMale ? "Ba" : "Má",
          bSelfReference: "Con",
          status: "confirmed",
          alternativeTerms: ["Con"],
        };

      case "AUNT_BY_MARRIAGE": {
        // Thím (vợ chú) or Mợ (vợ cậu) or Bác gái (vợ bác)
        let title = "Thím";
        if (classified.lineage === "maternal") {
          title = "Mợ";
        }
        return {
          aCallsB: `${title}${ordinalB}`,
          bCallsA: "Cháu",
          aSelfReference: "Cháu",
          bSelfReference: title,
          status: "confirmed",
          alternativeTerms: [title, "Bác gái"],
        };
      }

      case "UNCLE_BY_MARRIAGE":
        return {
          aCallsB: `Dượng${ordinalB}`,
          bCallsA: "Cháu",
          aSelfReference: "Cháu",
          bSelfReference: "Dượng",
          status: "confirmed",
          alternativeTerms: ["Dượng", "Bác rể"],
        };

      case "BROTHER_IN_LAW": {
        const order = classified.orderComparison;
        const title = order === "younger" ? "Em rể" : "Anh rể";
        return {
          aCallsB: title,
          bCallsA: isAMale ? (order === "younger" ? "Anh" : "Em") : (order === "younger" ? "Chị" : "Em"),
          aSelfReference: isAMale ? "Anh" : "Chị",
          bSelfReference: "Em",
          status: "confirmed",
          alternativeTerms: [title],
        };
      }

      case "SISTER_IN_LAW": {
        const order = classified.orderComparison;
        const title = order === "younger" ? "Em dâu" : "Chị dâu";
        return {
          aCallsB: title,
          bCallsA: isAMale ? (order === "younger" ? "Anh" : "Em") : (order === "younger" ? "Chị" : "Em"),
          aSelfReference: isAMale ? "Anh" : "Chị",
          bSelfReference: "Em",
          status: "confirmed",
          alternativeTerms: [title],
        };
      }

      case "CO_IN_LAW":
        return {
          aCallsB: "Thông gia",
          bCallsA: "Thông gia",
          aSelfReference: "Tôi",
          bSelfReference: "Tôi",
          status: "confirmed",
          alternativeTerms: ["Anh/chị sui", "Ông bà sui", "Bác sui"],
        };

      default:
        return {
          aCallsB: null,
          bCallsA: null,
          aSelfReference: "Tôi",
          bSelfReference: "Tôi",
          status: "unknown",
          alternativeTerms: [],
          ambiguityDetails: {
            missingInfo: ["Mối liên kết gia phả giữa hai người chưa xác định được trên sơ đồ."],
          },
        };
    }
  }
}
