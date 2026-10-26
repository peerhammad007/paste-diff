/**
 * Generates a realistic ServiceNow-style script include of `lines` lines and
 * an AI-edited copy of it, for performance tests. Deterministic for a seed.
 */
export interface LargeFixture {
  oldText: string;
  newText: string;
  /** Number of separate edit sites applied to the new text. */
  edits: number;
}

function rng(seed: number) {
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

function methodBlock(i: number): string[] {
  return [
    `    /**`,
    `     * Looks up records for rule ${i}.`,
    `     */`,
    `    rule${i}: function(sysId, options) {`,
    `        var gr = new GlideRecord('u_table_${i % 37}');`,
    `        gr.addQuery('sys_id', sysId);`,
    `        gr.addQuery('active', true);`,
    `        if (options && options.limit) {`,
    `            gr.setLimit(options.limit);`,
    `        }`,
    `        gr.query();`,
    `        var results = [];`,
    `        while (gr.next()) {`,
    `            results.push(gr.getUniqueValue());`,
    `        }`,
    `        return results;`,
    `    },`,
    ``,
  ];
}

export function generateBaseLines(lines: number): string[] {
  const out = ['var LargeUtils = Class.create();', 'LargeUtils.prototype = {', '    initialize: function() {},', ''];
  for (let i = 0; out.length < lines - 2; i++) out.push(...methodBlock(i));
  out.length = lines - 2;
  out.push("    type: 'LargeUtils'", '};');
  return out;
}

/** `editSites` scattered modifications, insertions and deletions, like an AI touching many methods. */
export function generateLargeFixture(lines = 5000, editSites = 60, seed = 7): LargeFixture {
  const random = rng(seed);
  const base = generateBaseLines(lines);
  const next = [...base];
  // Edit from the bottom up so earlier indices stay valid.
  const sites = Array.from({ length: editSites }, () => 4 + Math.floor(random() * (lines - 10)))
    .sort((a, b) => b - a);
  sites.forEach((at, n) => {
    const kind = n % 3;
    if (kind === 0) next[at] = next[at].replace(/\)/, ', extra)') + ' // changed';
    else if (kind === 1) next.splice(at, 0, `        gs.debug('trace ${n}');`, `        gs.info('step ${n}');`);
    else next.splice(at, 2);
  });
  return { oldText: base.join('\n') + '\n', newText: next.join('\n') + '\n', edits: editSites };
}

/** Same file, every line re-indented from 4 spaces to tabs, plus a few real edits. */
export function generateReindentFixture(lines = 5000): LargeFixture {
  const { oldText, newText } = generateLargeFixture(lines, 20);
  const tabbed = newText.replace(/^( {4})+/gm, (indent) => '\t'.repeat(indent.length / 4));
  return { oldText, newText: tabbed, edits: 20 };
}

/** Worst case: two unrelated 5,000-line files. */
export function generateUnrelatedFixture(lines = 5000): LargeFixture {
  const oldText = generateBaseLines(lines).join('\n');
  const newText = generateBaseLines(lines)
    .map((line, i) => `${line} /* ${i} */`)
    .reverse()
    .join('\n');
  return { oldText, newText, edits: lines };
}
