#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const args = process.argv.slice(2);
const command = args[0];

function help() {
  console.log(`
file-based-router CLI

Usage:
  fbr dev           Start development server with auto-reload
  fbr build         Build the project for production
  fbr help          Show this help message

Examples:
  fbr dev
  fbr build
`);
  process.exit(0);
}

function dev() {
  const child = spawn('tsx', ['--watch', '--env-file', '.env.dev', 'src/main.ts'], {
    stdio: 'inherit',
    shell: true
  });

  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });
}

function build() {
  console.log('[FBR] Running tsc...');
  const tsc = spawn('tsc', [], { stdio: 'inherit', shell: true });

  tsc.on('exit', (code) => {
    if (code !== 0) {
      console.error('[FBR] tsc failed. Build aborted.');
      process.exit(code ?? 1);
    }

    console.log('[FBR] Generating production routes map...');
    const generateScript = fileURLToPath(new URL('./generate-routes.js', import.meta.url));
    const gen = spawn('tsx', ['--env-file', '.env', generateScript], {
      stdio: 'inherit',
      shell: true,
    });

    gen.on('exit', (genCode) => {
      if (genCode === 0)
        console.log('[FBR] Build complete.');
      else
        console.error('[FBR] Route map generation failed.');
      process.exit(genCode ?? 0);
    });
  });
}

switch (command) {
  case 'dev':
    dev();
    break;
  case 'build':
    build();
    break;
  case 'help':
  case '--help':
  case '-h':
  case undefined:
    help();
    break;
  default:
    console.error(`Unknown command: ${command}`);
    console.error('Run "fbr help" for usage information.');
    process.exit(1);
}
