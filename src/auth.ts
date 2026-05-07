import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";

import { connectMongo } from "./lib/db/mongodb";
import { User } from "./models";

const authConfig = {
  session: { strategy: "jwt" as const },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "Password",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const username = String(credentials?.username ?? "").trim();
        const password = String(credentials?.password ?? "");

        if (!username || !password) {
          return null;
        }

        await connectMongo();
        const user = await User.findOne({
          $or: [{ username }, { email: username.toLowerCase() }],
          isActive: true,
        }).lean();

        if (!user?.passwordHash) {
          return null;
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          return null;
        }

        return {
          id: String(user._id),
          name: user.username,
          email: user.email ?? undefined,
          image: user.avatarUrl ?? undefined,
          role: user.role ?? "author",
        };
      },
    }),
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user, account }: { token: any; user?: any; account?: any }) {
      if (user) {
        token.userId = user.id ?? undefined;
        token.username = user.name ?? undefined;
        token.role = user.role ?? "author";
      }

      if (account?.provider === "google") {
        token.googleEnabled = true;
      }

      return token;
    },
    async session({ session, token }: { session: any; token: any }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }

      if (session.user && token.username) {
        session.user.name = token.username;
      }

      if (session.user && token.userId) {
        session.user.id = token.userId;
      }

      if (session.user && token.role) {
        session.user.role = token.role;
      }

      return session;
    },
  },
  trustHost: true,
  secret: process.env.AUTH_SECRET,
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
