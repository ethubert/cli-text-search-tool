#!/usr/bin/env node
import inquirer from 'inquirer';
import { writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { DEFAULT_FILES_DIR, listAvailableFiles, search } from './searchEngine.js';

const MAX_PREVIEW = 10;
const HIGHLIGHT_ON = '\x1b[1;33m';
const HIGHLIGHT_OFF = '\x1b[0m';

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlight(text, query) {
  if (!query || !process.stdout.isTTY) return text;
  const wordRe = new RegExp('\\b' + escapeRegExp(query) + '\\b', 'gi');
  return text.replace(wordRe, (match) => HIGHLIGHT_ON + match + HIGHLIGHT_OFF);
}

async function promptForFiles() {
  const available = await listAvailableFiles();
  if (available.length === 0) {
    console.error(`No JSON files found in ${DEFAULT_FILES_DIR}/. Add files and try again.`);
    process.exit(1);
  }

  const { selectedFiles } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selectedFiles',
      message: 'Select files to search:',
      choices: available.map((name) => ({ name, value: name, checked: true })),
      validate: (input) => (input.length > 0 ? true : 'Select at least one file.'),
    },
  ]);

  return selectedFiles;
}

function formatResult(record, query) {
  const ref = record.reference ?? `${record.book ?? '?'} ${record.chapter ?? '?'}:${record.verse ?? '?'}`;
  return `[${record._source}] ${ref} — ${highlight(record.text, query)}`;
}

function defaultFilename(query) {
  const safe = query.replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 50) || 'query';
  return `results_${safe}.txt`;
}

async function saveResults(filename, results, query, files, elapsedMs) {
  const header = [
    `Query: ${query}`,
    `Files: ${files.join(', ')}`,
    `Total: ${results.length}`,
    `Time:  ${elapsedMs.toFixed(2)} ms`,
    '---',
    '',
  ];
  const body = results.map((record) => formatResult(record, null));
  await writeFile(filename, header.concat(body).join('\n') + '\n', 'utf-8');
}

function printResults(results, elapsedMs, query) {
  const preview = results.slice(0, MAX_PREVIEW);
  for (const record of preview) {
    console.log(formatResult(record, query));
  }
  const omitted = results.length - preview.length;
  if (omitted > 0) {
    console.log(`...and ${omitted} more.`);
  }
  console.log(`\n${results.length} result(s) in ${elapsedMs.toFixed(2)} ms`);
  if (results.length > 0) {
    console.log(`Tip: ":save [filename]" writes all ${results.length} result(s) to a file (default: ${defaultFilename(query)}).`);
  }
  console.log('');
}

async function runQueryLoop(initialFiles) {
  let selectedFiles = initialFiles;
  let lastResults = [];
  let lastQuery = '';
  let lastFiles = [];
  let lastElapsedMs = 0;

  console.log('\nCommands: ":files" to reselect files, ":save [filename]" to save last results, ":quit" to exit. Empty input is ignored.\n');

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { query } = await inquirer.prompt([
      { type: 'input', name: 'query', message: 'search>' },
    ]);

    const trimmed = query.trim();
    if (trimmed === ':quit' || trimmed === ':q') {
      console.log('Goodbye.');
      return;
    }
    if (trimmed === ':files') {
      selectedFiles = await promptForFiles();
      continue;
    }
    if (trimmed === ':save' || trimmed.startsWith(':save ')) {
      if (!lastQuery) {
        console.log('No previous search to save. Run a search first.\n');
        continue;
      }
      const arg = trimmed === ':save' ? '' : trimmed.slice(':save '.length).trim();
      const filename = arg || defaultFilename(lastQuery);
      try {
        await saveResults(filename, lastResults, lastQuery, lastFiles, lastElapsedMs);
        console.log(`Wrote ${lastResults.length} result(s) to ${filename}\n`);
      } catch (err) {
        console.error(`Failed to write ${filename}: ${err.message}\n`);
      }
      continue;
    }
    if (trimmed.length === 0) {
      continue;
    }

    const startedAt = performance.now();
    const results = await search(trimmed, selectedFiles);
    const elapsedMs = performance.now() - startedAt;

    lastResults = results;
    lastQuery = trimmed;
    lastFiles = selectedFiles;
    lastElapsedMs = elapsedMs;

    printResults(results, elapsedMs, trimmed);
  }
}

async function main() {
  const selectedFiles = await promptForFiles();
  await runQueryLoop(selectedFiles);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
