/**
 * IA QUARTERLY PANEL — the Facility Profile's Internal Assessment section.
 * One shared IACard, fed by the quarters the profile already renders.
 */

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent } from "@/components/ui/card";
import { IaCardSkeleton, IACard } from "@/components/ia/IACard";

export function IaQuarterlyPanel({
  facilityId,
  className,
  settings,
  userId,
  canImport,
}: {
  facilityId: string;
  className?: string;
  settings?: Record<string, unknown> | null;
  userId?: string | null;
  canImport?: boolean;
}) {
  const quarters = useQuery(api.ia.listFacilityIaQuarters, {
    facilityId: facilityId as Id<"facilities">,
  });

  return (
    <Card className={`glass overflow-hidden ${className ?? ""}`}>
      <CardContent className="p-4">
        {quarters === undefined ? (
          <IaCardSkeleton />
        ) : (
          <IACard
            rows={quarters}
            settings={settings}
            userId={userId}
            canImport={canImport ?? false}
          />
        )}
      </CardContent>
    </Card>
  );
}
