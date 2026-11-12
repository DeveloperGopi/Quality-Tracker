import { describe, expect, test } from "bun:test";

import { matchAnnexureFacility, type ParsedAnnexureSection } from "../src/lib/annexureParse";
import { parseTargetResultLetter, type ResultPageText } from "../src/lib/resultParse";

const letterPage: ResultPageText = {
  pageNumber: 1,
  confidence: 94,
  topRightText: "24-Dec-2025",
  text: [
    "Government of Tamil Nadu",
    "National Quality Assurance Standards",
    "Name of the Facility Date of Assessment Mode Overall Score Certification Status Departments/Packages Criteria",
    "1 AAM-SHC Agaram, Tirupathur, Tamil Nadu 29-Nov-2025 to 29-Nov-2025 Physical 91.28% Quality Certified 12 Service Packages Met 6 out of 6 Criteria",
    "2 AAM-PHC Athanavur, Tirupathur, Tamil Nadu 28-Nov-2025 to 28-Nov-2025 Physical 88.10% Quality Certified 10 Service Packages Met 5 out of 6",
    "Note: this is a system generated report.",
    "Aggregate score of the health facility 92.42%",
  ].join("\n"),
};

describe("Agaram NQAS regression", () => {
  test("reads the facility row without mixing it with the next facility", () => {
    const rows = parseTargetResultLetter([letterPage], {
      name: "AAM-SHC Agaram",
      facilityType: "SHC",
    });
    expect(rows).toHaveLength(1);
    const row = rows[0]!;
    expect(row.facilityNameRaw).toContain("Agaram");
    expect(row.district?.toLowerCase()).toContain("tirupathur");
    expect(row.pageNumber).toBe(1);
  });

  test("uses 91.28% as the overall score, never the 92.42% criterion value", () => {
    const [row] = parseTargetResultLetter([letterPage], { name: "AAM-SHC Agaram" });
    expect(row?.overallScore).toBe(91.28);
    expect(row?.overallScore).not.toBe(92.42);
  });

  test("keeps the letter and assessment dates, status and package count", () => {
    const [row] = parseTargetResultLetter([letterPage], { name: "AAM-SHC Agaram" });
    expect(row?.letterDate).toBe("2025-12-24");
    expect(row?.assessmentStartDate).toBe("2025-11-29");
    expect(row?.certificationStatus).toBe("Quality Certified");
    expect(row?.packageCount).toBe(12);
    expect(row?.criteriaMet).toBe(6);
    expect(row?.criteriaTotal).toBe(6);
  });

  test("facility matching picks the printed Agaram facility and not a lookalike", () => {
    const parsed = {
      facilityNameRaw: "AAM-SHC Agaram, Tirupathur, Tamil Nadu",
      district: "Tirupathur",
      state: "Tamil Nadu",
      title: "AAM-SHC Agaram, Tirupathur, Tamil Nadu",
      pageNumber: 8,
      letterScore: null,
      overallScore: 91.28,
      pssScore: null,
      areas: [],
      departments: [],
      departmentsKind: "package" as const,
      criteriaMet: 6,
      criteriaTotal: 6,
      warnings: [],
    } satisfies ParsedAnnexureSection;
    const match = matchAnnexureFacility(parsed, [
      {
        _id: "agaram",
        name: "AAM-SHC Agaram",
        block: "Tirupathur",
        phc: "Agaram",
        facilityType: "SHC",
      },
      {
        _id: "other",
        name: "AAM-SHC Athanavur",
        block: "Vaniyambadi",
        phc: "Athanavur",
        facilityType: "SHC",
      },
    ]);
    expect(match.status).toBe("matched");
    expect(match.facility?._id).toBe("agaram");
  });
});
