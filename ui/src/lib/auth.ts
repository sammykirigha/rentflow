/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });

          if (!response.ok) {
            return null;
          }

          const data = await response.json();

          if (data.data && data.data.user && data.data.accessToken) {
            return {
              id: data.data.user.userId,
              userId: data.data.user.userId,
              email: data.data.user.email,
              isAdminUser: data.data.user.userRole?.isAdminRole || false,
              name: `${data.data.user.firstName || ''} ${data.data.user.lastName || ''}`.trim(),
              roleId: data.data.user.roleId || "",
              accessToken: data.data.accessToken,
              refreshToken: data.data.refreshToken,
            };
          }

          return null;
        } catch (error) {
          return null;
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  jwt: {
    maxAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // Handle Google OAuth sign-in
      if (account?.provider === "google" && profile) {
        try {
          const backendResponse = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/auth/oauth/google`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                providerAccountId: account.providerAccountId,
                email: user.email,
                givenName: (profile as any).given_name,
                familyName: (profile as any).family_name,
                pictureUrl: user.image,
              }),
            }
          );

          if (!backendResponse.ok) {
            console.error('Google OAuth backend sync failed:', await backendResponse.text());
            return false;
          }

          const result = await backendResponse.json();

          // Attach backend tokens and user data to the user object
          Object.assign(user, {
            accessToken: result.data.accessToken,
            refreshToken: result.data.refreshToken,
            userId: result.data.user.userId,
            roleId: result.data.user.roleId,
            isAdminUser: result.data.user.userRole?.isAdminRole ?? false,
          });

          return true;
        } catch (err) {
          console.error('Google OAuth backend sync failed:', err);
          return false;
        }
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        // Type assertion for our custom user properties
        const customUser = user as any;
        token.accessToken = customUser.accessToken;
        token.refreshToken = customUser.refreshToken;
        token.roleId = customUser.roleId;
        token.userId = customUser.userId;
        token.isAdminUser = customUser.isAdminUser;
      }
      return token;
    },
    async session({ session, token }) {
      const extendedSession = {
        ...session,
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
        user: {
          ...session.user,
          roleId: token.roleId || "",
          userId: token.userId || token.sub || "",
          isAdminUser: token.isAdminUser || false,
        }
      };
      return extendedSession;
    }
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  debug: process.env.NODE_ENV === 'development',
}

