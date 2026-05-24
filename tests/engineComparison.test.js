import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { search as naiveSearch, listAvailableFiles } from '../src/searchEngine.js';
import { search as miniSearch } from '../src/miniSearchEngine.js';

describe('Engine comparison', () => {
  it('both engines return identical results for "God"', async () => {
    const files = await listAvailableFiles();
    const naiveResults = await naiveSearch('God', files);
    const miniResults = await miniSearch('God', files);
    
    assert.equal(naiveResults.length, miniResults.length);
    
    const naiveIds = naiveResults.map(r => r.id).sort();
    const miniIds = miniResults.map(r => r.id).sort();
    assert.deepEqual(naiveIds, miniIds);
  });

  it('both engines return identical results for "You"', async () => {
    const files = await listAvailableFiles();
    const naiveResults = await naiveSearch('You', files);
    const miniResults = await miniSearch('You', files);
    
    assert.equal(naiveResults.length, miniResults.length);
    
    const naiveIds = naiveResults.map(r => r.id).sort();
    const miniIds = miniResults.map(r => r.id).sort();
    assert.deepEqual(naiveIds, miniIds);
  });

  it('both engines return identical results for "Matthew"', async () => {
    const files = await listAvailableFiles();
    const naiveResults = await naiveSearch('Matthew', files);
    const miniResults = await miniSearch('Matthew', files);
    
    assert.equal(naiveResults.length, miniResults.length);
    
    const naiveIds = naiveResults.map(r => r.id).sort();
    const miniIds = miniResults.map(r => r.id).sort();
    assert.deepEqual(naiveIds, miniIds);
  });

  it('neither engine matches substrings like "Godfearing"', async () => {
    const files = await listAvailableFiles();
    const naiveResults = await naiveSearch('God', files);
    const miniResults = await miniSearch('God', files);
    
    for (const result of naiveResults) {
      const hasWholeWord = /\bGod\b/i.test(result.text);
      assert.ok(hasWholeWord, `Naive result should contain whole word "God": ${result.text}`);
    }
    
    for (const result of miniResults) {
      const hasWholeWord = /\bGod\b/i.test(result.text);
      assert.ok(hasWholeWord, `MiniSearch result should contain whole word "God": ${result.text}`);
    }
  });

  it('both engines perform case-insensitive matching', async () => {
    const files = await listAvailableFiles();
    const lowerResults = await naiveSearch('god', files);
    const upperResults = await naiveSearch('GOD', files);
    const mixedResults = await naiveSearch('God', files);
    
    assert.equal(lowerResults.length, upperResults.length);
    assert.equal(lowerResults.length, mixedResults.length);
    
    const miniLower = await miniSearch('god', files);
    const miniUpper = await miniSearch('GOD', files);
    const miniMixed = await miniSearch('God', files);
    
    assert.equal(miniLower.length, miniUpper.length);
    assert.equal(miniLower.length, miniMixed.length);
    assert.equal(lowerResults.length, miniLower.length);
  });
});
