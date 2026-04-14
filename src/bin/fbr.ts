#!/usr/bin/env node

import { spawn } from 'child_process';

const args = process.argv.slice(2);
const command = args[0];

function help() {
  console.log(`
file-based-router CLI

Usage:
  fbr dev           Start development server with auto-reload
  fbr build         Build the project for production (after tsc!)
  fbr help          Show this help message

Examples:
  fbr dev
  tsc && fbr build
`);
  process.exit(0);
}

function dev() {
  const child = spawn('tsx', ['--watch', 'src/main.ts'], {
    stdio: 'inherit',
    shell: true
  });

  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });
}

function build() {
  // build logic
  console.log(`
fbr build is not implemented yet. For now just use tsc to compile the project.    
`);
  process.exit(-1);
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
