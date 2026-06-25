'use strict';

// Couleurs ANSI pour un affichage lisible dans le terminal
const COLORS = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
};

const logger = {
  info: (msg) => console.log(`${COLORS.cyan}[INFO]${COLORS.reset} ${msg}`),
  success: (msg) => console.log(`${COLORS.green}[OK]${COLORS.reset}   ${msg}`),
  warn: (msg) => console.log(`${COLORS.yellow}[WARN]${COLORS.reset} ${msg}`),
  error: (msg) => console.error(`${COLORS.red}[ERR]${COLORS.reset}  ${msg}`),
  dim: (msg) => console.log(`${COLORS.gray}${msg}${COLORS.reset}`),
  progress: (current, total, name) => {
    const pct = Math.round((current / total) * 100);
    process.stdout.write(`\r${COLORS.cyan}[${pct}%]${COLORS.reset} ${current}/${total} - ${name.substring(0, 50).padEnd(50)}`);
  },
};

module.exports = logger;
