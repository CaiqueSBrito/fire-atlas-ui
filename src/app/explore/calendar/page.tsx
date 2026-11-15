import { Suspense } from "react";
import { CalendarSkeleton } from "@/features/calendar/components/calendar-skeleton";
import { CalendarView } from "@/features/calendar/components/calendar-view";
import { AnnualDataGate } from "@/providers/annual-data-gate";

export default function Page() {
  return (
    <AnnualDataGate>
      <Suspense fallback={<CalendarSkeleton />}>
        <CalendarView />
      </Suspense>
    </AnnualDataGate>
  );
}
