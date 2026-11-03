import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";

import { connectMongo } from "./lib/db/mongodb";
import { User } from "./models";

export const authConfig = {
  session: { strategy: "jwt" as const },
  pages: {
    signIn: "/login",
    // Rejected sign-ins (e.g. AccessDenied) land back on login, which shows them in a dialog
    error: "/login",
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
          role: user.role ?? "user",
          forcePasswordChange: user.forcePasswordChange ?? false,
        };
      },
    }),
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
            issuer: "https://accounts.google.com",
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        await connectMongo();
        
        const currentSession = await auth();
        const currentUserId = currentSession?.user?.id;

        if (currentUserId) {
          const currentUser = await User.findById(currentUserId);
          if (currentUser) {
            currentUser.providerAccountId = account.providerAccountId;
            currentUser.provider = "google";
            if (!currentUser.avatarUrl && user.image) {
              currentUser.avatarUrl = user.image;
            }
            if (!currentUser.email && user.email) {
              currentUser.email = user.email.toLowerCase();
            }
            await currentUser.save();

            user.id = String(currentUser._id);
            (user as any).role = currentUser.role;
            user.name = currentUser.username;
            return true;
          }
        }

        let existing = await User.findOne({ providerAccountId: account.providerAccountId });

        if (!existing && user.email) {
          const owner = await User.findOne({ email: user.email.toLowerCase() });
          if (owner) {
            // Self-entered emails are unverified, so only link an account whose email an admin set,
            // and only for a Google email Google has verified
            if (!owner.emailTrusted || owner.providerAccountId || profile?.email_verified !== true) {
              return "/login?error=GoogleEmailInUse";
            }
            owner.providerAccountId = account.providerAccountId;
            owner.provider = "google";
            await owner.save();
            existing = owner;
          }
        }

        if (existing && (!existing.isActive || existing.isDeleted)) {
          return false;
        }

        if (!existing) {

          if (process.env.ALLOW_REGISTRATION === "false") {
            return false;
          }

          const userCount = await User.countDocuments();
          const isFirstUser = userCount === 0;
          const allowFirstAdmin = process.env.ALLOW_FIRST_LOGIN_ADMIN === "true";
          const role = isFirstUser && allowFirstAdmin ? "admin" : "user";

          // Usernames are unique; a second "John Smith" gets a short suffix from their Google id
          const baseName = user.name || user.email?.split("@")[0] || "google_user";
          const nameTaken = await User.exists({ username: baseName });

          const newUser = await User.create({
            username: nameTaken ? `${baseName}-${account.providerAccountId.slice(-4)}` : baseName,
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

          if (!existing.avatarUrl && user.image) {
            existing.avatarUrl = user.image;
            await existing.save();
          }
        }
      }
      return true;
    },
    async jwt({ token, user, account, trigger, session }) {
      if (trigger === "update" && session !== undefined) {
        if (session.forcePasswordChange !== undefined) {
          token.forcePasswordChange = session.forcePasswordChange;
        }
        if (session.user?.email !== undefined) {
          token.email = session.user.email;
        } else if (session.email !== undefined) {
          token.email = session.email;
        }
      }

      if (user) {
        token.userId = user.id ?? undefined;
        token.username = user.name ?? undefined;
        token.role = user.role ?? "user";
        token.forcePasswordChange = user.forcePasswordChange ?? false;
        if (user.email) {
          token.email = user.email;
        }
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

      if (session.user && token.forcePasswordChange !== undefined) {
        session.user.forcePasswordChange = token.forcePasswordChange;
      }

      if (session.user && token.email !== undefined) {
        session.user.email = token.email as string;
      }

      // The database wins over the token, so an admin's change to role or status applies on the next request
      if (session.user?.id) {
        try {
          await connectMongo();
          const dbUser = await User.findById(session.user.id).select("role forcePasswordChange isActive isDeleted").lean();

          if (dbUser) {
            session.user.role = dbUser.role ?? "user";
            session.user.forcePasswordChange = dbUser.forcePasswordChange ?? false;
            
            // Also handle deactivated/deleted users at session level
            if (!dbUser.isActive || dbUser.isDeleted) {
              // This will effectively sign them out or block them
              return null as any; 
            }
          }
        } catch (error) {
          // If DB check fails (e.g. in Edge runtime middleware), we fallback to the JWT token value
          console.error("Session DB check failed:", error);
        }
      }

      return session;
    },
  },
  trustHost: true,
  secret: process.env.AUTH_SECRET,
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth(authConfig);
