import type { Metadata } from "next";
import { Suspense } from "react";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default function SignInPage() {
  return (
    <div className="container-page flex justify-center py-16">
      <div className="w-full max-w-md rounded-3xl border bg-card p-8 shadow-soft">
        <h1 className="text-2xl font-bold">Sign in</h1>
        <p className="mb-6 mt-1 text-sm text-muted-foreground">Access your saved vehicles, searches and alerts. Staff sign in here too.</p>
        <Suspense>
          <SignInForm />
        </Suspense>
      </div>
    </div>
  );
}
