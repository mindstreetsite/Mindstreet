"use client";

import { Root, Thumb } from "@radix-ui/react-switch";

export function Switch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <Root className="admin-switch-control" checked={checked} onCheckedChange={onChange}>
      <Thumb className="admin-switch-thumb" />
    </Root>
  );
}
