"use client";

import { Switch as UiSwitch } from "@/components/ui/switch";

export function Switch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return <UiSwitch checked={checked} onCheckedChange={onChange} />;
}
