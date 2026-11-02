import type { CSSProperties } from "react";
import { resolveTextColor } from "@/lib/design/palette";
import type { CmsBlock } from "@/lib/cms/types";

export function blockSurfaceProps(
  block: Pick<CmsBlock, "headingColor" | "bodyColor">,
  className: string,
): { className: string; style?: CSSProperties } {
  const heading = resolveTextColor(block.headingColor);
  const body = resolveTextColor(block.bodyColor);
  return {
    className: [
      className,
      "cms-block",
      heading ? "cms-has-heading-color" : "",
      body ? "cms-has-body-color" : "",
    ]
      .filter(Boolean)
      .join(" "),
    style:
      heading || body
        ? ({
            ...(heading ? { "--cms-heading": heading } : {}),
            ...(body ? { "--cms-body": body } : {}),
          } as CSSProperties)
        : undefined,
  };
}
