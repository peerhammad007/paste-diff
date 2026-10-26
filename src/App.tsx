import { lazy, Suspense, useCallback, useMemo } from 'react';
import { DEFAULT_NORMALIZE_OPTIONS, isNormalizeOptions } from './core/types';
import { InputPanes } from './components/InputPanes';
import { Toolbar } from './components/Toolbar';
import { SummaryBar } from './components/SummaryBar';
import { HunkList } from './components/HunkList';
import { useDebouncedValue } from './hooks/useDebouncedValue';
import { useDiff } from './hooks/useDiff';
import { useHunkNavigation } from './hooks/useHunkNavigation';
import {
  clearPersistentState,
  isBoolean,
  isString,
  isStringArray,
  usePersistentState,
} from './hooks/usePersistentState';

// Monaco is most of the bundle; load it separately so the paste panes are usable immediately.
const DiffView = lazy(() => import('./components/DiffView').then((module) => ({ default: module.DiffView })));

const AUTO_DIFF_DELAY_MS = 400;
const TEXT_WRITE_DELAY_MS = 500;
/** Applied ids are content hashes; keep the most recent ones so storage can't grow forever. */
const MAX_APPLIED_IDS = 1000;

export function App() {
  const [oldText, setOldText] = usePersistentState('old', '', isString, TEXT_WRITE_DELAY_MS);
  const [newText, setNewText] = usePersistentState('new', '', isString, TEXT_WRITE_DELAY_MS);
  const [options, setOptions] = usePersistentState('options', DEFAULT_NORMALIZE_OPTIONS, isNormalizeOptions);
  const [appliedList, setAppliedList] = usePersistentState<string[]>('applied', [], isStringArray);
  const [sideBySide, setSideBySide] = usePersistentState('sideBySide', true, isBoolean);
  const [inputsCollapsed, setInputsCollapsed] = usePersistentState('inputsCollapsed', false, isBoolean);
  const appliedIds = useMemo(() => new Set(appliedList), [appliedList]);

  const pair = useMemo(() => ({ oldText, newText }), [oldText, newText]);
  const [inputs, flush] = useDebouncedValue(pair, AUTO_DIFF_DELAY_MS);
  const diff = useDiff(inputs.oldText, inputs.newText, options);
  const bothEmpty = inputs.oldText === '' && inputs.newText === '';

  const onAppliedChange = useCallback(
    (id: string, applied: boolean) =>
      setAppliedList((list) => {
        const rest = list.filter((existing) => existing !== id);
        return applied ? [...rest, id].slice(-MAX_APPLIED_IDS) : rest;
      }),
    [setAppliedList],
  );
  const hunks = useMemo(() => diff.result?.hunks ?? [], [diff.result]);
  const appliedCount = hunks.filter((hunk) => appliedIds.has(hunk.id)).length;
  const navigation = useHunkNavigation(hunks);

  const onClearAll = () => {
    if (!window.confirm('Clear both pastes, applied marks and settings from this browser?')) return;
    clearPersistentState();
    setOldText('');
    setNewText('');
    setOptions(DEFAULT_NORMALIZE_OPTIONS);
    setAppliedList([]);
    setSideBySide(true);
    setInputsCollapsed(false);
    flush({ oldText: '', newText: '' });
  };

  return (
    <div className="app">
      <Toolbar
        options={options}
        onOptionsChange={setOptions}
        onCompare={() => flush()}
        newText={newText}
        onClearAll={onClearAll}
        sideBySide={sideBySide}
        onSideBySideChange={setSideBySide}
      />
      <InputPanes
        oldText={oldText}
        newText={newText}
        onOldChange={setOldText}
        onNewChange={setNewText}
        collapsed={inputsCollapsed}
        onCollapsedChange={setInputsCollapsed}
      />
      <SummaryBar
        state={diff}
        appliedCount={appliedCount}
        onPrevious={navigation.previous}
        onNext={navigation.next}
      />
      <main className="diff-area">
        <Suspense fallback={<div className="diff-view diff-loading">Loading editor…</div>}>
          <DiffView
            original={inputs.oldText}
            modified={inputs.newText}
            language="javascript"
            sideBySide={sideBySide}
            // Monaco's option also ignores leading whitespace, so it only matches
            // our "all whitespace" toggle.
            ignoreTrimWhitespace={options.ignoreAllWhitespace}
            focus={navigation.focus}
          />
        </Suspense>
        <HunkList
          state={diff}
          bothEmpty={bothEmpty}
          appliedIds={appliedIds}
          onAppliedChange={onAppliedChange}
          activeId={navigation.activeId}
          onSelect={navigation.select}
        />
      </main>
    </div>
  );
}
