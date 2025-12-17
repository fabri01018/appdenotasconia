const chalk = require('chalk');
const { getTasksByProjectId, getTaskTags } = require('../repositories/tasks');
const { getProjectByName, getAllProjects } = require('../repositories/projects');
const { getSectionsByProjectId } = require('../repositories/sections');

async function tasksCommand(projectName, options) {
  try {
    // Find the project by name
    const project = await getProjectByName(projectName);
    
    if (!project) {
      console.error(chalk.red(`❌ Project "${projectName}" not found.`));
      console.log(chalk.dim('\nAvailable projects:'));
      
      const projects = await getAllProjects();
      if (projects.length === 0) {
        console.log(chalk.dim('  (no projects found)'));
      } else {
        for (const proj of projects) {
          console.log(chalk.cyan(`  • ${proj.name}`));
        }
      }
      
      process.exit(1);
    }
    
    // Get tasks and sections for this project
    const tasks = await getTasksByProjectId(project.id);
    const sections = await getSectionsByProjectId(project.id);
    
    // Get tags for all tasks to identify pinned ones
    const taskTagsMap = {};
    for (const task of tasks) {
      const tags = await getTaskTags(task.id);
      taskTagsMap[task.id] = tags;
    }
    
    // Helper to check if task is pinned
    const isPinned = (taskId) => {
      const tags = taskTagsMap[taskId] || [];
      return tags.some(tag => tag.name === 'Pinned');
    };
    
    if (options.json) {
      console.log(JSON.stringify({ project, sections, tasks }, null, 2));
      return;
    }
    
    // Pretty print
    if (tasks.length === 0) {
      console.log(chalk.dim(`\nNo tasks found in project "${project.name}".\n`));
      return;
    }
    
    const pinnedCount = tasks.filter(t => isPinned(t.id)).length;
    console.log(chalk.bold(`\n📁 ${project.name}`));
    console.log(chalk.dim(`   ${tasks.length} task${tasks.length !== 1 ? 's' : ''}, ${sections.length} section${sections.length !== 1 ? 's' : ''}${pinnedCount > 0 ? `, ${pinnedCount} pinned` : ''}\n`));
    
    // Helper function to render a task and its subtasks
    const renderTask = (task, isLast, showSectionName = false, depth = 0) => {
      const id = chalk.cyan(`#${task.id}`);
      const indent = '  '.repeat(depth);
      
      // Find section name if needed
      let sectionName = '';
      if (showSectionName && task.section_id) {
        const section = sections.find(s => s.id === task.section_id);
        if (section) {
          sectionName = chalk.dim(` from ${section.name}`);
        }
      }
      
      // Render parent task
      if (depth === 0) {
        // Root level task
        const prefix = isLast ? '└─' : '├─';
        const checkbox = task.completed ? chalk.green('✓') : '☐';
        const title = task.completed ? chalk.dim(chalk.strikethrough(task.title)) : chalk.bold(task.title);
        console.log(`${prefix}${chalk.dim('─')} ${checkbox} ${title}${sectionName} ${chalk.dim(`(${id})`)}`);
      } else {
        // Subtask
        console.log(chalk.dim(`${indent}│`));
        const checkbox = task.completed ? chalk.green('◉') : '◦';
        const title = task.completed ? chalk.dim(chalk.strikethrough(task.title)) : task.title;
        console.log(`${indent}├─ ${chalk.dim(checkbox)} ${title}${sectionName} ${chalk.dim(`(${id})`)}`);
      }
      
      // Render subtasks
      const subtasks = subtasksByParent[task.id] || [];
      if (subtasks.length > 0) {
        subtasks.forEach((subtask, idx) => {
          renderTask(subtask, false, showSectionName, depth + 1);
        });
      }
      
      // Add divider after root task (except last one)
      if (depth === 0 && !isLast) {
        console.log(chalk.dim('│'));
      }
    };
    
    // Separate root tasks from subtasks
    const rootTasks = tasks.filter(t => !t.parent_id);
    const subtasksByParent = {};
    
    // Group subtasks by parent_id
    tasks.filter(t => t.parent_id).forEach(subtask => {
      if (!subtasksByParent[subtask.parent_id]) {
        subtasksByParent[subtask.parent_id] = [];
      }
      subtasksByParent[subtask.parent_id].push(subtask);
    });
    
    // Sort subtasks: incomplete first, then by ID
    Object.values(subtasksByParent).forEach(subtasks => {
      subtasks.sort((a, b) => {
        if (a.completed !== b.completed) return a.completed - b.completed;
        return a.id - b.id;
      });
    });
    
    // Group tasks by section and pinned status (only root tasks)
    const pinnedTasks = [];
    const tasksBySection = new Map();
    
    // Initialize with all sections
    for (const section of sections) {
      tasksBySection.set(section.id, { section, pinned: [], unpinned: [] });
    }
    
    // Add a null section for tasks without a section
    tasksBySection.set(null, { section: { id: null, name: 'No Section' }, pinned: [], unpinned: [] });
    
    // Distribute root tasks to sections and collect pinned tasks
    for (const task of rootTasks) {
      const sectionId = task.section_id;
      const pinned = isPinned(task.id);
      
      // Add to pinned list (for dedicated pinned section)
      if (pinned) {
        pinnedTasks.push(task);
      }
      
      // Also add to section (pinned tasks appear in both places)
      if (tasksBySection.has(sectionId)) {
        if (pinned) {
          tasksBySection.get(sectionId).pinned.push(task);
        } else {
          tasksBySection.get(sectionId).unpinned.push(task);
        }
      } else {
        // If section doesn't exist, put in null section
        if (pinned) {
          tasksBySection.get(null).pinned.push(task);
        } else {
          tasksBySection.get(null).unpinned.push(task);
        }
      }
    }
    
    // Display pinned section first (if any pinned tasks)
    let isFirstSection = true;
    if (pinnedTasks.length > 0) {
      const incompleteTasks = pinnedTasks.filter(t => !t.completed);
      const completedTasks = pinnedTasks.filter(t => t.completed);
      const completionRate = pinnedTasks.length > 0 
        ? Math.round((completedTasks.length / pinnedTasks.length) * 100) 
        : 0;
      
      // Top divider
      console.log(chalk.dim('╔' + '═'.repeat(58) + '╗'));
      
      // Section name and stats
      const headerText = `📌  Pinned`;
      const statsText = `${completedTasks.length}/${pinnedTasks.length} (${completionRate}%)`;
      const padding = 58 - headerText.length - statsText.length;
      console.log(chalk.dim('║ ') + chalk.bold.yellow(headerText) + ' '.repeat(padding) + chalk.dim(statsText + ' ║'));
      
      // Bottom divider
      console.log(chalk.dim('╚' + '═'.repeat(58) + '╝'));
      console.log('');
      
      // Show all pinned tasks (incomplete first, then completed)
      const allPinnedSorted = [...incompleteTasks, ...completedTasks];
      allPinnedSorted.forEach((task, i) => {
        const isLast = i === allPinnedSorted.length - 1;
        renderTask(task, isLast, true); // Show section name for pinned tasks
      });
      
      isFirstSection = false;
    }
    
    // Display sections with tasks
    for (const [sectionId, { section, pinned, unpinned }] of tasksBySection) {
      const sectionTasks = [...pinned, ...unpinned];
      if (sectionTasks.length === 0) continue; // Skip empty sections
      
      // Add spacing between sections (but not before the first one)
      if (!isFirstSection) {
        console.log('');
      }
      isFirstSection = false;
      
      // Section header with divider
      const sectionName = section.name || 'No Section';
      const sectionIcon = sectionId === null ? '📋' : '📑';
      const incompleteTasks = sectionTasks.filter(t => !t.completed);
      const completedTasks = sectionTasks.filter(t => t.completed);
      const completionRate = sectionTasks.length > 0 
        ? Math.round((completedTasks.length / sectionTasks.length) * 100) 
        : 0;
      
      // Top divider
      console.log(chalk.dim('╔' + '═'.repeat(58) + '╗'));
      
      // Section name and stats
      const headerText = `${sectionIcon}  ${sectionName}`;
      const statsText = `${completedTasks.length}/${sectionTasks.length} (${completionRate}%)`;
      const padding = 58 - headerText.length - statsText.length;
      console.log(chalk.dim('║ ') + chalk.bold.magenta(headerText) + ' '.repeat(padding) + chalk.dim(statsText + ' ║'));
      
      // Bottom divider
      console.log(chalk.dim('╚' + '═'.repeat(58) + '╝'));
      console.log('');
      
      // Show all section tasks (incomplete first, then completed)
      const allSectionSorted = [...incompleteTasks, ...completedTasks];
      allSectionSorted.forEach((task, i) => {
        const isLast = i === allSectionSorted.length - 1;
        renderTask(task, isLast, false); // Don't show section name within sections
      });
    }
    
    console.log(''); // Final spacing
    
  } catch (error) {
    console.error(chalk.red('❌ Error listing tasks:'), error.message);
    process.exit(1);
  }
}

module.exports = tasksCommand;

