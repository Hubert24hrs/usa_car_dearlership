import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { cachedDealerProfile } from "@/lib/inventory/cached";

export const metadata: Metadata = { title: "Accessibility statement", alternates: { canonical: "/accessibility" } };

export default async function AccessibilityPage() {
  const dealer = await cachedDealerProfile();
  return (
    <>
      <PageHeader title="Accessibility statement" crumbs={[{ name: "Accessibility", href: "/accessibility" }]} />
      <div className="container-page py-12">
        <article className="prose-legal">
          <p>
            {dealer.name} is committed to making our website usable by everyone, including people with disabilities. We aim to
            conform to the Web Content Accessibility Guidelines (WCAG) 2.2 Level AA.
          </p>
          <h2>What we do</h2>
          <ul>
            <li>Semantic HTML, landmarks and a “skip to main content” link.</li>
            <li>Full keyboard navigation with visible focus indicators.</li>
            <li>Color contrast that meets AA requirements, plus a dark mode.</li>
            <li>Text alternatives for images and labelled form fields with clear error messages.</li>
            <li>Respect for “reduced motion” system preferences.</li>
          </ul>
          <h2>Feedback & assistance</h2>
          <p>
            If you have difficulty using any part of this site, please call {dealer.phone} or email {dealer.email}. We will provide
            the information you need through an alternative method and work to fix the issue.
          </p>
        </article>
      </div>
    </>
  );
}
