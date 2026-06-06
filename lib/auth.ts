import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

// In production, set COOKIE_DOMAIN=".meaprojects.com" so the session cookie is
// shared across the apex and every tool subdomain (SSO). Left undefined in dev.
const cookieDomain = process.env.COOKIE_DOMAIN || undefined;
const useSecureCookies = (process.env.NEXTAUTH_URL ?? "").startsWith("https://");

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  pages: { signIn: "/login" },
  cookies: cookieDomain
    ? {
        sessionToken: {
          name: `${useSecureCookies ? "__Secure-" : ""}next-auth.session-token`,
          options: {
            httpOnly: true,
            sameSite: "lax",
            path: "/",
            domain: cookieDomain,
            secure: useSecureCookies,
          },
        },
      }
    : undefined,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Parola", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({ where: { email: credentials.email } });
        if (!user) return null;
        const ok = await bcrypt.compare(credentials.password, user.password);
        if (!ok) return null;
        return { id: user.id, email: user.email, name: user.name ?? undefined, role: user.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.name = user.name;
        token.email = user.email;
        token.role = (user as { role?: string }).role ?? "member";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string; role?: string }).id =
          (token.uid as string) ?? (token.sub as string);
        (session.user as { id?: string; role?: string }).role =
          (token.role as string) ?? "member";
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
