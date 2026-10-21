// footnote.js — Templater user script
//
// Creates one companion footnote file per Bible chapter:
//   Matthew-01.md     -> Matthew-01.fn.md
//
// New structure:
//   ## Footnotes for verse 1
//   ### Footnote 1.1 — book
//
// Heading links target the complete footnote section. This is more reliable
// for multi-paragraph footnotes and more portable to Quartz than block IDs.

module.exports = async (tp) => {
  // ============================================================
  // SETTINGS
  // ============================================================

  // Replace the labeled word in the Bible verse with a link to the footnote.
  const AUTO_REPLACE_LABEL_IN_VERSE = true;

  // Used only when AUTO_REPLACE_LABEL_IN_VERSE is false.
  const ADD_LINK_UNDER_VERSE = true;

  const FOOTNOTE_FILE_SUFFIX = ".fn";

  // ============================================================
  // GENERAL HELPERS
  // ============================================================

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function cleanHeadingLabel(value) {
    // These characters can make Obsidian heading links unreliable.
    const cleaned = String(value || "")
      .replace(/[#|^:\[\]]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return cleaned || "footnote";
  }

  function verseGroupHeading(vNum) {
    return `## Footnotes for verse ${vNum}`;
  }

  function footnoteHeading(vNum, fnNum, label) {
    return `### Footnote ${vNum}.${fnNum} — ${cleanHeadingLabel(label)}`;
  }

  function chapterDisplay(book, chapterNum) {
    return chapterNum ? `${book} ${chapterNum}` : book;
  }

  function verseDisplay(book, chapterNum, vNum) {
    return chapterNum ? `${book} ${chapterNum}:${vNum}` : `${book}:${vNum}`;
  }

  function getVerseBlock(chapterText, vNum) {
    const verseHeadingRe = new RegExp(`^##\\s+v\\s*${vNum}\\s*$`, "im");
    const match = verseHeadingRe.exec(chapterText);
    if (!match) return null;

    const afterHeading = match.index + match[0].length;
    const nextHeadingRe = /\n##\s+/g;
    nextHeadingRe.lastIndex = afterHeading;
    const nextHeading = nextHeadingRe.exec(chapterText);
    const end = nextHeading ? nextHeading.index + 1 : chapterText.length;

    return {
      start: match.index,
      end,
      text: chapterText.slice(match.index, end),
    };
  }

  function findCurrentVerseNumber(fullText, cursorLine) {
    const lines = fullText.split("\n");
    for (let index = Math.min(cursorLine, lines.length - 1); index >= 0; index--) {
      const match = lines[index].match(/^##\s+v\s*(\d+)\s*$/i);
      if (match) return Number(match[1]);
    }
    return null;
  }

  function getWordUnderCursor(text, cursor) {
    if (!cursor || cursor.line === undefined) return null;

    const lines = text.split("\n");
    let absoluteIndex = 0;
    for (let index = 0; index < cursor.line; index++) {
      absoluteIndex += (lines[index] || "").length + 1;
    }
    absoluteIndex += cursor.ch;
    absoluteIndex = Math.max(0, Math.min(absoluteIndex, text.length));

    const boundary = /[\s\-—–‐\[\](){}'"«»“”!?.,:;]/;
    let start = absoluteIndex;
    let end = absoluteIndex;

    while (start > 0 && !boundary.test(text[start - 1])) start--;
    while (end < text.length && !boundary.test(text[end])) end++;

    const word = text.slice(start, end).trim().replace(/[!?.,:;]+$/, "");
    return word || null;
  }

  // ============================================================
  // MODERN FOOTNOTE FILE PARSING AND SORTING
  // ============================================================

  function splitModernVerseGroups(text) {
    const headingRe = /^##\s+Footnotes for verse\s+(\d+)\s*$/gim;
    const matches = [...text.matchAll(headingRe)];

    if (!matches.length) {
      return { prefix: text.replace(/\s*$/, ""), groups: [] };
    }

    const prefix = text.slice(0, matches[0].index).replace(/\s*$/, "");
    const groups = matches.map((match, index) => {
      const start = match.index;
      const end = index + 1 < matches.length ? matches[index + 1].index : text.length;
      return {
        verse: Number(match[1]),
        raw: text.slice(start, end).trim(),
      };
    });

    return { prefix, groups };
  }

  function footnoteNumberFromHeading(line, expectedVerse) {
    const match = line.match(/^###\s+Footnote\s+(\d+)\.(\d+)\s+—\s+.+$/i);
    if (!match || Number(match[1]) !== Number(expectedVerse)) return null;
    return Number(match[2]);
  }

  function sortFootnotesInGroup(group) {
    const entryRe = /^###\s+Footnote\s+(\d+)\.(\d+)\s+—\s+.+$/gim;
    const matches = [...group.raw.matchAll(entryRe)];

    if (!matches.length) {
      return {
        verse: group.verse,
        raw: verseGroupHeading(group.verse),
      };
    }

    const entries = matches.map((match, index) => {
      const start = match.index;
      const end = index + 1 < matches.length ? matches[index + 1].index : group.raw.length;
      return {
        number: Number(match[2]),
        raw: group.raw.slice(start, end).trim(),
      };
    });

    entries.sort((left, right) => left.number - right.number);
    return {
      verse: group.verse,
      raw: `${verseGroupHeading(group.verse)}\n\n${entries.map(entry => entry.raw).join("\n\n")}`,
    };
  }

  function rebuildModernFile(prefix, groups) {
    const sortedGroups = groups
      .map(sortFootnotesInGroup)
      .sort((left, right) => left.verse - right.verse);

    return `${prefix.replace(/\s*$/, "")}\n\n${sortedGroups.map(group => group.raw).join("\n\n")}\n`;
  }

  function nextFootnoteNumber(groups, vNum) {
    const group = groups.find(item => item.verse === Number(vNum));
    if (!group) return 1;

    const headingRe = /^###\s+Footnote\s+(\d+)\.(\d+)\s+—\s+.+$/gim;
    const numbers = [...group.raw.matchAll(headingRe)]
      .filter(match => Number(match[1]) === Number(vNum))
      .map(match => Number(match[2]));

    return numbers.length ? Math.max(...numbers) + 1 : 1;
  }

  function hasFootnoteNumber(groups, vNum, fnNum) {
    const group = groups.find(item => item.verse === Number(vNum));
    if (!group) return false;

    return group.raw
      .split("\n")
      .some(line => footnoteNumberFromHeading(line, vNum) === Number(fnNum));
  }

  // ============================================================
  // ONE-TIME MIGRATION FROM THE OLD BULLET FORMAT
  // ============================================================

  function migrateLegacyFile(text) {
    const fnHeading = /^##\s+fn\s*$/im.exec(text);
    if (!fnHeading) return { text, linkMappings: [] };

    const prefix = text.slice(0, fnHeading.index).replace(/\s*$/, "");
    let legacy = text.slice(fnHeading.index + fnHeading[0].length);

    // Repair old lines such as: ### v1- (1) **book** (...)
    legacy = legacy.replace(
      /^(###\s+v\s*(\d+))[ \t]*-[ \t]*(\(\d+\)[ \t]+\*\*)/gim,
      "$1\n\n- $3",
    );

    const bulletRe = /^[ \t]*-[ \t]*\((\d+)\)[ \t]+\*\*(.+?)\*\*[ \t]+\((\[\[[^\n]+\]\])\)[ \t]*$/gim;
    const matches = [...legacy.matchAll(bulletRe)];
    if (!matches.length) return { text, linkMappings: [] };

    const grouped = new Map();
    const linkMappings = [];

    for (let index = 0; index < matches.length; index++) {
      const match = matches[index];
      const start = match.index + match[0].length;
      const end = index + 1 < matches.length ? matches[index + 1].index : legacy.length;
      let body = legacy.slice(start, end);

      // The backlink is more reliable than a malformed legacy verse heading.
      const linkedVerse = match[3].match(/#v(\d+)/i);
      let vNum = linkedVerse ? Number(linkedVerse[1]) : null;

      if (vNum === null) {
        const preceding = legacy.slice(0, match.index);
        const verseHeadings = [...preceding.matchAll(/^###\s+v\s*(\d+)\s*$/gim)];
        if (verseHeadings.length) vNum = Number(verseHeadings.at(-1)[1]);
      }

      if (vNum === null) continue;

      const fnNum = Number(match[1]);
      const label = match[2].trim();
      const oldIdMatch = body.match(/^[ \t]*\^(fn-[a-z0-9-]+)[ \t]*$/im);
      const heading = footnoteHeading(vNum, fnNum, label);

      if (oldIdMatch) {
        linkMappings.push({
          oldId: oldIdMatch[1],
          newHeading: heading.slice(4),
        });
      }

      body = body
        .replace(/^###\s+v\s*\d+\s*$/gim, "")
        .replace(/^[ \t]*\^fn-[a-z0-9-]+[ \t]*$/gim, "")
        .replace(/^[ \t]*---[ \t]*$/gm, "")
        .split("\n")
        .map(line => line.replace(/^ {2}/, ""))
        .join("\n")
        .replace(/^\s+|\s+$/g, "")
        .replace(/\n{3,}/g, "\n\n");

      const entry =
        `${heading}\n\n` +
        `**Verse:** ${match[3]}\n\n` +
        `${body}`;

      if (!grouped.has(vNum)) grouped.set(vNum, []);
      grouped.get(vNum).push({ number: fnNum, raw: entry });
    }

    const groups = [...grouped.entries()].map(([verse, entries]) => {
      entries.sort((left, right) => left.number - right.number);
      return {
        verse,
        raw: `${verseGroupHeading(verse)}\n\n${entries.map(entry => entry.raw).join("\n\n")}`,
      };
    });

    new Notice("Converted the old footnote layout to the new heading format.");
    return {
      text: rebuildModernFile(prefix, groups),
      linkMappings,
    };
  }

  // ============================================================
  // MAIN WORKFLOW
  // ============================================================

  const chapterFile = tp.file.find_tfile(tp.file.path(true));
  if (!chapterFile) {
    new Notice("footnote.js: Could not resolve the current chapter file.");
    return "";
  }

  let chapterText = await app.vault.read(chapterFile);
  const chapterTitle = String(tp.file.title || "").trim();
  const titleMatch = chapterTitle.match(/^(.*?)-(\d+)\s*$/);
  const book = titleMatch ? titleMatch[1].trim() : chapterTitle;
  const chapterNum = titleMatch ? String(Number(titleMatch[2])) : "";
  const defaultBook = book || null;

  const editor = app.workspace.activeLeaf?.view?.editor || null;
  const cursor = editor ? editor.getCursor() : null;
  const cursorLine = cursor ? cursor.line : 0;

  let vNum = findCurrentVerseNumber(chapterText, cursorLine);
  if (vNum !== null) {
    new Notice(`Auto-detected verse ${vNum}.`);
  } else {
    const enteredVerse = await tp.system.prompt(
      "Could not auto-detect the verse. Enter a verse number (for example, 1 or v1):",
    );
    if (!enteredVerse) return "";
    const verseMatch = String(enteredVerse).match(/(\d+)/);
    if (!verseMatch) {
      new Notice("Could not read the verse number.");
      return "";
    }
    vNum = Number(verseMatch[1]);
  }

  let label = cursor && editor ? getWordUnderCursor(chapterText, cursor) : null;
  if (label) {
    new Notice(`Auto-detected label: “${label}”.`);
  } else {
    label = await tp.system.prompt('Footnote label (for example, "book" or "Christ"):');
    if (!label) return "";
  }
  label = String(label).trim();

  let body = await tp.system.prompt("Paste the complete Recovery Version footnote text:");
  if (!body) return "";
  body = String(body)
    .replace(/\r\n/g, "\n")
    .replace(/\[para\.\s*\d+\]\s*/gi, "\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  try {
    if (tp.user?.linkify?.linkifyText) {
      body = await tp.user.linkify.linkifyText(tp, body, { defaultBook });
    }
  } catch (error) {
    new Notice("footnote.js: Scripture linkification failed; continuing with the original text.");
  }

  const parentPath = chapterFile.parent?.path || "";
  const footnoteNoteName = chapterTitle + FOOTNOTE_FILE_SUFFIX;
  const footnotePath = `${parentPath ? parentPath + "/" : ""}${footnoteNoteName}.md`;

  let footnoteFile = app.vault.getAbstractFileByPath(footnotePath);
  let footnoteText;

  if (!footnoteFile) {
    const chapterName = chapterDisplay(book, chapterNum);
    footnoteText =
      `---\n` +
      `type: footnotes\n` +
      `chapter: ${chapterTitle}\n` +
      `book: ${book}\n` +
      `chapter_num: ${chapterNum}\n` +
      `---\n\n` +
      `# ${chapterTitle} — Footnotes\n\n` +
      `**Chapter:** [[${chapterTitle}|${chapterName}]]\n`;
    footnoteFile = await app.vault.create(footnotePath, footnoteText);
  } else {
    footnoteText = await app.vault.read(footnoteFile);
  }

  // Existing files made by the former script are converted automatically.
  // Save the conversion immediately so it is not lost if the user happens to
  // choose a footnote number that already exists and the script exits early.
  const originalFootnoteText = footnoteText;
  const migration = migrateLegacyFile(footnoteText);
  footnoteText = migration.text;
  if (footnoteText !== originalFootnoteText) {
    await app.vault.modify(footnoteFile, footnoteText);

    // Existing verse links created by the former script pointed to block IDs.
    // Rewrite those links to the new heading targets while retaining their
    // displayed label and punctuation.
    let migratedChapterText = chapterText;
    for (const mapping of migration.linkMappings) {
      const oldLinkRe = new RegExp(
        `\\[\\[${escapeRegExp(footnoteNoteName)}#\\^${escapeRegExp(mapping.oldId)}\\|([^\\]]+)\\]\\]`,
        "g",
      );
      migratedChapterText = migratedChapterText.replace(
        oldLinkRe,
        `[[${footnoteNoteName}#${mapping.newHeading}|$1]]`,
      );
    }

    if (migratedChapterText !== chapterText) {
      chapterText = migratedChapterText;
      await app.vault.modify(chapterFile, chapterText);
      new Notice("Updated the chapter's former block links to heading links.");
    }
  }

  let parsed = splitModernVerseGroups(footnoteText);
  const suggestedNumber = nextFootnoteNumber(parsed.groups, vNum);
  const enteredNumber = await tp.system.prompt(
    `Footnote number for verse ${vNum} (Enter = ${suggestedNumber}):`,
  );
  const trimmedNumber = String(enteredNumber || "").trim();
  let fnNum = trimmedNumber ? Number.parseInt(trimmedNumber, 10) : suggestedNumber;
  if (!Number.isInteger(fnNum) || fnNum < 1) fnNum = suggestedNumber;

  if (hasFootnoteNumber(parsed.groups, vNum, fnNum)) {
    new Notice(`Footnote ${vNum}.${fnNum} already exists. Nothing was changed.`);
    return "";
  }

  const heading = footnoteHeading(vNum, fnNum, label);
  const verseLink = `[[${chapterTitle}#v${vNum}|${verseDisplay(book, chapterNum, vNum)}]]`;
  const entry = `${heading}\n\n**Verse:** ${verseLink}\n\n${body}`;

  let group = parsed.groups.find(item => item.verse === Number(vNum));
  if (!group) {
    group = {
      verse: Number(vNum),
      raw: `${verseGroupHeading(vNum)}\n\n${entry}`,
    };
    parsed.groups.push(group);
  } else {
    group.raw = `${group.raw.replace(/\s*$/, "")}\n\n${entry}`;
  }

  const updatedFootnoteText = rebuildModernFile(parsed.prefix, parsed.groups);
  await app.vault.modify(footnoteFile, updatedFootnoteText);

  // Link to the heading so the whole multi-paragraph footnote is targeted.
  const footnoteLink = `[[${footnoteNoteName}#${heading.slice(4)}|${label}]]`;

  try {
    await navigator.clipboard.writeText(footnoteLink);
    new Notice(`Copied footnote link: ${footnoteLink}`);
  } catch (error) {
    new Notice(`Footnote link ready: ${footnoteLink}`);
  }

  if (AUTO_REPLACE_LABEL_IN_VERSE && editor) {
    const verseBlock = getVerseBlock(chapterText, vNum);
    if (verseBlock) {
      const escapedLabel = escapeRegExp(label);
      const labelRe = new RegExp(`\\b${escapedLabel}\\b([!?.,:;]*)`);

      if (labelRe.test(verseBlock.text)) {
        const updatedBlock = verseBlock.text.replace(labelRe, `${footnoteLink}$1`);
        chapterText =
          chapterText.slice(0, verseBlock.start) +
          updatedBlock +
          chapterText.slice(verseBlock.end);
        await app.vault.modify(chapterFile, chapterText);
        new Notice(`Linked “${label}” to footnote ${vNum}.${fnNum}.`);
      } else {
        new Notice(`Footnote created, but “${label}” was not found in verse ${vNum}.`);
      }
    }
  }

  if (ADD_LINK_UNDER_VERSE && !AUTO_REPLACE_LABEL_IN_VERSE) {
    const verseBlock = getVerseBlock(chapterText, vNum);
    if (verseBlock) {
      const linkLine = `- ${footnoteLink}`;
      let updatedBlock = verseBlock.text;
      if (!updatedBlock.includes(linkLine)) {
        updatedBlock = `${updatedBlock.replace(/\s*$/, "")}\n\n${linkLine}\n`;
        chapterText =
          chapterText.slice(0, verseBlock.start) +
          updatedBlock +
          chapterText.slice(verseBlock.end);
        await app.vault.modify(chapterFile, chapterText);
      }
    }
  }

  return "";
};
