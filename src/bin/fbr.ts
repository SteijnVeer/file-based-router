#!/usr/bin/env node

import { spawn } from 'child_process';

const args = process.argv.slice(2);
const command = args[0];

function help() {
  console.log(`
file-based-router CLI

Usage:
  fbr dev           Start development server with auto-reload
  fbr help          Show this help message

Options:
  --config <path>   Path to config file (default: fbr.config.{ts,js,json,...})
    ! can also be set via FBR_CONFIG_PATH environment variable

Examples:
  fbr dev
  fbr dev --config ./custom-config.ts
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

switch (command) {
  case 'dev':
    dev();
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
