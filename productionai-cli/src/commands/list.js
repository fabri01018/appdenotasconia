const chalk = require('chalk');
const { getAllTasks } = require('../repositories/tasks');
const { getAllProjects } = require('../repositories/projects');

async function listCommand(options) {
  try {
    const { project, json } = options;
    
    let tasks;
    
    if (project) {
      // Filter by project name
      const projects = require('../repositories/projects');
      const proj = await projects.getProjectByName(project);
      
      if (!proj) {
        console.error(chalk.red(`❌ Project "${project}" not found.`));
        process.exit(1);
      }
      
      const tasksRepo = require('../repositories/tasks');
      tasks = await tasksRepo.getTasksByProjectId(proj.id);
    } else {
      // List all tasks
      tasks = await getAllTasks();
    }
    
    if (json) {
      console.log(JSON.stringify(tasks, null, 2));
      return;
    }
    
    // Pretty print
    if (tasks.length === 0) {
      console.log(chalk.dim('No tasks found.'));
      return;
    }
    
    console.log(chalk.bold(`\n📋 Tasks (${tasks.length}):\n`));
    console.log(chalk.dim('ID'.padEnd(6) + 'PROJECT'.padEnd(20) + 'TITLE'));
    console.log(chalk.dim('─'.repeat(60)));
    
    for (const task of tasks) {
      const id = chalk.cyan(`#${task.id}`.padEnd(6));
      const project = chalk.yellow(`[${(task.project_name || 'Unknown').slice(0, 18)}]`.padEnd(20));
      const title = task.completed ? chalk.strikethrough.dim(task.title) : task.title;
      const checkmark = task.completed ? chalk.green('✓ ') : '  ';
      
      console.log(`${id}${project}${checkmark}${title}`);
    }
    
    console.log('');
    
  } catch (error) {
    console.error(chalk.red('❌ Error listing tasks:'), error.message);
    process.exit(1);
  }
}

module.exports = listCommand;

