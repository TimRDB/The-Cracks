const test = require('node:test');
const assert = require('node:assert/strict');
const { plan } = require('../scripts/sort-assets.cjs');

test('assets/used holds exactly what the game loads and everything else is in assets/unused', () => {
  const { moves, problems } = plan();
  const misplaced = moves.map(m => `${m.bucket || 'assets/'} should be in ${m.to}: ${m.rel}`);
  assert.deepEqual([...problems, ...misplaced], [], 'run `node scripts/sort-assets.cjs` and point the game at assets/used/');
});
