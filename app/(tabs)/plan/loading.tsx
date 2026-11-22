import PageSkeleton from "@/components/PageSkeleton";

// Shown instantly while the Plan tab loads (see PageSkeleton).
export default function Loading() {
  return <PageSkeleton title="Plan" cards={[40, 150, 150, 150]} />;
}
