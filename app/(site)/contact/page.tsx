import { Mail, MessageSquare, Phone } from "lucide-react";
import type { Metadata } from "next";
import { ContactForm, TextUsForm } from "@/components/forms/lead-forms";
import { PageHeader } from "@/components/layout/page-header";
import { cachedDealerProfile } from "@/lib/inventory/cached";
import { smsHref, telHref } from "@/lib/site.config";

export const metadata: Metadata = {
  title: "Contact us",
  description: "Call, text, chat or send us a message. Our team typically replies within one business hour.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const dealer = await cachedDealerProfile();
  return (
    <>
      <PageHeader title="Contact us" crumbs={[{ name: "Contact", href: "/contact" }]} description="Questions about a vehicle, financing or service? We're here to help." />
      <div className="container-page grid gap-8 py-12 lg:grid-cols-[1fr_380px]">
        <section aria-labelledby="contact-form" className="rounded-2xl border bg-card p-6 shadow-soft md:p-8">
          <h2 id="contact-form" className="mb-6 text-2xl font-bold">
            Send us a message
          </h2>
          <ContactForm />
        </section>
        <aside className="space-y-4">
          <a href={telHref(dealer.phone)} className="flex items-center gap-4 rounded-2xl border bg-card p-5 hover:shadow-soft">
            <Phone className="size-6 text-cta" aria-hidden="true" />
            <div>
              <p className="font-semibold">Call</p>
              <p className="text-sm text-muted-foreground">{dealer.phone}</p>
            </div>
          </a>
          <a href={smsHref(dealer.smsPhone)} className="flex items-center gap-4 rounded-2xl border bg-card p-5 hover:shadow-soft">
            <MessageSquare className="size-6 text-cta" aria-hidden="true" />
            <div>
              <p className="font-semibold">Text</p>
              <p className="text-sm text-muted-foreground">{dealer.smsPhone}</p>
            </div>
          </a>
          <a href={`mailto:${dealer.email}`} className="flex items-center gap-4 rounded-2xl border bg-card p-5 hover:shadow-soft">
            <Mail className="size-6 text-cta" aria-hidden="true" />
            <div>
              <p className="font-semibold">Email</p>
              <p className="text-sm text-muted-foreground">{dealer.email}</p>
            </div>
          </a>
          <div id="chat" className="rounded-2xl border bg-card p-5">
            <p className="mb-1 font-semibold">Chat with us by text</p>
            <p className="mb-4 text-sm text-muted-foreground">
              Prefer chatting? Send a message and we&apos;ll reply by SMS. (A live-chat widget can be connected here.)
            </p>
            <TextUsForm />
          </div>
        </aside>
      </div>
    </>
  );
}
