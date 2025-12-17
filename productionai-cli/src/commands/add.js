const chalk = require('chalk');
const { getInboxProject } = require('../repositories/projects');
const { createTask } = require('../repositories/tasks');

async function addCommand(text, options) {
  try {
    // Get the Inbox project (default target)
    const inbox = await getInboxProject();
    
    if (!inbox) {
      console.error(chalk.red('❌ Inbox project not found. Database may not be initialized.'));
      process.exit(1);
    }

    // Create the task
    const task = await createTask(inbox.id, text);
    
    console.log(chalk.green(`✅ Added task #${task.id}: "${text}"`));
    console.log(chalk.dim(`   Project: ${inbox.name}`));
    
    return task;
  } catch (error) {
    console.error(chalk.red('❌ Error adding task:'), error.message);
    process.exit(1);
  }
}

module.exports = addCommand;

