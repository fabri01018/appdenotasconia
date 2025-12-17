const chalk = require('chalk');
const { getTaskById, updateTask } = require('../repositories/tasks');

async function checkCommand(taskId, options) {
  try {
    const task = await getTaskById(parseInt(taskId));
    
    if (!task) {
      console.error(chalk.red(`❌ Task #${taskId} not found.`));
      process.exit(1);
    }
    
    // Toggle completion status
    const newStatus = task.completed ? 0 : 1;
    await updateTask(task.id, { completed: newStatus });
    
    if (newStatus) {
      console.log(chalk.green(`✅ Task #${taskId} marked as complete.`));
    } else {
      console.log(chalk.yellow(`📝 Task #${taskId} marked as incomplete.`));
    }
    
  } catch (error) {
    console.error(chalk.red('❌ Error toggling task:'), error.message);
    process.exit(1);
  }
}

module.exports = checkCommand;

