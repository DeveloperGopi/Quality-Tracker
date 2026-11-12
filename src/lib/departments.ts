/**
 * DEPARTMENTS OR SERVICE PACKAGES — ONE rule for every surface.
 *
 * HWC HSC (a Health & Wellness sub-centre) is assessed against the 12 service
 * packages, not the hospital department list (OPD, Labour Room, OT…). Every
 * count and every "Not assessed" name must come from the SAME list, or the
 * sheet reads "1 of 6 · 12 Service Packages" while the PHC departments are
 * printed underneath.
 *
 * `departmentsForFacility` is pure and used by the master-row builder, the
 * profile sheet adapter and the facility sheet. The package names are the
 * Admin-editable default; a saved `servicePackages` list wins.
 */

export const HWC_SERVICE_PACKAGES: readonly string[] = [
  "Antenatal & Postnatal Care",
  "Newborn & Child Health",
  "Family Planning",
  "Adolescent Health",
  "Immunization",
  "Communicable Diseases",
  "Non-Communicable Diseases",
  "Mental Health",
  "Elderly & Palliative Care",
  "Emergency & Referral",
  "Oral, Eye & ENT Care",
  "Health Promotion & Wellness",
] as const;

export function isServicePackageFacility(facilityType: string | null | undefined): boolean {
  return (facilityType ?? "").trim().toUpperCase() === "HWC HSC";
}

/**
 * The effective list for a facility. An HWC HSC ALWAYS gets the 12 packages —
 * a stale settings list of hospital departments is ignored. Any other type
 * gets the configured department list.
 */
export function departmentsForFacility(
  facilityType: string | null | undefined,
  configuredDepartments: readonly string[] | null | undefined,
  configuredPackages: readonly string[] | null | undefined = null,
): string[] {
  if (isServicePackageFacility(facilityType)) {
    const saved = (configuredPackages ?? []).map((p) => p.trim()).filter(Boolean);
    return saved.length ? saved : [...HWC_SERVICE_PACKAGES];
  }
  const depts = (configuredDepartments ?? []).map((d) => d.trim()).filter(Boolean);
  return depts.length ? depts : [];
}

/** The label the sheet/table uses for the list ("service packages" / "departments"). */
export function departmentNoun(facilityType: string | null | undefined): string {
  return isServicePackageFacility(facilityType) ? "service packages" : "departments";
}
