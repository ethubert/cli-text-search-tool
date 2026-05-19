#!/usr/bin/env node
import inquirer from 'inquirer';
import { performance } from 'node:perf_hooks';
import { DEFAULT_FILES_DIR, listAvailableFiles, search } from './searchEngine.js';

const MAX_PREVIEW = 10;
const HIGHLIGHT_ON = '\x1b[1;33m';
const HIGHLIGHT_OFF = '\x1b[0m';

function highlight(text, query) {
  if (!query || !process.stdout.isTTY) return text;

  const haystack = text.toLowerCase();
  const needle = query.toLowerCase();
  let out = '';
  let cursor = 0;

  while (cursor < text.length) {
    const hit = haystack.indexOf(needle, cursor);
    if (hit === -1) {
      out += text.slice(cursor);
      break;
    }
    out += text.slice(cursor, hit);
    out += HIGHLIGHT_ON + text.slice(hit, hit + needle.length) + HIGHLIGHT_OFF;
    cursor = hit + needle.length;
  }

  return out;
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

function printResults(results, elapsedMs, query) {
  const preview = results.slice(0, MAX_PREVIEW);
  for (const record of preview) {
    console.log(formatResult(record, query));
  }
  const omitted = results.length - preview.length;
  if (omitted > 0) {
    console.log(`...and ${omitted} more.`);
  }
  console.log(`\n${results.length} result(s) in ${elapsedMs.toFixed(2)} ms\n`);
}

async function runQueryLoop(initialFiles) {
  let selectedFiles = initialFiles;
  console.log('\nCommands: ":files" to reselect files, ":quit" to exit. Empty input is ignored.\n');

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
    if (trimmed.length === 0) {
      continue;
    }

    const startedAt = performance.now();
    const results = await search(trimmed, selectedFiles);
    const elapsedMs = performance.now() - startedAt;

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
