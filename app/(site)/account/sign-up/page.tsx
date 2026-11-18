import type { Metadata } from "next";
import { Suspense } from "react";
import { SignUpForm } from "./sign-up-form";

export const metadata: Metadata = { title: "Create an account", robots: { index: false } };

export default function SignUpPage() {
  return (
    <div className="container-page flex justify-center py-16">
      <div className="w-full max-w-md rounded-3xl border bg-card p-8 shadow-soft">
        <h1 className="text-2xl font-bold">Create your account</h1>
        <p className="mb-6 mt-1 text-sm text-muted-foreground">Save vehicles across devices and get alerts when new matches arrive.</p>
        <Suspense>
          <SignUpForm />
        </Suspense>
      </div>
    </div>
  );
}
