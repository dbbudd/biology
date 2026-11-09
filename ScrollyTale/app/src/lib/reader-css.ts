/**
 * The reader's own stylesheet, scoped to the pulled section.
 *
 * One styleguide, not two. The content components (callouts, figures, tables,
 * check questions) keep the reader's styling; chrome rules are dropped because
 * the player draws its own toolbar. Colour tokens are dropped too, because the
 * player already carries the same tokens on its root element.
 */

const BASE = (
  process.env.NEXT_PUBLIC_READER_BASE ?? "http://localhost:4321"
).replace(/\/$/, "");

/** Rules that style the reader's page frame, which the player does not have. */
const CHROME =
  /(^|[\s,>+~(])(body|html|:root)\b|#sidebar|#overlay|\.sidebar|\.toolbar|\.reading-pos|\.nav-|\.topbar|#search|\.overlay|\.aa-wrap|\.aa-popover|\.theme-swatch|\.tb\b|\.unit-tools|\.main\b/;

function splitSelectors(prelude: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of prelude) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      out.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim()) out.push(current.trim());
  return out;
}

function scopeSelector(selector: string): string | null {
  const sel = selector.trim();
  if (!sel) return null;

  // The token blocks only declare variables. The player declares its own.
  if (/^:root$/.test(sel)) return null;
  if (/^\[data-theme="[a-z]+"\]$/.test(sel)) return null;

  if (CHROME.test(sel)) return null;

  const themed = /^\[data-theme="([a-z]+)"\]\s*(.+)$/.exec(sel);
  if (themed) {
    return `.st-root[data-theme="${themed[1]}"] .st-reader ${themed[2]}`;
  }
  return `.st-reader ${sel}`;
}

function transform(css: string): string {
  let out = "";
  let i = 0;

  while (i < css.length) {
    const open = css.indexOf("{", i);
    if (open === -1) {
      out += css.slice(i);
      break;
    }

    const prelude = css.slice(i, open).trim();
    let depth = 1;
    let j = open + 1;
    while (j < css.length && depth > 0) {
      if (css[j] === "{") depth++;
      else if (css[j] === "}") depth--;
      j++;
    }
    const body = css.slice(open + 1, j - 1);

    if (prelude.startsWith("@")) {
      if (/^@(media|supports|layer|container|scope)/i.test(prelude)) {
        out += `${prelude}{${transform(body)}}`;
      } else {
        out += `${prelude}{${body}}`;
      }
    } else {
      const kept = splitSelectors(prelude)
        .map(scopeSelector)
        .filter((s): s is string => !!s);
      if (kept.length) out += `${kept.join(",")}{${body}}`;
    }

    i = j;
  }

  return out;
}

let cached: string | null = null;

export async function readerContentCss(): Promise<string> {
  if (cached) return cached;

  const res = await fetch(`${BASE}/assets/course.css?v=333`, { cache: "no-store" });
  if (!res.ok) throw new Error(`The reader returned ${res.status} for course.css`);

  const raw = await res.text();

  // Comments sit between rules. They go first, or they end up glued to a
  // selector and break the scoping.
  const withoutComments = raw.replace(/\/\*[\s\S]*?\*\//g, "");

  const scoped = transform(withoutComments).replace(
    /url\(\s*(['"]?)((?:\.\.\/|\.\/)?[^'")\s]+)\1\s*\)/g,
    (_m: string, _q: string, path: string) => {
      const clean = path.replace(/^(\.\.\/)+/, "").replace(/^\.?\/+/, "");
      return `url(${BASE}/${clean})`;
    },
  );

  cached = `/* Generated from ${BASE}/assets/course.css. Do not edit. */\n${scoped}`;
  return cached;
}
