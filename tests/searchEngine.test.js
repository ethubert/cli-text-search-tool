import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  DEFAULT_FILES_DIR,
  listAvailableFiles,
  loadDataset,
  search,
} from '../src/searchEngine.js';

async function makeFlatFixture() {
  const dir = await mkdtemp(join(tmpdir(), 'search-flat-'));
  const sample = [
    { id: 'GEN.1.1', book: 'Genesis', chapter: 1, verse: 1, text: 'In the beginning God created the heavens and the earth.' },
    { id: 'GEN.1.2', book: 'Genesis', chapter: 1, verse: 2, text: 'And the earth was without form, and void.' },
    { id: 'GEN.1.3', book: 'Genesis', chapter: 1, verse: 3, text: 'And God said, Let there be light: and there was light.' },
  ];
  await writeFile(join(dir, 'genesis.json'), JSON.stringify(sample), 'utf-8');
  return { dir, sample };
}

async function makeNestedFixture() {
  const dir = await mkdtemp(join(tmpdir(), 'search-nested-'));
  const sample = {
    books: [
      {
        book: 'Matthew',
        chapters: [
          {
            chapter: 1,
            reference: 'Matthew 1',
            verses: [
              { reference: 'Matthew 1:1', verse: 1, text: 'The book of the generation of Jesus Christ.' },
              { reference: 'Matthew 1:2', verse: 2, text: 'Abraham begat Isaac.' },
            ],
          },
        ],
      },
    ],
  };
  await writeFile(join(dir, 'matthew.json'), JSON.stringify(sample), 'utf-8');
  return { dir, sample };
}

test('listAvailableFiles returns only json files', async () => {
  const { dir } = await makeFlatFixture();
  try {
    await writeFile(join(dir, 'notes.txt'), 'ignored', 'utf-8');
    const files = await listAvailableFiles(dir);
    assert.deepEqual(files.sort(), ['genesis.json']);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('loadDataset parses a flat verse array', async () => {
  const { dir } = await makeFlatFixture();
  try {
    const records = await loadDataset(join(dir, 'genesis.json'));
    assert.equal(records.length, 3);
    assert.equal(records[0].book, 'Genesis');
    assert.equal(records[0]._source, 'genesis.json');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('loadDataset flattens the nested books/chapters/verses shape', async () => {
  const { dir } = await makeNestedFixture();
  try {
    const records = await loadDataset(join(dir, 'matthew.json'));
    assert.equal(records.length, 2);
    assert.equal(records[0].book, 'Matthew');
    assert.equal(records[0].chapter, 1);
    assert.equal(records[0].verse, 1);
    assert.equal(records[0].id, 'Matthew.1.1');
    assert.match(records[0].text, /Jesus Christ/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('search matches case-insensitive substrings', async () => {
  const { dir } = await makeFlatFixture();
  try {
    const results = await search('LIGHT', ['genesis.json'], dir);
    assert.equal(results.length, 1);
    assert.equal(results[0].id, 'GEN.1.3');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('search returns empty array for blank queries', async () => {
  const { dir } = await makeFlatFixture();
  try {
    assert.deepEqual(await search('', ['genesis.json'], dir), []);
    assert.deepEqual(await search('   ', ['genesis.json'], dir), []);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('search aggregates results across multiple files and tags _source', async () => {
  const { dir } = await makeFlatFixture();
  try {
    const second = [
      { id: 'EXO.1.1', book: 'Exodus', chapter: 1, verse: 1, text: 'Now these are the names of the children of Israel.' },
    ];
    await writeFile(join(dir, 'exodus.json'), JSON.stringify(second), 'utf-8');

    const results = await search('the', ['genesis.json', 'exodus.json'], dir);
    const sources = new Set(results.map((r) => r._source));
    assert.ok(sources.has('genesis.json'));
    assert.ok(sources.has('exodus.json'));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('search returns no matches for an absent term', async () => {
  const { dir } = await makeFlatFixture();
  try {
    const results = await search('xyzzy-not-a-word', ['genesis.json'], dir);
    assert.deepEqual(results, []);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('DEFAULT_FILES_DIR is exported as ./files', () => {
  assert.equal(DEFAULT_FILES_DIR, './files');
});
