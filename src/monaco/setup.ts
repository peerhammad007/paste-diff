// Monaco is bundled from node_modules and its worker is built by Vite, so the
// editor never loads anything from a CDN.
//
// Rather than `monaco-editor` (which also starts TypeScript, JSON, CSS and HTML
// language-service workers), this pulls in the editor core, the editor
// features a read-only diff needs, and syntax highlighting for the languages
// ServiceNow code is written in.
import * as monaco from 'monaco-editor/editor/editor.api';
import EditorWorker from 'monaco-editor/editor/editor.worker?worker';

import 'monaco-editor/features/codicon/register';
import 'monaco-editor/features/diffEditor/register';
import 'monaco-editor/features/find/register';
import 'monaco-editor/features/gotoLine/register';
import 'monaco-editor/features/folding/register';
import 'monaco-editor/features/bracketMatching/register';
import 'monaco-editor/features/wordHighlighter/register';
import 'monaco-editor/features/hover/register';
import 'monaco-editor/features/clipboard/register';
import 'monaco-editor/features/contextmenu/register';
import 'monaco-editor/features/lineSelection/register';
import 'monaco-editor/features/multicursor/register';
import 'monaco-editor/features/wordOperations/register';
import 'monaco-editor/features/stickyScroll/register';
// Flags invisible or look-alike characters (zero-width spaces, NBSP) that AI output sometimes contains.
import 'monaco-editor/features/unicodeHighlighter/register';

import 'monaco-editor/languages/definitions/javascript/register';
import 'monaco-editor/languages/definitions/xml/register';
import 'monaco-editor/languages/definitions/html/register';
import 'monaco-editor/languages/definitions/css/register';

self.MonacoEnvironment = {
  getWorker() {
    return new EditorWorker();
  },
};

export { monaco };
