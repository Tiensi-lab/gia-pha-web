import { ClassifiedRelationship } from "./kinshipClassifier";
import { FamilyGraph } from "../graph/familyGraph";
import { Person } from "../models/person";
import { NamingPreferences } from "../models/naming";

export class KinshipExplainer {
  public static explain(
    classified: ClassifiedRelationship,
    personA: Person,
    personB: Person,
    graph: FamilyGraph,
    prefs: NamingPreferences
  ): string {
    const nameA = personA.fullName || "Người A";
    const nameB = personB.fullName || "Người B";

    switch (classified.type) {
      case "SELF":
        return `${nameA} là chính bản thân người được chọn.`;

      case "FATHER":
        return `${nameB} là cha (ba) ruột của ${nameA}. Quan hệ huyết thống trực hệ bậc 1 bên nội.`;

      case "MOTHER":
        return `${nameB} là mẹ (má) ruột của ${nameA}. Quan hệ huyết thống trực hệ bậc 1 bên ngoại.`;

      case "SON":
        return `${nameB} là con trai của ${nameA}. Quan hệ huyết thống trực hệ đời sau bậc 1.`;

      case "DAUGHTER":
        return `${nameB} là con gái của ${nameA}. Quan hệ huyết thống trực hệ đời sau bậc 1.`;

      case "SPOUSE":
        return `${nameA} và ${nameB} có quan hệ hôn phối (vợ chồng).`;

      case "FULL_SIBLING": {
        const orderText = classified.orderComparison === "older"
          ? `${nameB} là anh/chị ruột (sinh trước)`
          : classified.orderComparison === "younger"
          ? `${nameB} là em ruột (sinh sau)`
          : `Hai người là anh chị em ruột (cùng cha và mẹ)`;
        return `${orderText} của ${nameA}.`;
      }

      case "HALF_SIBLING": {
        const lineageText = classified.lineage === "paternal" ? "cùng cha khác mẹ" : "cùng mẹ khác cha";
        return `${nameA} và ${nameB} là anh chị em cùng huyết thống một bề (${lineageText}).`;
      }

      case "PROVISIONAL_SIBLING":
        return `${nameA} và ${nameB} được ghi nhận là anh chị em theo lời truyền hoặc hồ sơ tạm thời, chưa có thông tin chính thức về cha mẹ chung trong gia phả.`;

      case "PATERNAL_GRANDFATHER":
        return `${nameB} là ông nội (cha của cha) của ${nameA}. Quan hệ trực hệ 2 đời bên nội.`;

      case "PATERNAL_GRANDMOTHER":
        return `${nameB} là bà nội (mẹ của cha) của ${nameA}. Quan hệ trực hệ 2 đời bên nội.`;

      case "MATERNAL_GRANDFATHER":
        return `${nameB} là ông ngoại (cha của mẹ) của ${nameA}. Quan hệ trực hệ 2 đời bên ngoại.`;

      case "MATERNAL_GRANDMOTHER":
        return `${nameB} là bà ngoại (mẹ của mẹ) của ${nameA}. Quan hệ trực hệ 2 đời bên ngoại.`;

      case "GRANDCHILD":
        return `${nameB} là cháu trực hệ đời thứ 3 của ${nameA} (${classified.lineage === "paternal" ? "cháu nội" : "cháu ngoại"}).`;

      case "PATERNAL_GREAT_GRANDPARENT":
        return `${nameB} là cụ/cố nội (cha/mẹ của ông bà nội) của ${nameA}. Quan hệ trực hệ 3 đời.`;

      case "MATERNAL_GREAT_GRANDPARENT":
        return `${nameB} là cụ/cố ngoại (cha/mẹ của ông bà ngoại) của ${nameA}. Quan hệ trực hệ 3 đời.`;

      case "GREAT_GRANDCHILD":
        return `${nameB} là chắt của ${nameA} (cách 3 thế hệ trực hệ).`;

      case "GREAT_GREAT_GRANDPARENT":
        return `${nameB} là ông/bà sơ của ${nameA} (cách 4 thế hệ trở lên trong dòng họ).`;

      case "GREAT_GREAT_GRANDCHILD":
        return `${nameB} là chút/chít của ${nameA} (thế hệ thứ 5 trở đi).`;

      case "PATERNAL_ELDER_UNCLE":
        return `${nameB} là anh trai của cha ${nameA} (bác ruột bên nội). Theo phong tục Nam Bộ, xưng hô là Bác.`;

      case "PATERNAL_YOUNGER_UNCLE":
        return `${nameB} là em trai của cha ${nameA} (chú ruột bên nội). Theo phong tục Nam Bộ, xưng hô là Chú.`;

      case "PATERNAL_AUNT":
        return `${nameB} là chị/em gái của cha ${nameA} (cô ruột bên nội). Theo phong tục Nam Bộ, xưng hô là Cô.`;

      case "MATERNAL_UNCLE":
        return `${nameB} là anh/em trai của mẹ ${nameA} (cậu ruột bên ngoại). Theo phong tục Nam Bộ, xưng hô là Cậu.`;

      case "MATERNAL_AUNT":
        return `${nameB} là chị/em gái của mẹ ${nameA} (dì ruột bên ngoại). Theo phong tục Nam Bộ, xưng hô là Dì.`;

      case "NIECE_NEPHEW":
        return `${nameB} là con của anh/chị/em ruột của ${nameA} (cháu ruột).`;

      case "FIRST_COUSIN": {
        const side = classified.lineage === "paternal"
          ? "bên nội (anh em chú bác / con cô con chú)"
          : classified.lineage === "maternal"
          ? "bên ngoại (anh em con cậu con dì)"
          : "hai nhánh nội ngoại phối hợp";

        let seniorityReason = "";
        if (prefs.prioritizeBranchSeniority && classified.branchSeniority !== "unknown") {
          seniorityReason = classified.branchSeniority === "senior"
            ? " Do nhánh cha/mẹ của người B là cành anh/chị (bề trên), người A gọi người B là Anh/Chị họ theo tập quán tôn trọng thứ bậc chi họ ('vai vế cành trên')."
            : " Do nhánh cha/mẹ của người A là cành anh/chị (bề trên), người A gọi người B là Em họ.";
        } else if (classified.orderComparison !== "unknown") {
          seniorityReason = classified.orderComparison === "older"
            ? ` ${nameB} lớn tuổi hơn nên xưng hô là Anh/Chị họ.`
            : ` ${nameB} nhỏ tuổi hơn nên xưng hô là Em họ.`;
        } else {
          seniorityReason = " Chưa rõ thông tin ngôi thứ cành trên/dưới hoặc ngày sinh để xác định chính xác vai anh hay em.";
        }

        return `${nameA} và ${nameB} là anh chị em họ đời thứ nhất ${side}.${seniorityReason}`;
      }

      case "COUSIN_REMOVED": {
        const gen = Math.abs(classified.generationDiff);
        const direction = classified.generationDiff > 0 ? "đời sau" : "đời trước";
        return `${nameA} và ${nameB} có họ hàng với nhau nhưng chênh lệch ${gen} thế hệ (${direction}).`;
      }

      case "DISTANT_COUSIN":
        return `${nameA} và ${nameB} có cùng tổ tiên chung trong gia phả, thuộc quan hệ anh chị em họ đời xa.`;

      case "FATHER_IN_LAW":
      case "MOTHER_IN_LAW":
        return `${nameB} là cha/mẹ của người phối ngẫu (vợ hoặc chồng) của ${nameA}. Quan hệ thông thuộc hôn nhân.`;

      case "SON_IN_LAW":
        return `${nameB} là chồng của con gái ${nameA} (con rể).`;

      case "DAUGHTER_IN_LAW":
        return `${nameB} là vợ của con trai ${nameA} (con dâu).`;

      case "AUNT_BY_MARRIAGE":
        return `${nameB} là vợ của chú/cậu/bác của ${nameA} (thím, mợ hoặc bác dâu theo hôn nhân).`;

      case "UNCLE_BY_MARRIAGE":
        return `${nameB} là chồng của cô/dì của ${nameA} (dượng theo hôn nhân).`;

      case "BROTHER_IN_LAW":
      case "SISTER_IN_LAW":
        return `${nameB} là người phối ngẫu của anh/chị/em của ${nameA} (anh/em rể hoặc chị/em dâu).`;

      case "CO_IN_LAW":
        return `${nameA} và ${nameB} là hai gia đình có con cái kết hôn cùng nhau (quan hệ sui gia / thông gia).`;

      default:
        return `Chưa phát hiện đường nối trực tiếp hoặc họ hàng gần giữa ${nameA} và ${nameB} trong dữ liệu gia phả hiện tại.`;
    }
  }
}
