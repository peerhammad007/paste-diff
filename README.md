# Paste Diff

Paste the **old** and **new** versions of a file and see exactly which blocks changed, with line numbers, so you can apply just those changes in the ServiceNow Studio editor instead of replacing the whole script.

It is built for the "the AI gave me a whole new file" workflow: script includes, business rules, client scripts, and the occasional JSON, XML or HTML (UI pages, widgets).

## Privacy: nothing leaves your browser

Paste Diff is a static web app with **no backend, no network calls and no analytics**.

- All diffing runs in your browser, in a Web Worker.
- The editor (Monaco) and its worker are bundled with the app. Nothing is loaded from a CDN, and there are no web fonts or external images.
- The production build sets a strict Content-Security-Policy (`default-src 'self'; connect-src 'self'; ...`). Even if some code tried to send data to another host, the browser would block it.
- Your pastes, settings and "Applied" marks are stored only in this browser's `localStorage`, so they survive a refresh. **Clear all** removes them.

If you host the built `dist/` folder somewhere, the files are still served as-is and the app still talks to nothing but the host it was loaded from.

## Setup

You need Node.js 20 or newer.

```bash
npm install
npm run dev        # http://localhost:5173
```

Other scripts:

```bash
npm test           # unit + performance tests (Vitest)
npm run build      # typecheck + production build into dist/
npm run preview    # serve the production build (with the CSP) on http://localhost:4173
```

## Usage

1. Paste the current file from Studio into **Old** and the AI's version into **New**. The diff updates about 0.4 s after you stop typing. **Compare** runs it immediately.
2. The **summary bar** shows the number of changes, lines added and removed, and how many changes you've marked as applied.
3. Each change in the right-hand **hunk list** shows:
   - its type: **Added**, **Removed** or **Modified**;
   - where it is in the **old** file (the lines to replace, or "insert after line N");
   - where it is in the **new** file;
   - a short preview.
4. Click a card, or use **J / K** or **Alt+↓ / Alt+↑**, to jump to a change in the diff. J and K are ignored while you're typing in a text field.
5. **Copy new code** copies just that block's new lines. Select the old lines in Studio (shown on the card) and paste over them.
   - **Copy old code** copies the original lines, for rolling a change back.
   - **Copy full new file** is the fallback.
6. Tick **Applied** as you go. The marks survive a refresh, and a change keeps its mark even if other parts of the file change.
7. Use **Hide inputs** to give the diff more room, and **Side by side / Inline** to switch the layout.

### Ignore options

These are applied before diffing. **Line numbers and copied code always refer to the original pasted text**, never the normalized text.

| Option | Effect |
| --- | --- |
| Trailing whitespace | `foo();   ` equals `foo();` (on by default) |
| Line endings | CRLF, LF, CR and a missing final newline are equal (on by default) |
| All whitespace | Lines are compared with all whitespace removed: indentation, tabs vs spaces, spacing |
| Blank lines | Adding or removing empty lines isn't a change |

Notes:

- Browsers convert CRLF to LF when you paste into a text area, so pasted text usually arrives as LF already. The line-endings option is mostly a safety net.
- The hunk list is the authority on what to apply. Monaco computes its own highlighting, which may group a change slightly differently. With "All whitespace" or "Blank lines" on, it may also tint lines that the hunk list ignores.
- If two files are too different to diff line by line within 5 seconds, Paste Diff shows the whole file as one change and says so.

## Performance

These numbers come from a generated 5,000-line script include (`tests/fixtures/generateLarge.ts`), measured with `npm test`. Diffing runs in a Web Worker, so typing stays responsive even in the worst case.

| Case | Hunks | Diff time |
| --- | --- | --- |
| 60 scattered AI edits | 59 | ~3 ms |
| 400 scattered edits | 347 | ~20 ms |
| Whole file re-indented to tabs + 20 edits, all ignores on | 20 | ~1 ms |
| Two unrelated 5,000-line files (worst case) | 1 | ~1.6 s, off the main thread |

In the browser (production build, 5,000 lines, 416 changes):

- After you click Compare, all 416 hunk cards are on screen in about 40 ms. Of that, the diff takes 14 ms in the worker.
- The longest main-thread task is about 70 ms, from rendering the cards.
- Typing into a 5,000-line pane stays responsive. In dev mode, 2 of 34 keystrokes took more than 16 ms (32 ms each).

## Project layout

```
src/
  core/        pure TypeScript, no DOM: normalize.ts, diff.ts (hunks + line mapping), format.ts, hash.ts, types.ts
  worker/      diff.worker.ts runs core/diff off the main thread
  monaco/      setup.ts: bundled Monaco core + JS/XML/HTML/CSS highlighting, no language-service workers
  hooks/       useDiff (worker), usePersistentState (localStorage), useHunkNavigation (J/K, Alt+arrows)
  components/  Toolbar, InputPanes, SummaryBar, DiffView (Monaco), HunkList, HunkCard, CopyButton
tests/
  fixtures/generateLarge.ts   5,000-line fixture generator
  performance.test.ts
```

The core logic has unit tests next to it (`src/core/*.test.ts`). They cover:

- normalization: CRLF vs LF, trailing whitespace, mixed tabs and spaces, blank lines;
- hunk extraction;
- mapping line numbers back to the original text, including a randomized check across all 16 option combinations.
