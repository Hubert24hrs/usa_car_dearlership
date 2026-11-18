import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { cachedDealerProfile } from "@/lib/inventory/cached";

export const metadata: Metadata = { title: "Privacy policy", alternates: { canonical: "/privacy" } };

export default async function PrivacyPage() {
  const dealer = await cachedDealerProfile();
  return (
    <>
      <PageHeader title="Privacy policy" crumbs={[{ name: "Privacy", href: "/privacy" }]} description="Template — have counsel review and customize before launch." />
      <div className="container-page py-12">
        <article className="prose-legal">
          <p>
            This policy explains how {dealer.legalName} (“we”, “us”) collects, uses and shares personal information when you use
            this website, visit our stores, or use our services.
          </p>
          <h2>Information we collect</h2>
          <ul>
            <li>Contact details you provide (name, email, phone, address) through forms, chat or text.</li>
            <li>Vehicle interests, saved vehicles and saved searches.</li>
            <li>Financing information you choose to submit for pre-qualification (we do not request Social Security numbers to pre-qualify).</li>
            <li>Trade-in details (VIN, mileage, condition).</li>
            <li>Device and usage data (pages viewed, approximate location) via cookies and analytics — only with your consent for optional cookies.</li>
          </ul>
          <h2>How we use information</h2>
          <ul>
            <li>To respond to inquiries, schedule appointments, provide quotes and process transactions.</li>
            <li>To arrange financing with lending partners at your request (subject to the Gramm-Leach-Bliley Act).</li>
            <li>To send alerts and marketing you opted into. Text messages are only sent with your express consent; reply STOP to opt out.</li>
            <li>To improve our website, prevent fraud and comply with law.</li>
          </ul>
          <h2>Sharing</h2>
          <p>
            We share information with service providers that help us operate (hosting, email delivery, analytics), lenders you ask
            us to submit to, and manufacturers for warranty and recall purposes. We do not sell personal information for money.
            Some advertising cookies may be considered “sharing” under California law — you can opt out at any time.
          </p>
          <h2 id="ccpa">California privacy rights (CCPA/CPRA)</h2>
          <p>
            California residents may request to know, delete or correct personal information, and may opt out of the sale or
            sharing of personal information and limit the use of sensitive personal information. We honor Global Privacy Control
            (GPC) browser signals as an opt-out of sale/sharing. We will not discriminate against you for exercising your rights.
          </p>
          <p>
            To submit a request, use our <Link href="/privacy/choices">privacy choices page</Link>, email {dealer.email}, or call{" "}
            {dealer.phone}. We will verify your identity before fulfilling access, deletion or correction requests.
          </p>
          <h2>Data retention & security</h2>
          <p>
            We keep information only as long as needed for the purposes above or as required by law, and protect it with
            administrative, technical and physical safeguards appropriate to its sensitivity.
          </p>
          <h2>Children</h2>
          <p>This site is not directed to children under 16 and we do not knowingly collect their personal information.</p>
          <h2>Contact</h2>
          <p>
            {dealer.legalName}, {dealer.address} · {dealer.email} · {dealer.phone}
          </p>
          <p className="text-xs">Last updated: placeholder date.</p>
        </article>
      </div>
    </>
  );
}
