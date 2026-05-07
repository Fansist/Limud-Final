import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { NextAuthOptions, Session } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { Viewer } from "@/lib/types";

// NextAuth augmentation so role flows through the JWT and session.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string | null;
      role: Role;
    };
  }
  interface User {
    id: string;
    role: Role;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid: string;
    role: Role;
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: { signIn: "/sign-in" },
  providers: [
    CredentialsProvider({
      name: "Email + Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;
        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() }
        });
        if (!user || !user.passwordHash) return null;
        const ok = await compare(credentials.password, user.passwordHash);
        if (!ok) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }): Promise<Session> {
      if (session.user) {
        session.user.id = token.uid;
        session.user.role = token.role;
      }
      return session;
    }
  }
};

// ----------------------------------------------------------------------
// Server-side helpers used by route handlers and pages.
// ----------------------------------------------------------------------

import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import { DEMO_COOKIE, getDemoViewer } from "@/lib/demo/mode";

export async function getViewer(): Promise<Viewer | null> {
  // Demo mode wins when the cookie is set or the URL gates it (set by
  // middleware). This keeps the master demo account always-on for
  // showcase walkthroughs.
  const demoCookie = cookies().get(DEMO_COOKIE)?.value;
  if (demoCookie) {
    const v = getDemoViewer(demoCookie);
    if (v) return v;
  }
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return {
    kind: "user",
    userId: session.user.id,
    role: session.user.role,
    email: session.user.email,
    name: session.user.name
  };
}

export class AuthError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function requireViewer(): Promise<Viewer> {
  const v = await getViewer();
  if (!v) throw new AuthError(401, "Sign-in required");
  return v;
}

export async function requireRole(...allowed: Role[]): Promise<Viewer> {
  const v = await requireViewer();
  if (!allowed.includes(v.role)) {
    throw new AuthError(403, `Role ${v.role} not permitted here`);
  }
  return v;
}

// Utility for route handlers.
export function authErrorResponse(err: unknown): Response {
  if (err instanceof AuthError) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: err.status,
      headers: { "Content-Type": "application/json" }
    });
  }
  return new Response(JSON.stringify({ error: "Internal error" }), {
    status: 500,
    headers: { "Content-Type": "application/json" }
  });
}
