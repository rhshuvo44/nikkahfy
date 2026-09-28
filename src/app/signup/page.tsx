import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth/auth-form";
import { getSession } from "@/lib/auth/session";

export const metadata = { title: "Sign up" };

export default async function SignupPage() {
  if (await getSession()) {
    redirect("/dashboard");
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <AuthForm mode="signup" />
    </main>
  );
}
