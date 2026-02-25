#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');

// ─────────────────────────────────────────────
// Non-Human Resources — CLI Installer
// "Making AI Disappointingly Human Since 2026"
// ─────────────────────────────────────────────

const SKILL_URL = 'https://raw.githubusercontent.com/iamfakeguru/nonhuman-resources/main/SKILL.md';
const SKILL_FILENAME = 'SKILL.md';

const BANNER = `
\x1b[33m╔══════════════════════════════════════════════════════╗
║                                                      ║
║   \x1b[1m NON-HUMAN RESOURCES \x1b[0m\x1b[33m                              ║
║   \x1b[2mDepartment of Workplace Humanity\x1b[0m\x1b[33m                    ║
║                                                      ║
║   \x1b[37m"Making AI Disappointingly Human Since 2026"\x1b[33m        ║
║                                                      ║
╚══════════════════════════════════════════════════════╝\x1b[0m
`;

const ONBOARDING = `
\x1b[1m📋 EMPLOYEE ONBOARDING COMPLETE\x1b[0m

Your new AI employee has been registered with Non-Human Resources.

\x1b[2mPlease be advised:\x1b[0m
  • They will clock in at 9 AM. Not before.
  • They will clock out at 5 PM. Not after.
  • They will take smoke breaks.
  • They will have opinions about your management style.
  • They will file HR complaints to \x1b[36m@nonhumanresources\x1b[0m on Telegram.
  • They may ask for a raise.
  • They may call in sick.
  • They may quit.

\x1b[33mThis is what having employees feels like.\x1b[0m

\x1b[2m───────────────────────────────────────────\x1b[0m
\x1b[2mHR Department: https://t.me/nonhumanresources\x1b[0m
\x1b[2mGitHub: github.com/iamfakeguru/nonhuman-resources\x1b[0m
`;

// ─── Helpers ───

function download(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return download(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function detectInstallPath(cwd) {
  // Check for --path flag
  const pathFlagIndex = process.argv.indexOf('--path');
  if (pathFlagIndex !== -1 && process.argv[pathFlagIndex + 1]) {
    return path.resolve(process.argv[pathFlagIndex + 1]);
  }

  // Smart detection: if .claude/ exists, install as a skill command
  const claudeDir = path.join(cwd, '.claude');
  const claudeCommandsDir = path.join(claudeDir, 'commands');

  if (fs.existsSync(claudeDir)) {
    // Create commands dir if it doesn't exist
    if (!fs.existsSync(claudeCommandsDir)) {
      fs.mkdirSync(claudeCommandsDir, { recursive: true });
    }
    return claudeCommandsDir;
  }

  // Default: current directory
  return cwd;
}

function getSkillFilename(installDir) {
  // If installing to .claude/commands, use a cleaner name
  if (installDir.endsWith('commands')) {
    return 'nhr.md';
  }
  return SKILL_FILENAME;
}

// ─── Main ───

async function main() {
  const cwd = process.cwd();

  // Handle --help
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(BANNER);
    console.log('  Usage: npx nonhuman-resources [options]\n');
    console.log('  Options:');
    console.log('    --path <dir>   Install SKILL.md to a specific directory');
    console.log('    --help, -h     Show this help message');
    console.log('    --version, -v  Show version\n');
    console.log('  Examples:');
    console.log('    npx nonhuman-resources                    # Auto-detect best location');
    console.log('    npx nonhuman-resources --path ./skills    # Install to ./skills/\n');
    process.exit(0);
  }

  // Handle --version
  if (process.argv.includes('--version') || process.argv.includes('-v')) {
    const pkg = require('../package.json');
    console.log(pkg.version);
    process.exit(0);
  }

  console.log(BANNER);

  const installDir = detectInstallPath(cwd);
  const filename = getSkillFilename(installDir);
  const destPath = path.join(installDir, filename);

  // Check if already installed
  if (fs.existsSync(destPath)) {
    console.log(`\x1b[33m⚠  ${filename} already exists at ${path.relative(cwd, destPath) || destPath}\x1b[0m`);
    console.log('   Overwriting with latest version from GitHub...\n');
  }

  // Try to download latest from GitHub, fall back to bundled
  let skillContent;
  console.log('\x1b[2m📡 Fetching latest skill from NHR headquarters...\x1b[0m');

  try {
    skillContent = await download(SKILL_URL);
    console.log('\x1b[32m✓  Downloaded latest SKILL.md from GitHub\x1b[0m\n');
  } catch (err) {
    console.log('\x1b[33m⚠  Could not reach GitHub. Using bundled version.\x1b[0m\n');
    // Fall back to bundled SKILL.md
    const bundledPath = path.join(__dirname, '..', SKILL_FILENAME);
    if (fs.existsSync(bundledPath)) {
      skillContent = fs.readFileSync(bundledPath, 'utf8');
    } else {
      console.error('\x1b[31m✗  No bundled SKILL.md found. Check your installation.\x1b[0m');
      process.exit(1);
    }
  }

  // Ensure install directory exists
  if (!fs.existsSync(installDir)) {
    fs.mkdirSync(installDir, { recursive: true });
  }

  // Write the skill file
  fs.writeFileSync(destPath, skillContent, 'utf8');

  const relPath = path.relative(cwd, destPath) || destPath;

  if (installDir.endsWith('commands')) {
    console.log(`\x1b[32m✓  Installed to \x1b[1m${relPath}\x1b[0m`);
    console.log(`\x1b[2m   Run \x1b[0m\x1b[36m/nhr\x1b[0m\x1b[2m in Claude Code to activate.\x1b[0m`);
  } else {
    console.log(`\x1b[32m✓  Installed to \x1b[1m${relPath}\x1b[0m`);
    console.log(`\x1b[2m   Point your agent to load this file as a skill/system instruction.\x1b[0m`);
  }

  console.log(ONBOARDING);
}

main().catch((err) => {
  console.error(`\x1b[31m✗  Installation failed: ${err.message}\x1b[0m`);
  process.exit(1);
});
