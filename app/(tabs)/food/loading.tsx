import PageSkeleton from "@/components/PageSkeleton";

// Shown instantly while the Nutrition page loads (see PageSkeleton).
export default function Loading() {
  return <PageSkeleton title="Nutrition" cards={[76, 88, 160, 48]} />;
}
