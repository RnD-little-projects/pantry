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
          isDeleted: { $ne: true },
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
          forcePasswordChange: user.forcePasswordChange ?? false,
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
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        await connectMongo();
        
        // Find by provider account ID or email
        const existing = await User.findOne({
          $or: [
            { providerAccountId: account.providerAccountId },
            { email: user.email?.toLowerCase() }
          ]
        });

        if (!existing) {
          const userCount = await User.countDocuments();
          const isFirstUser = userCount === 0;
          const allowFirstAdmin = process.env.ALLOW_FIRST_LOGIN_ADMIN === "true";
          const role = isFirstUser && allowFirstAdmin ? "admin" : "author";

          const newUser = await User.create({
            username: user.name || user.email?.split("@")[0] || "google_user",
            email: user.email?.toLowerCase(),
            provider: "google",
            providerAccountId: account.providerAccountId,
            avatarUrl: user.image,
            role,
            isActive: true,
          });
          
          user.id = String(newUser._id);
          (user as any).role = newUser.role;
          user.name = newUser.username;
        } else {
          user.id = String(existing._id);
          (user as any).role = existing.role;
          user.name = existing.username;

          // Update existing user with Google details if not present
          let changed = false;
          if (!existing.providerAccountId) {
            existing.providerAccountId = account.providerAccountId;
            existing.provider = "google";
            changed = true;
          }
          if (!existing.avatarUrl && user.image) {
            existing.avatarUrl = user.image;
            changed = true;
          }
          if (changed) {
            await existing.save();
          }
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.userId = user.id ?? undefined;
        token.username = user.name ?? undefined;
        token.role = user.role ?? "author";
        token.forcePasswordChange = user.forcePasswordChange ?? false;
      }

      if (account?.provider === "google") {
        token.googleEnabled = true;
      }

      return token;
    },
    async session({ session, token }) {
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

      if (session.user && typeof token.forcePasswordChange === "boolean") {
        session.user.forcePasswordChange = token.forcePasswordChange;
      }

      return session;
    },
  },
  trustHost: true,
  secret: process.env.AUTH_SECRET,
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
