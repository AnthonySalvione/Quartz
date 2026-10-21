/**
 * Anthony's outline formatter — Templater user script.
 * Pure text in -> Markdown out. No Obsidian import and no verse linking.
 */
const SETTINGS = {
  removeOpeningBanner: true,
  keepScriptureReading: false,
  keepCopyright: false,
  joinWrappedLines: true,
  repairSplitWords: true,
  tightenEmDashes: true,

  // Restart numbered points under each Roman or capital-letter heading.
  restartNumberedPoints: true,

  levels: {
    roman: 2,
    letter: 3,
    number: 4,
    lowerLetter: 5,
    parenthesized: 6
  },

  // Preserve genuine hyphens when these words wrap across lines.
  preserveHyphenPrefixes: [
    "all", "co", "cross", "first", "full", "God", "half", "life", "long",
    "much", "New", "non", "old", "one", "self", "seven", "short", "Spirit",
    "three", "two", "up", "well"
  ],
  preserveHyphenatedWords: ["right-hand", "left-hand"]
};

function formatOutline(input, overrides = {}) {
  if (typeof input !== "string") {
    throw new TypeError("format_outline expects text.");
  }

  const settings = {
    ...SETTINGS,
    ...overrides,
    levels: {
      ...SETTINGS.levels,
      ...overrides.levels
    }
  };

  const lines = input
    .replace(/\r\n?/g, "\n")
    .replace(/^\uFEFF/, "")
    .split("\n");

  const blocks = [];
  let current = null;
  let lastLetter = "";
  let numberedPoint = 0;
  let index = 0;

  // Preserve YAML frontmatter.
  if (lines[0] === "---") {
    const end = lines.findIndex(
      (line, i) => i > 0 && /^(---|\.\.\.)\s*$/.test(line)
    );

    if (end > 0) {
      blocks.push({
        type: "protected",
        text: lines.slice(0, end + 1).join("\n")
      });
      index = end + 1;
    }
  }

  // Remove only the recognized training banner.
  const bannerStart = lines.findIndex(
    (line, i) => i >= index && line.trim() !== ""
  );

  const subjectStart = lines.findIndex(
    (line, i) =>
      i >= index &&
      /^\s*(?:\*\*)?GENERAL SUBJECT\s*:/i.test(line)
  );

  if (
    settings.removeOpeningBanner &&
    bannerStart >= 0 &&
    subjectStart > bannerStart &&
    /^Outline of\s*$/i.test(lines[bannerStart].trim()) &&
    lines.slice(bannerStart, subjectStart).every(line =>
      /^(?:\s*|Outline of|the Messages for the Full-time Training|in the .+ Term of \d{4}|[-—_=]{3,})\s*$/i.test(
        line.trim()
      )
    )
  ) {
    index = subjectStart;
  }

  function flush() {
    if (current) blocks.push(current);
    current = null;
  }

  function start(type, text, level) {
    flush();
    current = { type, text, level };
  }

  function append(text) {
    if (!current) return start("paragraph", text);

    if (!settings.joinWrappedLines) {
      current.text += "\n" + text;
      return;
    }

    // Repair a split word only at an actual line boundary.
    const tail = current.text.match(/([\p{L}]+)-$/u);
    const head = text.match(/^([\p{Ll}][\p{L}]*)/u);

    if (settings.repairSplitWords && tail && head) {
      const compound = tail[1] + "-" + head[1];

      const keep =
        settings.preserveHyphenPrefixes.some(
          p => p.toLowerCase() === tail[1].toLowerCase()
        ) ||
        settings.preserveHyphenatedWords.some(
          w => w.toLowerCase() === compound.toLowerCase()
        ) ||
        /[\p{L}]-[\p{L}]+-$/u.test(current.text);

      current.text =
        (keep ? current.text : current.text.slice(0, -1)) + text;
    } else {
      current.text += " " + text;
    }
  }

  for (; index < lines.length; index++) {
    const raw = lines[index];
    const text = raw.trim();

    // Preserve fenced code blocks.
    const fence = raw.match(/^\s{0,3}(`{3,}|~{3,})/);

    if (fence) {
      flush();

      const chunk = [raw];
      const closer = new RegExp(
        "^\\s{0,3}" +
        fence[1][0] +
        "{" +
        fence[1].length +
        ",}\\s*$"
      );

      while (++index < lines.length) {
        chunk.push(lines[index]);
        if (closer.test(lines[index])) break;
      }

      blocks.push({
        type: "protected",
        text: chunk.join("\n")
      });
      continue;
    }

    if (!text) {
      flush();
      continue;
    }

    if (
      !settings.keepCopyright &&
      /^©\s*\d{4}\s+Living Stream Ministry\.?$/i.test(text)
    ) {
      flush();
      continue;
    }

    const heading = text.match(/^(#{1,6})\s+(.*)$/);
    let content = heading ? heading[2] : text;

    if (/^\*\*.*\*\*$/.test(content)) {
      content = content.slice(2, -2);
    }

    if (/^GENERAL SUBJECT\s*:/i.test(content)) {
      start("subject", content);
      continue;
    }

    if (/^(?:Message|Lesson)\s+(?:[\w-]+)(?:\b|$)/i.test(content)) {
      start(heading ? "readyTitle" : "title", content);
      continue;
    }

    if (/^Scripture Reading\s*:/i.test(content)) {
      start("scripture", content);
      continue;
    }

    const marker = content.match(
      /^([IVXLCDM]+|[A-Za-z]|\d+)\.\s+(.*)$/
    );

    const nested = content.match(
      /^(\([a-zA-Z0-9]+\)|[a-zA-Z0-9]+\))\s+(.*)$/
    );

    if (marker || nested) {
      let kind;

      if (nested) {
        kind = "parenthesized";
      } else {
        const token = marker[1];

        const followsLetter =
          token.length === 1 &&
          lastLetter &&
          token.charCodeAt(0) === lastLetter.charCodeAt(0) + 1;

        const isRoman =
          /^(?=[IVXLCDM]+$)M{0,3}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/.test(
            token
          ) &&
          (token.length > 1 || /[IVX]/.test(token)) &&
          (
            heading
              ? heading[1].length === settings.levels.roman
              : !followsLetter
          );

        if (isRoman) {
          kind = "roman";
          lastLetter = "";
        } else if (/^[A-Z]$/.test(token)) {
          kind = "letter";
          lastLetter = token;
        } else if (/^[a-z]$/.test(token)) {
          kind = "lowerLetter";
        } else {
          kind = "number";
        }
      }

      // Start a fresh number group under each parent heading.
      if (kind === "roman" || kind === "letter") {
        numberedPoint = 0;
      }

      if (kind === "number" && settings.restartNumberedPoints) {
        content = content.replace(
          /^\d+\./,
          String(++numberedPoint) + "."
        );
      }

      start("point", content, settings.levels[kind]);
      continue;
    }

    if (heading) {
      start("heading", heading[2], heading[1].length);
      continue;
    }

    // Keep other structural Markdown separate from wrapped prose.
    if (/^(?:>\s?|[-+*]\s+|---+$|\|)/.test(text)) {
      flush();
      blocks.push({ type: "protected", text: raw });
      continue;
    }

    append(text);
  }

  flush();

  function clean(text, tighten = settings.tightenEmDashes) {
    // Preserve existing links and inline code.
    const protectedParts = [];

    const masked = text.replace(
      /!?\[\[[^\]\n]+\]\]|!?\[[^\]\n]*\]\((?:<[^>\n]*>|(?:[^()\n]|\([^()\n]*\))*)\)|(`+)[^`\n]*\1/g,
      value =>
        "\uE000" +
        (protectedParts.push(value) - 1) +
        "\uE001"
    );

    let result = masked
      .replace(/[\t\u00a0 ]+/g, " ")
      .replace(/\u00ad/g, "")
      .trim();

    if (tighten === "spaced") {
      result = result.replace(/ *— */g, " — ");
    } else if (tighten) {
      result = result.replace(/ *— */g, "—");
    }

    return result.replace(
      /\uE000(\d+)\uE001/g,
      (_, i) => protectedParts[Number(i)]
    );
  }

  return blocks
    .map(block => {
      if (block.type === "protected") return block.text;

      if (
        block.type === "scripture" &&
        !settings.keepScriptureReading
      ) {
        return "";
      }

      if (block.type === "subject") {
        return "**" + clean(block.text, "spaced") + "**";
      }

      if (
        block.type === "title" ||
        block.type === "readyTitle"
      ) {
        const title = clean(block.text, false);

        const parts = title.match(
          /^((?:Message|Lesson)\s+[\w-]+)\s+(.+)$/i
        );

        if (parts && !/^[—–-]/.test(parts[2])) {
          return "# " + parts[1] + " — " + parts[2];
        }

        return "# " + title;
      }

      if (
        block.type === "point" ||
        block.type === "heading"
      ) {
        const level = Math.max(
          1,
          Math.min(6, Number(block.level) || 2)
        );

        return "#".repeat(level) + " " + clean(block.text);
      }

      return clean(block.text);
    })
    .filter(Boolean)
    .join("\n\n") + (blocks.length ? "\n" : "");
}

module.exports = formatOutline;