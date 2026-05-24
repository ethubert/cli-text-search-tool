import { performance } from 'node:perf_hooks';
import { search as naiveSearch, listAvailableFiles } from '../src/searchEngine.js';
import { search as miniSearch } from '../src/miniSearchEngine.js';

const QUERIES = ['God', 'You', 'Matthew'];

async function runBenchmark(engineName, searchFn) {
  const files = await listAvailableFiles();
  
  console.log(`\n${engineName} Engine:`);
  console.log('='.repeat(50));
  
  for (const query of QUERIES) {
    const start = performance.now();
    const results = await searchFn(query, files);
    const end = performance.now();
    const duration = end - start;
    
    console.log(`${query}: ${duration.toFixed(2)}ms (${results.length} results)`);
  }
}

async function main() {
  console.log('Benchmark Results');
  console.log('='.repeat(50));
  
  await runBenchmark('Naive', naiveSearch);
  await runBenchmark('MiniSearch', miniSearch);
}

main();
