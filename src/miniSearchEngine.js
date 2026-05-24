import { join } from 'node:path';
import MiniSearch from 'minisearch';
import { DEFAULT_FILES_DIR, listAvailableFiles, loadDataset } from './searchEngine.js';

export { DEFAULT_FILES_DIR, listAvailableFiles, loadDataset };

let indexCache = new Map();

async function buildIndex(selectedFiles, filesDir = DEFAULT_FILES_DIR) {
  const cacheKey = `${filesDir}:${selectedFiles.sort().join(',')}`;
  
  if (indexCache.has(cacheKey)) {
    return indexCache.get(cacheKey);
  }

  const allRecords = [];
  for (const fileName of selectedFiles) {
    const filePath = join(filesDir, fileName);
    const records = await loadDataset(filePath);
    allRecords.push(...records);
  }

  const miniSearch = new MiniSearch({
    fields: ['text'],
    storeFields: ['id', 'book', 'chapter', 'verse', 'text', 'reference', '_source'],
    searchOptions: {
      prefix: false,
      fuzzy: false,
      combineWith: 'AND',
    },
  });

  miniSearch.addAll(allRecords);
  
  indexCache.set(cacheKey, { miniSearch, allRecords });
  return { miniSearch, allRecords };
}

export async function search(query, selectedFiles, filesDir = DEFAULT_FILES_DIR) {
  if (typeof query !== 'string' || query.trim().length === 0) {
    return [];
  }

  const { miniSearch, allRecords } = await buildIndex(selectedFiles, filesDir);
  
  const trimmedQuery = query.trim();
  const searchResults = miniSearch.search(trimmedQuery);
  
  const resultIds = new Set(searchResults.map(r => r.id));
  const matchedRecords = allRecords.filter(record => resultIds.has(record.id));
  
  const wordRe = new RegExp('\\b' + escapeRegExp(trimmedQuery) + '\\b', 'i');
  return matchedRecords.filter(record => wordRe.test(record.text));
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
