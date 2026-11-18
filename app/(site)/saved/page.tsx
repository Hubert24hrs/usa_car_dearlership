import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { SavedView } from "./saved-view";

export const metadata: Metadata = { title: "Saved vehicles & searches", robots: { index: false } };

export default function SavedPage() {
  return (
    <>
      <PageHeader title="Your garage" crumbs={[{ name: "Saved", href: "/saved" }]} description="Vehicles you've saved and searches you're watching." />
      <div className="container-page py-10">
        <SavedView />
      </div>
    </>
  );
}
