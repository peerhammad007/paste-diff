import { memo, useEffect, useRef } from 'react';
import type { Hunk } from '../core/types';
import { monaco } from '../monaco/setup';

/** The hunk to highlight and scroll to. A new `token` re-scrolls to the same hunk. */
export interface DiffFocus {
  hunk: Hunk;
  token: number;
}

interface DiffViewProps {
  original: string;
  modified: string;
  language: string;
  sideBySide: boolean;
  ignoreTrimWhitespace: boolean;
  focus: DiffFocus | null;
}

const DARK_QUERY = '(prefers-color-scheme: dark)';

function themeFor(dark: boolean): string {
  return dark ? 'vs-dark' : 'vs';
}

function focusDecoration(start: number, end: number): monaco.editor.IModelDeltaDecoration[] {
  if (end < start) return [];
  return [
    {
      range: new monaco.Range(start, 1, end, 1),
      options: { isWholeLine: true, className: 'hunk-focus-line', linesDecorationsClassName: 'hunk-focus-gutter' },
    },
  ];
}

export const DiffView = memo(function DiffView({
  original,
  modified,
  language,
  sideBySide,
  ignoreTrimWhitespace,
  focus,
}: DiffViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneDiffEditor | null>(null);
  const modelsRef = useRef<{
    original: monaco.editor.ITextModel;
    modified: monaco.editor.ITextModel;
  } | null>(null);
  const decorationsRef = useRef<{
    original: monaco.editor.IEditorDecorationsCollection;
    modified: monaco.editor.IEditorDecorationsCollection;
  } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const editor = monaco.editor.createDiffEditor(containerRef.current, {
      readOnly: true,
      originalEditable: false,
      automaticLayout: true,
      renderSideBySide: sideBySide,
      useInlineViewWhenSpaceIsLimited: false,
      ignoreTrimWhitespace,
      renderOverviewRuler: true,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      fontSize: 13,
      theme: themeFor(window.matchMedia(DARK_QUERY).matches),
    });
    const models = {
      original: monaco.editor.createModel(original, language),
      modified: monaco.editor.createModel(modified, language),
    };
    editor.setModel(models);
    editorRef.current = editor;
    modelsRef.current = models;
    decorationsRef.current = {
      original: editor.getOriginalEditor().createDecorationsCollection(),
      modified: editor.getModifiedEditor().createDecorationsCollection(),
    };
    return () => {
      editor.dispose();
      models.original.dispose();
      models.modified.dispose();
      editorRef.current = null;
      modelsRef.current = null;
      decorationsRef.current = null;
    };
    // Created once; later prop changes are applied by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const models = modelsRef.current;
    if (!models) return;
    if (models.original.getValue() !== original) models.original.setValue(original);
    if (models.modified.getValue() !== modified) models.modified.setValue(modified);
  }, [original, modified]);

  useEffect(() => {
    const models = modelsRef.current;
    if (!models) return;
    monaco.editor.setModelLanguage(models.original, language);
    monaco.editor.setModelLanguage(models.modified, language);
  }, [language]);

  // Highlight the focused hunk. Re-applied when text changes, because
  // replacing a model's content drops its decorations.
  useEffect(() => {
    const decorations = decorationsRef.current;
    if (!decorations) return;
    const hunk = focus?.hunk;
    decorations.original.set(hunk ? focusDecoration(hunk.oldStart, hunk.oldEnd) : []);
    decorations.modified.set(hunk ? focusDecoration(hunk.newStart, hunk.newEnd) : []);
  }, [focus, original, modified]);

  // Scroll to the focused hunk. The two sides scroll together, so reveal it
  // on whichever side has lines (the new side, unless the hunk only deletes).
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !focus) return;
    const { hunk } = focus;
    if (hunk.type === 'removed') {
      editor.getOriginalEditor().revealLinesInCenter(hunk.oldStart, hunk.oldEnd);
      // In inline view the removed lines live in the modified editor, next to the anchor.
      editor.getModifiedEditor().revealLineInCenter(Math.max(1, hunk.newEnd));
    } else {
      editor.getModifiedEditor().revealLinesInCenter(hunk.newStart, hunk.newEnd);
    }
  }, [focus]);

  // Follow the OS light/dark setting (Monaco themes are global).
  useEffect(() => {
    const media = window.matchMedia(DARK_QUERY);
    const onChange = () => monaco.editor.setTheme(themeFor(media.matches));
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    editorRef.current?.updateOptions({ renderSideBySide: sideBySide, ignoreTrimWhitespace });
  }, [sideBySide, ignoreTrimWhitespace]);

  return <div className="diff-view" ref={containerRef} />;
});
