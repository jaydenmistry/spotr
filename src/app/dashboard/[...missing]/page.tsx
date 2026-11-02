import { notFound } from "next/navigation";

// Unknown dashboard URLs would otherwise get the root 404, which is
// prerendered without the CSP nonce; this keeps them inside the dashboard.
export default function MissingDashboardPage() {
  notFound();
}
