import type { Metadata } from "next";
import { ContactForm } from "@/components/forms/lead-forms";
import { PageHeader } from "@/components/layout/page-header";
import { PrivacyChoices } from "./privacy-choices";

export const metadata: Metadata = {
  title: "Do Not Sell or Share My Personal Information",
  description: "Manage cookie preferences and submit privacy requests.",
  alternates: { canonical: "/privacy/choices" },
};

export default function PrivacyChoicesPage() {
  return (
    <>
      <PageHeader
        title="Your privacy choices"
        crumbs={[
          { name: "Privacy", href: "/privacy" },
          { name: "Your choices", href: "/privacy/choices" },
        ]}
        description="Opt out of the sale or sharing of your personal information, manage optional cookies, or submit a privacy request."
      />
      <div className="container-page grid gap-8 py-12 lg:grid-cols-2">
        <PrivacyChoices />
        <section aria-labelledby="privacy-request" className="rounded-2xl border bg-card p-6">
          <h2 id="privacy-request" className="mb-2 text-xl font-semibold">
            Submit a privacy request
          </h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Request access to, deletion or correction of your personal information. Include “Privacy request” and the type of
            request in your message. We may contact you to verify your identity.
          </p>
          <ContactForm />
        </section>
      </div>
    </>
  );
}
