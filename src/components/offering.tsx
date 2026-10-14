"use client";

import { OfferingBlock } from "@/components/cms/offering-block";
import { offering } from "@/content/home";

export function Offering() {
  return (
    <OfferingBlock
      heading={offering.title}
      items={offering.items.map((item) => ({
        id: item.title,
        heading: item.title,
        body: item.body ?? "",
        href: item.cta?.href ?? "",
        buttonLabel: item.cta?.label,
      }))}
    />
  );
}
