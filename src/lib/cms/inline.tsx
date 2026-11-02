import { Fragment, type ElementType, type ReactNode } from "react";

const pattern =
  /(\+\+([^+\n]+)\+\+)|(\*\*((?:[^*\n]|\*(?!\*))+)\*\*)|((?<!\*)\*(?!\*)([^*\n]+)\*(?!\*))|(\[([^\]\n]+)\]\(([^)\s]+)\))|(https?:\/\/[^\s)]+)/g;

export function safeHref(href: string): string | null {
  const value = href.trim();
  if (/^https?:\/\//i.test(value)) return value;
  if (/^(mailto:|tel:)/i.test(value)) return value;
  if (value.startsWith("/") || value.startsWith("#")) return value;
  return null;
}

export function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = new RegExp(pattern);
  let last = 0;
  let key = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(text))) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    if (match[2]) {
      nodes.push(<u key={key++}>{renderInline(match[2])}</u>);
    } else if (match[4]) {
      nodes.push(<strong key={key++}>{renderInline(match[4])}</strong>);
    } else if (match[6]) {
      nodes.push(<em key={key++}>{renderInline(match[6])}</em>);
    } else if (match[8] && match[9]) {
      const href = safeHref(match[9]);
      nodes.push(
        href ? (
          <a key={key++} href={href}>
            {renderInline(match[8])}
          </a>
        ) : (
          match[0]
        ),
      );
    } else if (match[10]) {
      nodes.push(
        <a key={key++} href={match[10]}>
          {match[10]}
        </a>,
      );
    }
    last = match.index + match[0].length;
  }

  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function renderBreaks(text: string): ReactNode[] {
  return text.split("\n").map((line, index) => (
    <Fragment key={index}>
      {index > 0 ? <br /> : null}
      {renderInline(line)}
    </Fragment>
  ));
}

function splitParagraphs(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function classNames(...parts: Array<string | undefined | false>) {
  return parts.filter(Boolean).join(" ");
}

export type ListMarker = "disc" | "circle" | "square" | "dash";
export type LineFormat = ListMarker | "number" | "heading";
export type TextStyle = "normal" | "heading";

export const listMarkers: ListMarker[] = ["disc", "circle", "square", "dash"];

const listPrefixes: Record<ListMarker, string> = {
  disc: "- ",
  circle: "+ ",
  square: "* ",
  dash: "-- ",
};

const lineMarker = /^(?:--\s+|\+\s+|\*\s+|-\s+|\d+\.\s+|#\s+)/;

function lineMarkerKind(line: string): LineFormat | null {
  if (/^#\s+/.test(line)) return "heading";
  if (/^\d+\.\s+/.test(line)) return "number";
  if (/^--\s+/.test(line)) return "dash";
  if (/^-\s+/.test(line)) return "disc";
  if (/^\+\s+/.test(line)) return "circle";
  if (/^\*\s+/.test(line)) return "square";
  return null;
}

function stripLineMarker(line: string) {
  return line.trim().replace(lineMarker, "");
}

function hasLineFormat(text: string) {
  return text.split("\n").some((line) => lineMarkerKind(line.trim()));
}

export function plainText(text: string): string {
  return text
    .split("\n")
    .map((line) => unwrapInline(stripLineMarker(line)))
    .filter(Boolean)
    .join(" ");
}

type ListKind = ListMarker | "number";

function isListKind(kind: LineFormat | null): kind is ListKind {
  return kind !== null && kind !== "heading";
}

function RichBlocks({
  text,
  className,
  paragraphAs: Tag = "p",
}: {
  text: string;
  className?: string;
  paragraphAs?: ElementType;
}) {
  const blocks: ReactNode[] = [];
  let paragraph: string[] = [];
  let list: { kind: ListKind; items: string[] } | null = null;
  let key = 0;

  function flushParagraph() {
    if (paragraph.length === 0) return;
    blocks.push(
      <Tag key={key++} className={className || undefined}>
        {renderBreaks(paragraph.join("\n"))}
      </Tag>,
    );
    paragraph = [];
  }

  function flushList() {
    if (!list) return;
    const items = list.items.map((item, index) => <li key={index}>{renderInline(item)}</li>);
    if (list.kind === "number") {
      blocks.push(
        <ol key={key++} className={classNames("cms-list", className)}>
          {items}
        </ol>,
      );
    } else {
      blocks.push(
        <ul key={key++} className={classNames("cms-list", `cms-list-${list.kind}`, className)}>
          {items}
        </ul>,
      );
    }
    list = null;
  }

  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const kind = lineMarkerKind(line);
    if (kind === "heading") {
      flushParagraph();
      flushList();
      blocks.push(
        <p key={key++} className={classNames("cms-article-subhead", className)}>
          {renderInline(stripLineMarker(line))}
        </p>,
      );
      continue;
    }
    if (isListKind(kind)) {
      flushParagraph();
      if (list && list.kind !== kind) flushList();
      if (!list) list = { kind, items: [] };
      list.items.push(stripLineMarker(line));
      continue;
    }
    flushList();
    paragraph.push(line);
  }

  flushParagraph();
  flushList();
  return <>{blocks}</>;
}

export function RichText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const paragraphs = splitParagraphs(text);
  if (paragraphs.length === 0) return null;
  return (
    <>
      {paragraphs.map((paragraph, index) => (
        <RichBlocks key={index} text={paragraph} className={className} />
      ))}
    </>
  );
}

export function HeadingText({
  text,
  as: Tag = "h2",
  className,
}: {
  text: string;
  as?: "h1" | "h2" | "h3" | "span";
  className?: string;
}) {
  if (!hasLineFormat(text)) {
    return <Tag className={className}>{renderBreaks(text)}</Tag>;
  }
  const paragraphs = splitParagraphs(text);
  if (paragraphs.length === 0) return <Tag className={className} />;
  return (
    <>
      {paragraphs.map((paragraph, index) =>
        hasLineFormat(paragraph) ? (
          <RichBlocks key={index} text={paragraph} className={className} paragraphAs={Tag} />
        ) : (
          <Tag key={index} className={className}>
            {renderBreaks(paragraph)}
          </Tag>
        ),
      )}
    </>
  );
}

export type SelectionFormat = {
  style: TextStyle;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  list: ListMarker | "number" | null;
};

function lineBounds(value: string, start: number, end: number) {
  const from = Math.max(0, Math.min(Math.min(start, end), value.length));
  const to = Math.max(0, Math.min(Math.max(start, end), value.length));
  const lineStart = value.lastIndexOf("\n", Math.max(0, from - 1)) + 1;
  let exclusive = to;
  if (exclusive > from && value[exclusive - 1] === "\n") exclusive -= 1;
  const lineBreak = value.indexOf("\n", exclusive);
  const lineEnd = lineBreak === -1 ? value.length : lineBreak;
  return { from, to, lineStart, lineEnd };
}

function replaceLines(
  value: string,
  start: number,
  end: number,
  mapLine: (line: string) => string,
) {
  const { lineStart, lineEnd } = lineBounds(value, start, end);
  const insert = value.slice(lineStart, lineEnd).split("\n").map(mapLine).join("\n");
  return {
    value: value.slice(0, lineStart) + insert + value.slice(end),
    start: lineStart,
    end: lineStart + insert.length,
  };
}

function unwrapInline(text: string) {
  let current = text;
  for (let pass = 0; pass < 4; pass += 1) {
    const next = current
      .replace(/\+\+([^+\n]+)\+\+/g, "$1")
      .replace(/\*\*((?:[^*\n]|\*(?!\*))+)\*\*/g, "$1")
      .replace(/(?<!\*)\*(?!\*)([^*\n]+)\*(?!\*)/g, "$1")
      .replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, "$1");
    if (next === current) return current;
    current = next;
  }
  return current;
}

export function applyLineFormat(
  value: string,
  start: number,
  end: number,
  kind: LineFormat,
): { value: string; start: number; end: number } {
  const { lineStart, lineEnd } = lineBounds(value, start, end);
  const lines = value.slice(lineStart, lineEnd).split("\n");
  const active = lines.filter((line) => line.trim());
  const remove = active.length > 0 && active.every((line) => lineMarkerKind(line.trim()) === kind);
  let number = 1;
  const nextLines = lines.map((line) => {
    if (!line.trim()) return line;
    const text = stripLineMarker(line);
    if (remove) return text;
    if (kind === "heading") return `# ${text}`;
    if (kind === "number") return `${number++}. ${text}`;
    return `${listPrefixes[kind]}${text}`;
  });
  const insert = nextLines.join("\n");
  return {
    value: value.slice(0, lineStart) + insert + value.slice(lineEnd),
    start: lineStart,
    end: lineStart + insert.length,
  };
}

export function applyTextStyle(
  value: string,
  start: number,
  end: number,
  style: TextStyle,
): { value: string; start: number; end: number } {
  return replaceLines(value, start, end, (line) => {
    if (!line.trim()) return line;
    const kind = lineMarkerKind(line.trim());
    if (style === "heading") return `# ${stripLineMarker(line)}`;
    if (kind === "heading") return stripLineMarker(line);
    return line;
  });
}

export function clearFormatting(
  value: string,
  start: number,
  end: number,
): { value: string; start: number; end: number } {
  return replaceLines(value, start, end, (line) => {
    if (!line.trim()) return line;
    const kind = lineMarkerKind(line.trim());
    const body = kind ? stripLineMarker(line) : line;
    return unwrapInline(body);
  });
}

const boldMark = /\*\*((?:[^*\n]|\*(?!\*))+)\*\*/;
const italicMark = /(?<!\*)\*(?!\*)([^*\n]+)\*(?!\*)/;
const underlineMark = /\+\+([^+\n]+)\+\+/;

function markSpans(value: string, marks: RegExp) {
  const spans: Array<[number, number]> = [];
  const re = new RegExp(marks.source, "g");
  let match: RegExpExecArray | null;
  while ((match = re.exec(value))) {
    spans.push([match.index, match.index + match[0].length]);
  }
  return spans;
}

function selectionHasMark(value: string, from: number, to: number, marks: RegExp) {
  const spans = markSpans(value, marks);
  if (from === to) return spans.some(([start, end]) => from > start && from < end);
  let sawText = false;
  for (let index = from; index < to; index += 1) {
    if (/\s/.test(value[index] ?? "")) continue;
    sawText = true;
    if (!spans.some(([start, end]) => index >= start && index < end)) return false;
  }
  return sawText;
}

export function inspectFormat(value: string, start: number, end: number): SelectionFormat {
  const { from, to, lineStart, lineEnd } = lineBounds(value, start, end);
  const active = value
    .slice(lineStart, lineEnd)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const kinds = active.map((line) => lineMarkerKind(line));
  const first = kinds[0] ?? null;
  const same = first !== null && kinds.every((kind) => kind === first);
  return {
    style: same && first === "heading" ? "heading" : "normal",
    bold: selectionHasMark(value, from, to, boldMark),
    italic: selectionHasMark(value, from, to, italicMark),
    underline: selectionHasMark(value, from, to, underlineMark),
    list: same && first && first !== "heading" ? first : null,
  };
}

export function applyInline(
  value: string,
  start: number,
  end: number,
  kind: "bold" | "italic" | "underline" | "link",
  url?: string,
): { value: string; start: number; end: number } | null {
  const selected = value.slice(start, end);
  if (kind === "bold" || kind === "italic" || kind === "underline") {
    const inner = selected || "text";
    const open = kind === "bold" ? "**" : kind === "italic" ? "*" : "++";
    const insert = `${open}${inner}${open}`;
    return {
      value: value.slice(0, start) + insert + value.slice(end),
      start: start + open.length,
      end: start + open.length + inner.length,
    };
  }

  const href = safeHref(url ?? "");
  if (!href) return null;
  const label = selected || href;
  const insert = `[${label}](${href})`;
  const labelStart = start + 1;
  return {
    value: value.slice(0, start) + insert + value.slice(end),
    start: labelStart,
    end: labelStart + label.length,
  };
}
