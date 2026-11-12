const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/FacilityDataPage-DKo_i5ux.js","assets/vendor-motion-DgC1stbS.js","assets/icons-BxQpodNr.js","assets/index-CBV6wOh8.js","assets/vendor-jspdf-BarNdCns.js","assets/vendor-charts--qXk384P.js","assets/index-CneVNiou.css","assets/AppShell-CP099uvN.js","assets/NqasLogo-CIWlMexW.js","assets/label-BaPkqXdo.js","assets/shareLink-_K-oJu5R.js","assets/dropdown-menu-N0nU9bdA.js","assets/trackerColumns-8Ekg9xb3.js","assets/FilterDropdown-B_vJKp6C.js","assets/masterFilter-DrauVhuN.js","assets/today-D9v8Esj5.js","assets/select-qTILnHQg.js","assets/input-Cy2oZLur.js","assets/textarea-Dm9kSFQo.js","assets/table-DH4Byhhd.js","assets/AttachmentPicker-B8WtH0vb.js","assets/StatusBadge-BPGGn135.js","assets/badge-Cc2gQHFR.js","assets/DateInput-DZAT80St.js","assets/dialog-BW3GEiPg.js","assets/dateInput-0KZh0HdG.js","assets/filters-BlRAASYu.js","assets/FacilityTypeBadge-8G3otPEU.js","assets/tableHeaders-CRNjYwbN.js","assets/exportTable-BCt2u4fE.js","assets/FacilityProfile-DysCsXqm.js","assets/FacilityList-Dm-USj3q.js","assets/UniversalFilterBar-uuD2kW1Y.js","assets/alert-dialog-CzPxJ0pO.js","assets/masterGrid-CjX4ti61.js","assets/ExportDialog-Dhw8AWo1.js","assets/index-BALjev1w.js","assets/FacilityQuickView-D07vvNqK.js","assets/skeleton-D-jVDmpg.js","assets/PdfCanvasViewer-C0MZuH_2.js","assets/DocumentField-4d87_sVm.js","assets/scoreBands-CA46Kez8.js","assets/phone-C-n0eG_z.js","assets/FacilityCell-CI45DpPw.js","assets/facilityQuickView-BCxVjMPj.js","assets/facilityProfileState-D76_z1Ay.js","assets/SaveBar--TNBfs1X.js","assets/checkbox-CjOYMc2v.js","assets/masterExport-Dlb4N-po.js","assets/org-DjtYn14q.js","assets/facilitySheet-LEzrIYOJ.js","assets/buildingBuckets-CQds7ysI.js","assets/tableDisplay-Bmg1sKyc.js","assets/PageShell-CaOvGLdi.js","assets/profileExport-Da96eYWE.js","assets/vendor-exceljs-CqnmHTS6.js","assets/tabs-siU4Pie8.js","assets/DocumentSlot-DLNae2Gb.js","assets/LazyResultReadDialog-BIkWLeOK.js","assets/scheduleVisit-DGvqEZ_U.js"])))=>i.map(i=>d[i]);
import { _ as __vitePreload } from './vendor-jspdf-BarNdCns.js';
import { j as jsxRuntimeExports } from './vendor-motion-DgC1stbS.js';
import { r as reactExports, L as LoaderCircle } from './icons-BxQpodNr.js';
import { n as useParams, N as Navigate } from './index-CBV6wOh8.js';
import './vendor-charts--qXk384P.js';

const CATEGORY_SEGMENTS = /* @__PURE__ */ new Set([
  "certification",
  "state-assessment",
  "recertification",
  "internal-assessment",
  "fund",
  "building",
  "fire-noc"
]);
const FacilityDataPage = reactExports.lazy(() => __vitePreload(() => import('./FacilityDataPage-DKo_i5ux.js'),true              ?__vite__mapDeps([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29]):void 0));
const FacilityProfile = reactExports.lazy(() => __vitePreload(() => import('./FacilityProfile-DysCsXqm.js'),true              ?__vite__mapDeps([30,1,2,3,4,5,6,7,8,9,10,21,22,31,32,24,17,18,33,16,11,14,15,13,26,34,35,36,37,38,39,40,41,42,23,25,20,43,27,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59]):void 0));
function PageFallback() {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-center py-24", children: /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-6 animate-spin text-muted-foreground" }) });
}
function FacilityRouteDispatcher() {
  const params = useParams();
  const seg = (params["*"] ?? "").split("/")[0];
  if (seg === "nqas-assessment") {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Navigate, { to: "/facilities/certification", replace: true });
  }
  if (CATEGORY_SEGMENTS.has(seg)) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(reactExports.Suspense, { fallback: /* @__PURE__ */ jsxRuntimeExports.jsx(PageFallback, {}), children: /* @__PURE__ */ jsxRuntimeExports.jsx(FacilityDataPage, {}) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(reactExports.Suspense, { fallback: /* @__PURE__ */ jsxRuntimeExports.jsx(PageFallback, {}), children: /* @__PURE__ */ jsxRuntimeExports.jsx(FacilityProfile, {}) });
}

export { FacilityRouteDispatcher as default };
