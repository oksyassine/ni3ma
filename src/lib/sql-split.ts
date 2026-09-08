// SQL statement splitter that understands:
// - `-- line comments`
// - `/* block comments */` (possibly multi-line)
// - single-quoted string literals `'…'` (with `''` escape)
// - double-quoted identifiers `"…"`
// - dollar-quoted string literals `$tag$…$tag$` (PL/pgSQL function bodies,
//   DO blocks, etc.)
//
// Without these, a naive `ddl.split(";")` corrupts anything containing a
// semicolon inside a string/comment/block — and silently misapplies the
// migration. Used by tenant provisioning (start/route.ts,
// platform/tenants/route.ts).
export function splitSqlStatements(sql: string): string[] {
  const out: string[] = [];
  let buf = "";
  let i = 0;
  const n = sql.length;
  // State flags
  let inLineComment = false;
  let inBlockComment = false;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let dollarTag: string | null = null;

  const flush = () => {
    const trimmed = buf.trim();
    if (trimmed) out.push(trimmed);
    buf = "";
  };

  while (i < n) {
    const ch = sql[i];
    const next = sql[i + 1];

    // Dollar-quoted region (e.g., $func$ ... $func$ or $$ ... $$)
    if (!inLineComment && !inBlockComment && !inSingleQuote && !inDoubleQuote && ch === "$") {
      // Read a candidate tag: $[A-Za-z_][A-Za-z0-9_]*$ or just $$
      const m = /^(\$[A-Za-z_][A-Za-z0-9_]*\$|\$\$)/.exec(sql.slice(i));
      if (m) {
        const tag = m[1];
        if (dollarTag === null) {
          dollarTag = tag;
          buf += tag;
          i += tag.length;
          continue;
        } else if (dollarTag === tag) {
          buf += tag;
          i += tag.length;
          dollarTag = null;
          continue;
        }
      }
    }

    if (inLineComment) {
      buf += ch;
      if (ch === "\n") inLineComment = false;
      i++;
      continue;
    }
    if (inBlockComment) {
      buf += ch;
      if (ch === "*" && next === "/") {
        buf += next;
        i += 2;
        inBlockComment = false;
        continue;
      }
      i++;
      continue;
    }
    if (inSingleQuote) {
      buf += ch;
      if (ch === "'" && next === "'") {
        buf += next;
        i += 2;
        continue;
      }
      if (ch === "'") {
        inSingleQuote = false;
      }
      i++;
      continue;
    }
    if (inDoubleQuote) {
      buf += ch;
      if (ch === "\"") inDoubleQuote = false;
      i++;
      continue;
    }
    if (dollarTag !== null) {
      buf += ch;
      i++;
      continue;
    }

    // Detect comment/string starters
    if (ch === "-" && next === "-") {
      inLineComment = true;
      buf += "--";
      i += 2;
      continue;
    }
    if (ch === "/" && next === "*") {
      inBlockComment = true;
      buf += "/*";
      i += 2;
      continue;
    }
    if (ch === "'") {
      inSingleQuote = true;
      buf += ch;
      i++;
      continue;
    }
    if (ch === "\"") {
      inDoubleQuote = true;
      buf += ch;
      i++;
      continue;
    }

    if (ch === ";") {
      flush();
      i++;
      continue;
    }
    buf += ch;
    i++;
  }
  flush();
  return out;
}
