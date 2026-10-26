import { describe, expect, it } from 'vitest';
import { computeDiff } from '../src/core/diff';
import { DEFAULT_NORMALIZE_OPTIONS, type NormalizeOptions } from '../src/core/types';
import { generateLargeFixture, generateReindentFixture, generateUnrelatedFixture } from './fixtures/generateLarge';

const ALL_IGNORES: NormalizeOptions = {
  ignoreTrailingWhitespace: true,
  ignoreLineEndings: true,
  ignoreAllWhitespace: true,
  ignoreBlankLines: true,
};

function time<T>(run: () => T, repeats = 5): { result: T; medianMs: number } {
  let result!: T;
  const samples: number[] = [];
  for (let i = 0; i < repeats; i++) {
    const start = performance.now();
    result = run();
    samples.push(performance.now() - start);
  }
  samples.sort((a, b) => a - b);
  return { result, medianMs: samples[Math.floor(samples.length / 2)] };
}

// Budgets are generous so the suite isn't flaky on slow machines; the logged
// numbers are the real measurements.
describe('5,000-line performance', () => {
  it('typical AI edit: 60 scattered changes', () => {
    const { oldText, newText } = generateLargeFixture(5000, 60);
    const { result, medianMs } = time(() => computeDiff(oldText, newText, DEFAULT_NORMALIZE_OPTIONS));
    console.info(`5,000 lines / 60 edit sites: ${result.hunks.length} hunks in ${medianMs.toFixed(1)} ms (median of 5)`);
    expect(result.approximate).toBe(false);
    expect(result.hunks.length).toBeGreaterThan(40);
    expect(medianMs).toBeLessThan(500);
  });

  it('many changes: 400 scattered edit sites', () => {
    const { oldText, newText } = generateLargeFixture(5000, 400);
    const { result, medianMs } = time(() => computeDiff(oldText, newText, DEFAULT_NORMALIZE_OPTIONS));
    console.info(`5,000 lines / 400 edit sites: ${result.hunks.length} hunks in ${medianMs.toFixed(1)} ms (median of 5)`);
    expect(result.approximate).toBe(false);
    expect(medianMs).toBeLessThan(1000);
  });

  it('whole file re-indented to tabs, with every ignore toggle on', () => {
    const { oldText, newText } = generateReindentFixture(5000);
    const { result, medianMs } = time(() => computeDiff(oldText, newText, ALL_IGNORES));
    console.info(`5,000 lines re-indented, all ignores: ${result.hunks.length} hunks in ${medianMs.toFixed(1)} ms (median of 5)`);
    expect(result.approximate).toBe(false);
    expect(result.hunks.length).toBeLessThanOrEqual(20);
    expect(medianMs).toBeLessThan(500);
  });

  it('worst case: two unrelated 5,000-line files finish or fall back within the time limit', () => {
    const { oldText, newText } = generateUnrelatedFixture(5000);
    const { result, medianMs } = time(() => computeDiff(oldText, newText, DEFAULT_NORMALIZE_OPTIONS), 1);
    console.info(
      `5,000 lines, unrelated files: ${result.hunks.length} hunk(s), approximate=${result.approximate}, ${medianMs.toFixed(0)} ms`,
    );
    expect(medianMs).toBeLessThan(7000);
  }, 15000);
});
