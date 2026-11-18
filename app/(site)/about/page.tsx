import { HeartHandshake, Leaf, Scale, Users } from "lucide-react";
import type { Metadata } from "next";
import { Section } from "@/components/home/section";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = {
  title: "About us",
  description: "Our story, our team and how we give back to the communities we serve.",
  alternates: { canonical: "/about" },
};

const VALUES = [
  { icon: Scale, title: "Honest pricing", text: "One clear price online and in store. Estimated payments disclose the term, APR and down payment used." },
  { icon: HeartHandshake, title: "No-pressure guidance", text: "Product specialists, not commission-driven pressure — take the time you need." },
  { icon: Leaf, title: "Electrified expertise", text: "EV-certified technicians and staff who can explain charging, range and incentives." },
  { icon: Users, title: "Community first", text: "We sponsor youth sports, school STEM programs and local food banks." },
];

const TEAM = [
  { role: "General Manager", note: "Oversees sales, service and the customer experience." },
  { role: "Finance Director", note: "Works with lenders to find the right financing for every credit profile." },
  { role: "Service Director", note: "Leads our certified gas, diesel, hybrid and EV technicians." },
  { role: "EV Specialist", note: "Helps shoppers plan home charging and road trips." },
];

export default function AboutPage() {
  return (
    <>
      <PageHeader
        tone="brand"
        eyebrow="Our story"
        title="Built on transparency"
        crumbs={[{ name: "About", href: "/about" }]}
        description="We started with a simple idea: car buying should feel as clear and easy as any other big purchase. Today we serve drivers across the region with new, used and electrified vehicles."
      />
      <Section id="values" eyebrow="What we believe" title="Our promises">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {VALUES.map((v) => (
            <div key={v.title} className="rounded-2xl border bg-card p-6">
              <v.icon className="mb-3 size-7 text-cta" aria-hidden="true" />
              <h3 className="font-semibold">{v.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{v.text}</p>
            </div>
          ))}
        </div>
      </Section>
      <Section id="team" eyebrow="Our team" title="People you'll meet" className="pt-0 md:pt-0">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {TEAM.map((m) => (
            <div key={m.role} className="rounded-2xl border bg-card p-6">
              <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-secondary font-heading text-lg font-bold" aria-hidden="true">
                {m.role
                  .split(" ")
                  .map((w) => w[0])
                  .join("")}
              </div>
              <h3 className="font-semibold">{m.role}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{m.note}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">Placeholder team section — add real staff names and photos with their consent.</p>
      </Section>
      <Section id="community" eyebrow="Community" title="Giving back" className="pt-0 md:pt-0">
        <p className="max-w-3xl text-muted-foreground">
          Every vehicle sold supports local programs. Placeholder: describe your dealership&apos;s real community partnerships,
          volunteer days and sponsorships here.
        </p>
      </Section>
    </>
  );
}
