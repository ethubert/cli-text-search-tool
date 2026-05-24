import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

export const DEFAULT_FILES_DIR = './files';

export async function listAvailableFiles(filesDir = DEFAULT_FILES_DIR) {
  const entries = await readdir(filesDir);
  return entries.filter((name) => name.toLowerCase().endsWith('.json'));
}

function flattenDataset(parsed, sourceFile) {
  const records = [];

  if (Array.isArray(parsed)) {
    for (const item of parsed) {
      records.push({
        id: item.id ?? `${item.book ?? 'unknown'}.${item.chapter ?? 0}.${item.verse ?? 0}`,
        book: item.book ?? null,
        chapter: item.chapter ?? null,
        verse: item.verse ?? null,
        text: typeof item.text === 'string' ? item.text : '',
        reference: item.reference ?? null,
        _source: sourceFile,
      });
    }
    return records;
  }

  const books = parsed?.books ?? [];
  for (const bookEntry of books) {
    const bookName = bookEntry.book;
    for (const chapterEntry of bookEntry.chapters ?? []) {
      const chapterNumber = chapterEntry.chapter;
      for (const verseEntry of chapterEntry.verses ?? []) {
        records.push({
          id: `${bookName}.${chapterNumber}.${verseEntry.verse}`,
          book: bookName,
          chapter: chapterNumber,
          verse: verseEntry.verse,
          text: typeof verseEntry.text === 'string' ? verseEntry.text : '',
          reference: verseEntry.reference ?? `${bookName} ${chapterNumber}:${verseEntry.verse}`,
          _source: sourceFile,
        });
      }
    }
  }

  return records;
}

export async function loadDataset(filePath) {
  const raw = await readFile(filePath, 'utf-8');
  const parsed = JSON.parse(raw);
  const sourceFile = filePath.split(/[\\/]/).pop();
  return flattenDataset(parsed, sourceFile);
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function search(query, selectedFiles, filesDir = DEFAULT_FILES_DIR) {
  if (typeof query !== 'string' || query.trim().length === 0) {
    return [];
  }

  const wordRe = new RegExp('\\b' + escapeRegExp(query.trim()) + '\\b', 'i');
  const results = [];

  for (const fileName of selectedFiles) {
    const filePath = join(filesDir, fileName);
    const records = await loadDataset(filePath);

    for (const record of records) {
      if (wordRe.test(record.text)) {
        results.push(record);
      }
    }
  }

  return results;
}
