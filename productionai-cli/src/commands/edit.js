const chalk = require('chalk');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const { getTaskById, updateTask } = require('../repositories/tasks');

async function editCommand(taskId, options) {
  try {
    const task = await getTaskById(parseInt(taskId));
    
    if (!task) {
      console.error(chalk.red(`❌ Task #${taskId} not found.`));
      process.exit(1);
    }
    
    // Determine editor
    const editor = process.env.EDITOR || process.env.VISUAL || (process.platform === 'win32' ? 'code' : 'nano');
    
    // Create temp file
    const tempFile = path.join(os.tmpdir(), `task-${taskId}.txt`);
    fs.writeFileSync(tempFile, task.description || '');
    
    console.log(chalk.dim(`Opening task #${taskId} in ${editor}...`));
    
    // Prepare editor command and args
    let editorCmd = editor;
    let editorArgs = [tempFile];
    
    // VS Code needs --wait flag to wait for file to be closed
    if (editor === 'code') {
      editorArgs = ['--wait', tempFile];
    }
    
    // On Windows with notepad, use synchronous spawn to wait for editor to close
    if (process.platform === 'win32' && editor === 'notepad') {
      const result = spawnSync('notepad.exe', [tempFile], {
        stdio: 'inherit',
        shell: false
      });
      
      if (result.status === 0 || result.status === null) {
        // Read the file back
        const newContent = fs.readFileSync(tempFile, 'utf-8');
        
        // Update task
        await updateTask(task.id, { description: newContent });
        
        console.log(chalk.green(`✅ Task #${taskId} updated.`));
        
        // Clean up
        fs.unlinkSync(tempFile);
      } else {
        console.error(chalk.red(`❌ Editor exited with code ${result.status}. Task not updated.`));
        fs.unlinkSync(tempFile);
        process.exit(1);
      }
    } else {
      // For other editors, use async spawn
      const child = spawn(editorCmd, editorArgs, {
        stdio: 'inherit',
        shell: true
      });
      
      child.on('exit', async (code) => {
        if (code === 0) {
          // Read the file back
          const newContent = fs.readFileSync(tempFile, 'utf-8');
          
          // Update task
          await updateTask(task.id, { description: newContent });
          
          console.log(chalk.green(`✅ Task #${taskId} updated.`));
          
          // Clean up
          fs.unlinkSync(tempFile);
        } else {
          console.error(chalk.red(`❌ Editor exited with code ${code}. Task not updated.`));
          fs.unlinkSync(tempFile);
          process.exit(1);
        }
      });
    }
    
  } catch (error) {
    console.error(chalk.red('❌ Error editing task:'), error.message);
    process.exit(1);
  }
}

module.exports = editCommand;

