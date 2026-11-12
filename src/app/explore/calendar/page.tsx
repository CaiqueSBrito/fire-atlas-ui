import { Suspense } from "react";
import { CalendarSkeleton } from "@/features/calendar/components/calendar-skeleton";
import { CalendarView } from "@/features/calendar/components/calendar-view";

export default function Page() {
  return (
    <Suspense fallback={<CalendarSkeleton />}>
      <CalendarView />
    </Suspense>
  );
}
