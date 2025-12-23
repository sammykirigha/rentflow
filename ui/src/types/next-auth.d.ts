import { User } from "next-auth";
import "next-auth/jwt";

type UserId = string;

declare module "next-auth/jwt" {
  interface JWT {
    userId: UserId;
    accessToken?: string;
    refreshToken?: string;
    roleId?: string;
  }
}

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    refreshToken?: string;
    user: User & {
      userId: UserId;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string;
      isAdminUser?: boolean;
    };
  }
}