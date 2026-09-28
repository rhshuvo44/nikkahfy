"use client";

import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import type { auth } from "@/lib/auth/config";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;

export type ClientSession = typeof authClient.$Infer.Session;
export type ClientUser = ClientSession["user"] & {
  role: string;
  disabled: boolean;
};

/** Client-side plugin that mirrors `user.additionalFields` for type inference. */
export const additionalFields = inferAdditionalFields<typeof auth>();
