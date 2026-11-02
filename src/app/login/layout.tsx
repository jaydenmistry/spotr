import { connection } from "next/server";

export default async function LoginLayout({ children }: { children: React.ReactNode }) {
  // Render per request so the proxy's CSP nonce reaches every script.
  await connection();
  return children;
}
