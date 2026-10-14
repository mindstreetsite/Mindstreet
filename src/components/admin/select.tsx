"use client";

import type { PointerEventHandler, ReactNode } from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const EMPTY = "__empty__";

export type AdminSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
  group?: string;
};

export function AdminSelect({
  value,
  onChange,
  options,
  id,
  disabled,
  className = "w-full",
  size = "default",
  "aria-invalid": ariaInvalid,
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
  onPointerDown,
}: {
  value: string;
  onChange: (value: string) => void;
  options: AdminSelectOption[];
  id?: string;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "default";
  "aria-invalid"?: boolean;
  "aria-label"?: string;
  "aria-describedby"?: string;
  onPointerDown?: PointerEventHandler<HTMLButtonElement>;
}) {
  return (
    <Select
      value={value === "" ? EMPTY : value}
      onValueChange={(next) => onChange(next === EMPTY ? "" : next)}
      disabled={disabled}
    >
      <SelectTrigger
        id={id}
        size={size}
        className={className}
        aria-invalid={ariaInvalid}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        onPointerDown={onPointerDown}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" align="start">
        {groupedOptions(options)}
      </SelectContent>
    </Select>
  );
}

function groupedOptions(options: AdminSelectOption[]) {
  const nodes: ReactNode[] = [];
  let index = 0;

  while (index < options.length) {
    const option = options[index];
    if (!option.group) {
      nodes.push(selectItem(option));
      index += 1;
      continue;
    }

    const group = option.group;
    const items: ReactNode[] = [];
    while (index < options.length && options[index].group === group) {
      items.push(selectItem(options[index]));
      index += 1;
    }
    nodes.push(
      <SelectGroup key={group}>
        <SelectLabel>{group}</SelectLabel>
        {items}
      </SelectGroup>,
    );
  }

  return nodes;
}

function selectItem(option: AdminSelectOption) {
  const value = option.value === "" ? EMPTY : option.value;
  return (
    <SelectItem key={value} value={value} disabled={option.disabled}>
      {option.label}
    </SelectItem>
  );
}
