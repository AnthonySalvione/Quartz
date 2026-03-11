// footnote.js — Templater script
/*
  This file accomplishes four main steps.
  1) Asks for the needed information to create a footnote.
    a) A verse number (v1, v2...) — AUTO-DETECTED FROM CURSOR
    b) A short label (the word that the footnote is assigned) — AUTO-DETECTED FROM CURSOR
    c) Text of the footnote
  2) Takes the information, writes it in a separate file
    a) Example of a footnote file: "Genesis-01.fn.md"
    b) The footnote will be written under the correct verse group: (###v1, ###v2, etc.)
    c) Gives each footnote a unique block ID, such as "^fn-genesis-1-1-3"
  3) Generates an inline link that can be pasted into the verse
  4) Copies the inline link to the clipboard and replaces the label word in the verse

*/


module.exports = async (tp) => {
  //#region Config constants
  //These are basically the "adjustable knobs" for this template

  // Include a link underneath a given ## vX
  const ADD_LINK_UNDER_VERSE = true;

  // Automatically replace the label word in the verse with the footnote link
  const AUTO_REPLACE_LABEL_IN_VERSE = true;

  /*
    When creating a new file for footnotes, this function adds a suffix to a pre-existing chapter.
    So, in this case, the new footnote name becomes "<ChapterTitle>.fn"
  */
  const FOOTNOTE_FILE_SUFFIX = ".fn";

  //#endregion

  //#region Helper functions

  /* Slug function:
    Purpose: To convert a given string into a "safe" id-friendly string
    Where used: Building IDs like "fn-genesis-1-1-3"

    What it does:
      a) lowercases
      b) removes quotations
      c) replaces any non-alphanumeric chunk with a "-"
      d) trims any leading or trailing "-"

    Examples: 
    "Genesis-1" → genesis-1
    "In the Beginning" → in-the-beginning
  */
  function slug(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/['"]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  /* indentBlock function:
    Purpose: To indent multi-line texts by N spaces
    Where used: Indenting any footnote body underneath it's bullet-point

    What it does:
      Splits up the text by lines
      Adds " ".repeat(spaces) to each line for indentation
    This is how the footnote body becomes visually "nested" under the bullet-point
  */
  function indentBlock(s, spaces) {
    const pad = " ".repeat(spaces);
    return String(s || "").split("\n").map(line => pad + line).join("\n");
  }

  /* verseHeadRe function:
    This function builds a regular expression that matches a given verse-group heading
    This makes the template tolerant of spacing, case-sensitivity and multiline text
  */
  function verseHeadRe(vNum) {
    return new RegExp("^###\\s+v\\s*" + vNum + "\\s*$", "im");
  }

  /* verseHeadLine function:
    Purpose: To generate the canonical heading text
    Output: ### v1, ### v2, etc. (no extra spacing)

    This enforces a consistent heading style even if older content is messier
  */
  function verseHeadLine(vNum) {
    return "### v" + vNum;
  }

  /* normalizeVerseHeadingAndFirstBulletSpacing function:
    This function should fix formatting mistakes where a verse heading
    and the first bullet point are merged together.

    TO-DO: fix this function
  */
  function normalizeVerseHeadingAndFirstBulletSpacing(fnSectionText) {
    fnSectionText = fnSectionText.replace(
      /^(###\s+v\s*\d+)\s*(-\s*\(\d+\)\s+\*\*)/gmi,
      "$1\n$2"
    );
    fnSectionText = fnSectionText.replace(
      /^(###\s+v\s*\d+)\s*-\s*(\(\d+\)\s+)/gmi,
      "$1\n- $2"
    );
    return fnSectionText;
  }

  /* ensureFnHeadingExists function:
    Purpose: To ensure that the footnote heading exists in the file
      If '## fn' exists, then nothing happens
      If '## fn' does not exist, then append it at the end
  */
  function ensureFnHeadingExists(text) {
    const fnRe = /^##\s+fn\s*$/im;
    if (!fnRe.test(text)) return text.replace(/\s*$/, "") + "\n\n## fn\n";
    return text;
  }

  /* splitFnSection function:
    Purpose: To split the footnote file into three different slices
      1) beforeFn, which is everything before the '## fn' heading
      2) fnSection, which is all content until the next heading
      3) afterFn, which is anything after that

    This is so stuff like the file properties don't get overridden
  */
  function splitFnSection(fullText) {
    const fnRe = /^##\s+fn\s*$/im;
    const fnMatch = fnRe.exec(fullText);
    if (!fnMatch) return null;

    const fnStart = fnMatch.index;
    const afterFnHeading = fnStart + fnMatch[0].length;

    const nextH2Re = /\n##\s+/g;
    nextH2Re.lastIndex = afterFnHeading;
    const nextH2 = nextH2Re.exec(fullText);
    const fnEnd = nextH2 ? (nextH2.index + 1) : fullText.length;

    return {
      beforeFn: fullText.slice(0, fnStart),
      fnSection: fullText.slice(fnStart, fnEnd),
      afterFn: fullText.slice(fnEnd)
    };
  }

  /* ensureVerseGroupExists function:
    Purpose: To ensure that the verse heading for the footnote exists
      If it does not exist, inserts the verse heading underneath the footnote heading

      TO-DO: Instead, maybe I should order the verse heading by number
  */
  function ensureVerseGroupExists(fnSection, vNum) {
    const fnRe = /^##\s+fn\s*$/im;
    const vRe = verseHeadRe(vNum);
    if (!vRe.test(fnSection)) {
      fnSection = fnSection.replace(fnRe, h => h + "\n\n" + verseHeadLine(vNum) + "\n");
    }
    return fnSection;
  }

  /* nextFnNumberForVerse function:
    Purpose: Determine the next available footnote number for the given verse group
    How it works:
      a) find the verse heading, '### vX'
      b) take the text underneath that heading until the next heading
      c) find all bullet-points matching '- (N) **'
      d) returns max(N) + 1, or 1 if null
    This is how the next available footnote number is suggested in the prompt
  */
  function nextFnNumberForVerse(fnSectionText, vNum) {
    const vRe = verseHeadRe(vNum);
    const m = vRe.exec(fnSectionText);
    if (!m) return 1;

    const start = m.index + m[0].length;
    const rest = fnSectionText.slice(start);

    const stop = rest.search(/\n(###\s+|##\s+)/);
    const groupText = stop === -1 ? rest : rest.slice(0, stop);

    const nums = [];
    const numRe = /^\s*-\s*\((\d+)\)\s+\*\*/gm;
    let nm;
    while ((nm = numRe.exec(groupText)) !== null) nums.push(parseInt(nm[1], 10));
    if (!nums.length) return 1;

    nums.sort((a,b) => a-b);
    return nums[nums.length - 1] + 1;
  }

  /* insertAtEndOfVerseGroup function:
    Purpose: To insert a new footnote block at the ending of a verse group. (before the next heading)
  */
  function insertAtEndOfVerseGroup(fnSection, vNum, block) {
    const vRe = verseHeadRe(vNum);
    const vMatch = vRe.exec(fnSection);
    if (!vMatch) return fnSection;

    const vStart = vMatch.index;
    const from = vStart + vMatch[0].length;

    const nextHeadRe = /\n(###\s+|##\s+)/g;
    nextHeadRe.lastIndex = from;
    const nextHead = nextHeadRe.exec(fnSection);
    const vGroupEnd = nextHead ? (nextHead.index + 1) : fnSection.length;

    let prefix = fnSection.slice(0, vGroupEnd).replace(/\s*$/, "");
    prefix = prefix + "\n\n";

    const suffix = fnSection.slice(vGroupEnd).replace(/^\s*/, "");
    return prefix + block.replace(/\s*$/, "") + "\n\n" + suffix;
  }

  /* sortFootnotesInsideVerseGroup function:
    Purpose: To sort the footnotes within a given verse group by their numeric marker (1), (2), etc.
    How it works:
      a) isolates a specific '### vX' group
      b) sorts the footnote blocks by extracted number
      c) reassembles

    TODO: Ensure I want to go with this bullet-point format
  */
  function sortFootnotesInsideVerseGroup(fnSectionText, vNum) {
    const vRe = verseHeadRe(vNum);
    const m = vRe.exec(fnSectionText);
    if (!m) return fnSectionText;

    const headStart = m.index;
    const afterHead = headStart + m[0].length;

    const rest = fnSectionText.slice(afterHead);
    const stop = rest.search(/\n(###\s+|##\s+)/);
    const groupEnd = stop === -1 ? fnSectionText.length : (afterHead + stop + 1);

    const before = fnSectionText.slice(0, afterHead);
    const group = fnSectionText.slice(afterHead, groupEnd);
    const after = fnSectionText.slice(groupEnd);

    const parts = group.split(/\n(?=-\s*\(\d+\)\s+\*\*)/g);

    const sortable = [];
    const other = [];

    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (/^\s*-\s*\(\d+\)\s+\*\*/.test(p.trim())) sortable.push(p);
      else other.push(p);
    }

    sortable.sort((a, b) => {
      const am = a.match(/-\s*\((\d+)\)/);
      const bm = b.match(/-\s*\((\d+)\)/);
      const an = am ? parseInt(am[1], 10) : 999999;
      const bn = bm ? parseInt(bm[1], 10) : 999999;
      return an - bn;
    });

    let rebuilt =
      other.join("").replace(/\n{3,}/g, "\n\n").replace(/\s*$/, "") +
      (other.join("").trim() ? "\n\n" : "") +
      sortable.join("\n\n").trim();

    rebuilt = rebuilt.replace(/\n{3,}/g, "\n\n").replace(/\s*$/, "") + "\n";
    return before + rebuilt + after;
  }

  /* sortVerseGroups function:
    Purpose: Sort the verse groups themselves under the footnote heading numerically
  */
  function sortVerseGroups(fnSectionText) {
    const lines = fnSectionText.split("\n");

    let fnIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (/^##\s+fn\s*$/i.test(lines[i])) { fnIdx = i; break; }
    }
    if (fnIdx === -1) return fnSectionText;

    const header = lines.slice(0, fnIdx + 1);
    const rest = lines.slice(fnIdx + 1);

    // Extract all verse heading groups with their verse numbers
    const groups = [];
    let currentGroup = null;
    let preamble = [];

    for (let i = 0; i < rest.length; i++) {
      const line = rest[i];
      // Match ### v<number> pattern
      const mm = line.match(/^###\s+v\s*(\d+)/i);
      if (mm) {
        // Save previous group if it exists
        if (currentGroup) groups.push(currentGroup);
        // Start new group with the verse number
        currentGroup = {
          number: parseInt(mm[1], 10),
          lines: [line]
        };
      } else {
        if (currentGroup) {
          currentGroup.lines.push(line);
        } else {
          preamble.push(line);
        }
      }
    }
    // Don't forget the last group
    if (currentGroup) groups.push(currentGroup);

    // Sort numerically by verse number
    groups.sort((a, b) => a.number - b.number);

    // Reassemble the output
    let out = [];
    out = out.concat(header);
    
    // Add preamble if it has content
    if (preamble.join('\n').trim() !== '') {
      out.push('');
      out = out.concat(preamble);
    }

    // Add all verse groups in sorted order
    for (let g of groups) {
      out.push('');
      out = out.concat(g.lines);
    }

    return out.join("\n").replace(/\n{3,}/g, "\n\n").replace(/\s*$/, "") + "\n";
  }

  /* getVerseBlock function:
    Purpose: To locate the verse block heading in the chapter file
    Returns:
      a) start of verse block index
      b) end of verse block index
      c) the text contained inside
  */
  function getVerseBlock(chapterText, vNum) {
    const verseHeadingRe = new RegExp("^##\\s+v\\s*" + vNum + "\\s*$", "im");
    const vm = verseHeadingRe.exec(chapterText);
    if (!vm) return null;

    const start = vm.index;
    const afterHeading = start + vm[0].length;

    const nextH2 = /\n##\s+/g;
    nextH2.lastIndex = afterHeading;
    const nx = nextH2.exec(chapterText);
    const end = nx ? (nx.index + 1) : chapterText.length;

    return { start, end, text: chapterText.slice(start, end) };
  }

  /* findCurrentVerseNumber function:
    Purpose: To auto-detect the current verse number by searching backwards from cursor position
    How it works:
      a) Gets the cursor line position from the Obsidian editor
      b) Searches backwards from that line to find the nearest verse heading (### vX)
      c) Returns the verse number, or null if no verse heading is found

    This allows the user to place their cursor anywhere under a verse and have it auto-detected
  */
  function findCurrentVerseNumber(fullText, cursorLine) {
    const lines = fullText.split('\n');
    
    // Search backwards from current cursor position to find the nearest verse heading
    for (let i = cursorLine; i >= 0; i--) {
      const line = lines[i];
      // Match ### vX pattern (case-insensitive, flexible spacing)
      const verseMatch = line.match(/^##\s+v\s*(\d+)\s*$/i);
      
      if (verseMatch) {
        return parseInt(verseMatch[1], 10);
      }
    }
    
    // If no verse heading found searching backwards, return null
    return null;
  }

  /* getWordUnderCursor function:
    Purpose: To extract the word at the cursor position
    How it works:
      a) Takes the cursor position (as an object with line/ch or as absolute index)
      b) Finds word boundaries by looking for whitespace and punctuation
      c) Extracts and returns the word, removing any trailing punctuation
      d) Returns null if no valid word found

    This allows the user to place cursor on a word and have it auto-detected as the footnote label
  */
  function getWordUnderCursor(text, cursor) {
    // Convert cursor object {line, ch} to absolute index
    let idx = 0;
    if (typeof cursor === 'object' && cursor.line !== undefined) {
      const lines = text.split('\n');
      for (let i = 0; i < cursor.line; i++) {
        idx += lines[i].length + 1; // +1 for newline
      }
      idx += cursor.ch;
    } else {
      idx = cursor;
    }

    // Clamp to valid range
    if (idx < 0) idx = 0;
    if (idx > text.length) idx = text.length;

    // Define word boundary characters (includes all punctuation)
    const wordBoundary = /[\s\-—–‐\[\](){}'"«»""!?.,:;]/;
    
    let start = idx;
    let end = idx;

    // Find start of word by moving backwards
    while (start > 0 && !wordBoundary.test(text[start - 1])) {
      start--;
    }

    // Find end of word by moving forwards
    while (end < text.length && !wordBoundary.test(text[end])) {
      end++;
    }

    let word = text.slice(start, end).trim();
    
    // Remove any trailing punctuation from the word
    word = word.replace(/[!?.,:;]+$/, '');
    
    return word.length > 0 ? word : null;
  }
  //#endregion

  //#region Main
  const chapterFile = tp.file.find_tfile(tp.file.path(true));
  if (!chapterFile) {
    new Notice("footnote.js: Could not resolve current file.");
    return "";
  }

  let chapterText = await app.vault.read(chapterFile);

  const chapterTitle = String(tp.file.title ?? "").trim(); // e.g., Genesis-01
  const mm = chapterTitle.match(/^(.*?)-(\d+)\s*$/);
  const book = mm ? mm[1].trim() : chapterTitle;
  const chapterNum = mm ? String(parseInt(mm[2], 10)) : "";
  const defaultBook = book || null;

  // Auto-detect verse number from cursor position
  // Get the current editor and cursor line
  const editor = app.workspace.activeLeaf?.view?.editor;
  let cursorLine = 0;
  let cursor = null;
  
  if (editor) {
    cursor = editor.getCursor();
    cursorLine = cursor.line;
  }

  // Auto-detect verse number
  const autoDetectedVNum = findCurrentVerseNumber(chapterText, cursorLine);

  let vNum;
  if (autoDetectedVNum !== null) {
    // Auto-detected a verse - use it directly without prompting
    vNum = autoDetectedVNum;
    new Notice(`Auto-detected verse v${vNum}`);
  } else {
    // No verse heading found, prompt user
    const vInput = await tp.system.prompt("Could not auto-detect verse. Enter verse number (type 1 or v1 or V 1):");
    if (!vInput) return "";
    const vMatchNum = String(vInput).match(/(\d+)/);
    if (!vMatchNum) { 
      new Notice("Could not read verse number. Use 1 or v1."); 
      return ""; 
    }
    vNum = parseInt(vMatchNum[1], 10);
  }

  // Auto-detect label (word under cursor)
  let label = null;
  if (cursor && editor) {
    const wordUnderCursor = getWordUnderCursor(chapterText, cursor);
    if (wordUnderCursor) {
      label = wordUnderCursor;
      new Notice(`Auto-detected label: "${label}"`);
    }
  }

  // If no label was auto-detected, prompt user
  if (!label) {
    label = await tp.system.prompt('Label (word or short title, e.g., "In", "beginning", "Genesis")');
    if (!label) return "";
  }
  label = String(label).trim();

  let body = await tp.system.prompt("Paste the full RV footnote text (can be multiple paragraphs):");
  if (!body) return "";
  body = String(body).replace(/\r\n/g, "\n").trim();

  // Remove RV paragraph markers
  body = body.replace(/\[para\.\s*\d+\]\s*/gi, "\n\n");
  body = body.replace(/\n{3,}/g, "\n\n").trim();

  // LINKIFY (if your tp.user.linkify exists)
  try {
    if (tp.user?.linkify?.linkifyText) {
      body = await tp.user.linkify.linkifyText(tp, body, { defaultBook });
    }
  } catch (e) {
    new Notice("footnote.js: linkify failed (continuing without linkify).");
  }

  // Footnotes file path
  const parentPath = chapterFile.parent && chapterFile.parent.path ? chapterFile.parent.path : "";
  const footnoteNoteName = chapterTitle + FOOTNOTE_FILE_SUFFIX; // e.g., Genesis-01.fn
  const footnoteFullPath = (parentPath ? (parentPath + "/") : "") + footnoteNoteName + ".md";

  let footnoteFile = app.vault.getAbstractFileByPath(footnoteFullPath);
  let footText = "";

  if (!footnoteFile) {
    footText =
      "---\n" +
      "type: footnotes\n" +
      "chapter: " + chapterTitle + "\n" +
      "---\n\n" +
      "# " + chapterTitle + " — Footnotes\n\n" +
      "## fn\n";
    footnoteFile = await app.vault.create(footnoteFullPath, footText);
  } else {
    footText = await app.vault.read(footnoteFile);
  }

  footText = ensureFnHeadingExists(footText);
  const parts = splitFnSection(footText);
  if (!parts) {
    new Notice("Couldn't find or create '## fn' in the footnotes file.");
    return "";
  }

  const beforeFn = parts.beforeFn;
  let fnSection = parts.fnSection;
  const afterFn = parts.afterFn;

  // Normalize any old merged heading/bullet lines
  fnSection = normalizeVerseHeadingAndFirstBulletSpacing(fnSection);

  // Ensure verse group exists
  fnSection = ensureVerseGroupExists(fnSection, vNum);

  // Suggest footnote number
  const suggestedNum = nextFnNumberForVerse(fnSection, vNum);
  let fnNumRaw = await tp.system.prompt("Footnote # for v" + vNum + " (Enter = " + suggestedNum + ")");
  fnNumRaw = String(fnNumRaw || "").trim();
  let fnNum = fnNumRaw ? parseInt(fnNumRaw, 10) : suggestedNum;
  if (!fnNum || fnNum < 1) fnNum = suggestedNum;

  // ID corresponds to RV footnote number
  const baseId =
    "fn-" + slug(book) + "-" + slug(chapterNum || "x") + "-" + slug(vNum) + "-" + String(fnNum);

  let id = baseId;
  let nn = 2;
  while ((beforeFn + fnSection + afterFn).includes("^" + id)) {
    id = baseId + "-" + (nn++);
  }

  // Link back to the verse in chapter file
  const verseDisplay = chapterNum ? (book + " " + chapterNum + ":" + vNum) : (book + ":" + vNum);
  const verseTarget = "#v" + vNum;
  const verseLink = "[[" + chapterTitle + verseTarget + "|" + verseDisplay + "]]";

  // Build footnote block
  const indentedBody = indentBlock(body, 2);
  const block =
    "- (" + fnNum + ") **" + label + "** (" + verseLink + ")\n" +
    indentedBody + "\n" +
    "  ^" + id + "\n";

  // Insert + sort
  fnSection = insertAtEndOfVerseGroup(fnSection, vNum, block);
  fnSection = normalizeVerseHeadingAndFirstBulletSpacing(fnSection);
  fnSection = sortFootnotesInsideVerseGroup(fnSection, vNum);
  fnSection = sortVerseGroups(fnSection);

  // Write footnotes file
  await app.vault.modify(footnoteFile, beforeFn + fnSection + afterFn);

  // ---------- Build inline footnote link ----------
  const combo = "[[" + footnoteNoteName + "#^" + id + "|" + label + "]]";

  // Copy combo to clipboard (best-effort)
  try {
    await navigator.clipboard.writeText(combo);
    new Notice("Copied footnote link to clipboard: " + combo);
  } catch (e) {
    new Notice("Footnote link ready (clipboard blocked): " + combo);
  }

  // Replace the label word in the verse with the footnote link
  if (AUTO_REPLACE_LABEL_IN_VERSE && editor) {
    const vb = getVerseBlock(chapterText, vNum);
    if (vb) {
      let verseBlock = vb.text;
      
      // Create a regex to find the label word (case-sensitive, whole word only)
      // Also account for the word with trailing punctuation
      // Escape special regex characters in the label
      const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Match word with or without trailing punctuation
      const labelRegex = new RegExp(`\\b${escapedLabel}\\b[!?.,:;]*`);
      
      // Check if the label exists in the verse block
      if (labelRegex.test(verseBlock)) {
        // Replace the first occurrence of the word in the verse (with any trailing punctuation)
        let updatedVerseBlock = verseBlock.replace(labelRegex, combo);
        
        // Update the chapter file
        chapterText = chapterText.slice(0, vb.start) + updatedVerseBlock + chapterText.slice(vb.end);
        await app.vault.modify(chapterFile, chapterText);
        
        new Notice(`Replaced "${label}" with footnote link`);
      } else {
        new Notice(`Warning: Label "${label}" not found in verse block`);
      }
    }
  }

  // Add combo under verse in chapter note (if not already replaced)
  if (ADD_LINK_UNDER_VERSE && !AUTO_REPLACE_LABEL_IN_VERSE) {
    const vb = getVerseBlock(chapterText, vNum);
    if (vb) {
      let verseBlock2 = vb.text;
      const comboLine = "- " + combo;

      if (!verseBlock2.includes(comboLine)) {
        verseBlock2 = verseBlock2.replace(/\s*$/, "") + "\n\n" + comboLine + "\n";
        chapterText = chapterText.slice(0, vb.start) + verseBlock2 + chapterText.slice(vb.end);
        await app.vault.modify(chapterFile, chapterText);
      }
    }
  }

  // Return nothing to insert into the note by default
  return "";
  
  //#endregion
};