import { Suspense, lazy } from "react";
import { Navigate, useParams } from "react-router";
import { Loader2 } from "lucide-react";

/** Categories served by the quick-view page (same shape as the :category
 *  param) — anything else is a facility profile. */
const CATEGORY_SEGMENTS = new Set([
  "certification",
  "state-assessment",
  "recertification",
  "internal-assessment",
  "fund",
  "building",
  "fire-noc",
]);

/** The NQAS Assessment page merged into NQAS Certification — old links land
 *  on the combined page instead of a dead category. */

const FacilityDataPage = lazy(() => import("./FacilityDataPage"));
const FacilityProfile = lazy(() => import("./FacilityProfile"));

function PageFallback() {
  return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}

/** Router-level dispatcher: `/facilities/<category>` opens the category
 *  quick-view page; `/facilities/<id>` opens the facility profile. Two
 *  sibling dynamic routes with the same rank would be ambiguous — this
 *  keeps both URLs working through one route. */
export default function FacilityRouteDispatcher() {
  const params = useParams<{ "*": string }>();
  const seg = (params["*"] ?? "").split("/")[0];
  if (seg === "nqas-assessment") {
    return <Navigate to="/facilities/certification" replace />;
  }
  if (CATEGORY_SEGMENTS.has(seg)) {
    return (
      <Suspense fallback={<PageFallback />}>
        <FacilityDataPage />
      </Suspense>
    );
  }
  return (
    <Suspense fallback={<PageFallback />}>
      <FacilityProfile />
    </Suspense>
  );
}
