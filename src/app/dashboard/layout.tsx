import { connection } from "next/server";
import { DashboardShell } from "./DashboardShell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Render per request so the proxy's CSP nonce reaches every script.
  await connection();
  return <DashboardShell>{children}</DashboardShell>;
}
