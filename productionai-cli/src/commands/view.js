const chalk = require('chalk');
const { getTaskById } = require('../repositories/tasks');
const { descriptionToBlocks } = require('../lib/blocks');

/**
 * Render blocks as a tree with ASCII structure
 */
function renderBlocks(blocks, indent = 0) {
  const lines = [];
  const prefix = '  '.repeat(indent);
  
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    
    if (block.type === 'toggle') {
      const toggleSymbol = block.isOpen ? '▼' : '▶';
      lines.push(chalk.blue(`${prefix}${toggleSymbol} ${block.content}`));
      
      // Render children if expanded
      if (block.children && block.children.length > 0) {
        lines.push(...renderBlocks(block.children, indent + 1));
      }
    } else if (block.type === 'check') {
      const checkbox = block.checked ? chalk.green('[✓]') : chalk.dim('[ ]');
      const content = block.checked ? chalk.strikethrough.dim(block.content) : block.content;
      lines.push(`${prefix}${checkbox} ${content}`);
    } else if (block.type === 'block') {
      lines.push(`${prefix}${block.content || chalk.dim('(empty)')}`);
    }
  }
  
  return lines;
}

async function viewCommand(taskId, options) {
  try {
    const task = await getTaskById(parseInt(taskId));
    
    if (!task) {
      console.error(chalk.red(`❌ Task #${taskId} not found.`));
      process.exit(1);
    }
    
    // Print task header
    console.log('');
    console.log(chalk.bold.cyan(`Task #${task.id}: ${task.title}`));
    console.log(chalk.dim(`Project: ${task.project_name || 'Unknown'}`));
    console.log(chalk.dim('─'.repeat(60)));
    console.log('');
    
    // Parse and render blocks
    if (task.description && task.description.trim() !== '') {
      const blocks = descriptionToBlocks(task.description);
      
      if (blocks.length > 0) {
        const lines = renderBlocks(blocks);
        lines.forEach(line => console.log(line));
      } else {
        console.log(chalk.dim('(no content)'));
      }
    } else {
      console.log(chalk.dim('(no content)'));
    }
    
    console.log('');
    
  } catch (error) {
    console.error(chalk.red('❌ Error viewing task:'), error.message);
    process.exit(1);
  }
}

module.exports = viewCommand;

