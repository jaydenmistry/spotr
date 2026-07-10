import type { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { rateLimit, clientIp } from "@/lib/rateLimit";

const LOGIN_ATTEMPTS_PER_WINDOW = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

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
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
};
