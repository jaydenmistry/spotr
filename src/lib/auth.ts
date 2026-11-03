import { NextResponse } from "next/server";
import { getServerSession, type AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { isAdmin, isRole } from "@/lib/roles";

const LOGIN_ATTEMPTS_PER_WINDOW = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const SESSION_MAX_AGE_SECONDS = 12 * 60 * 60;

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const ip = clientIp(req?.headers ?? {});
        if (!rateLimit(`login:${ip}`, LOGIN_ATTEMPTS_PER_WINDOW, LOGIN_WINDOW_MS)) {
          throw new Error("Too many login attempts. Try again in 15 minutes.");
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email.toLowerCase().trim(),
          },
        });

        if (!user) {
          return null;
        }

        const passwordValid = await bcrypt.compare(credentials.password, user.password);
        if (!passwordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          role: isRole(user.role) ? user.role : "member",
          sessionVersion: user.sessionVersion,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    // Idle timeout: the cookie is re-issued on activity, so active users stay in.
    maxAge: SESSION_MAX_AGE_SECONDS,
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.sessionVersion = user.sessionVersion;
        return token;
      }
      // Every session check re-reads the account, so a password change, a
      // seed lockout (both bump sessionVersion), a deletion or a role change
      // takes effect on the next request. Throwing makes NextAuth clear the
      // cookie and treat the request as signed out. Tokens from before
      // sessionVersion existed carry none and are revoked too.
      const row = token.sub
        ? await prisma.user.findUnique({ where: { id: token.sub }, select: { role: true, sessionVersion: true } })
        : null;
      if (!row || row.sessionVersion !== token.sessionVersion) {
        throw new Error("Session revoked");
      }
      token.role = isRole(row.role) ? row.role : "member";
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub;
        session.user.role = token.role;
      }
      return session;
    },
  },
};

/**
 * Gate for admin-only routes. Re-checks the role in the database rather than
 * trusting the session's copy.
 */
export async function requireAdmin(): Promise<{ email: string } | { response: NextResponse }> {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const user = await prisma.user.findUnique({ where: { email }, select: { role: true } });
  if (!isAdmin(user?.role)) {
    return { response: NextResponse.json({ error: "Admins only" }, { status: 403 }) };
  }
  return { email };
}
