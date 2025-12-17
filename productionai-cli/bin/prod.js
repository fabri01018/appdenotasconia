#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const packageJson = require('../package.json');

// Import commands
const addCommand = require('../src/commands/add');
const listCommand = require('../src/commands/list');
const tasksCommand = require('../src/commands/tasks');
const viewCommand = require('../src/commands/view');
const editCommand = require('../src/commands/edit');
const checkCommand = require('../src/commands/check');
const syncCommand = require('../src/commands/sync');
const syncFullCommand = require('../src/commands/sync-full');

const program = new Command();

program
  .name('prod')
  .description('ProductionAI CLI - Terminal task manager with blocks')
  .version(packageJson.version);

// Add command
program
  .command('add <text>')
  .description('Add a new task to Inbox')
  .action(async (text) => {
    await addCommand(text, {});
  });

// List command
program
  .command('ls')
  .alias('list')
  .description('List all tasks')
  .option('-p, --project <name>', 'Filter by project name')
  .option('-j, --json', 'Output as JSON')
  .action(async (options) => {
    await listCommand(options);
  });

// Tasks command - view tasks for a specific project
program
  .command('tasks <project...>')
  .description('View tasks for a specific project/folder')
  .option('-j, --json', 'Output as JSON')
  .action(async (projectParts, options) => {
    const project = projectParts.join(' ');
    await tasksCommand(project, options);
  });

// View command
program
  .command('view <taskId>')
  .alias('cat')
  .description('View task details with blocks')
  .action(async (taskId) => {
    await viewCommand(taskId, {});
  });

// Edit command
program
  .command('edit <taskId>')
  .description('Edit task in $EDITOR')
  .action(async (taskId) => {
    await editCommand(taskId, {});
  });

// Check/complete command
program
  .command('check <taskId>')
  .alias('do')
  .description('Toggle task completion status')
  .action(async (taskId) => {
    await checkCommand(taskId, {});
  });

// Projects command
program
  .command('projects')
  .alias('proj')
  .description('List all projects')
  .action(async () => {
    const { getAllProjects } = require('../src/repositories/projects');
    try {
      const projects = await getAllProjects();
      
      if (projects.length === 0) {
        console.log(chalk.dim('No projects found.'));
        return;
      }
      
      console.log(chalk.bold(`\n📁 Projects (${projects.length}):\n`));
      
      for (const project of projects) {
        console.log(chalk.cyan(`• ${project.name}`) + chalk.dim(` (ID: ${project.id})`));
      }
      
      console.log('');
    } catch (error) {
      console.error(chalk.red('❌ Error listing projects:'), error.message);
      process.exit(1);
    }
  });

// Sync command
program
  .command('sync')
  .description('Sync with Supabase (push local changes, pull remote changes)')
  .option('--push', 'Only push local changes to Supabase')
  .option('--pull', 'Only pull remote changes from Supabase')
  .action(async (options) => {
    await syncCommand(options);
  });

// Full sync command
program
  .command('sync-full')
  .description('Pull ALL data from Supabase (ignores timestamps, fresh sync)')
  .action(async () => {
    await syncFullCommand();
  });

// Parse arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}

