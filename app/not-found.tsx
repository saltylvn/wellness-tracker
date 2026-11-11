import ErrorScreen from "@/components/ErrorScreen";

// Any address the app doesn't have (or a page that calls notFound()).
export default function NotFound() {
  return <ErrorScreen title="Page not found" message="That page doesn't exist. It may have moved." />;
}
