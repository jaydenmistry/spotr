import type { Role } from "@/lib/roles";

// The role rides in the JWT for UI hints (e.g. hiding admin-only nav) and is
// refreshed from the database on every session check (src/lib/auth.ts);
// admin-only routes re-check it with requireAdmin().
declare module "next-auth" {
  interface User {
    role?: Role;
    sessionVersion?: number;
  }
  interface Session {
    user?: {
      /** The User row's id (the JWT's `sub`). */
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: Role;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: Role;
    sessionVersion?: number;
  }
}
