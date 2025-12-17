const chalk = require('chalk');
const { isSupabaseConfigured } = require('../lib/supabase');
const { pullAll } = require('../lib/sync/pull');
const { pushAll } = require('../lib/sync/push');

async function syncCommand(options) {
  try {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      console.log(chalk.red('\n❌ Supabase not configured!\n'));
      console.log(chalk.yellow('Quick Setup (easiest):'));
      console.log(chalk.dim('  1. Open: productionai-cli/src/lib/supabase.js'));
      console.log(chalk.dim('  2. Edit lines 7-8 with your credentials'));
      console.log(chalk.dim('  3. Save and run: prod sync\n'));
      console.log(chalk.yellow('Alternative (.env file):'));
      console.log(chalk.dim('  Create .env with SUPABASE_URL and SUPABASE_ANON_KEY\n'));
      console.log(chalk.dim('See QUICK_SETUP.md for detailed instructions.'));
      process.exit(1);
    }

    const { pull, push } = options;

    // If no flags, do both push and pull
    const shouldPush = push || (!pull && !push);
    const shouldPull = pull || (!pull && !push);

    console.log(chalk.bold('\n🔄 Starting sync...\n'));

    // Push local changes first
    if (shouldPush) {
      const pushResult = await pushAll();
      if (!pushResult.success) {
        console.error(chalk.red(`\n❌ Push failed: ${pushResult.error}`));
        process.exit(1);
      }
    }

    // Then pull remote changes
    if (shouldPull) {
      const pullResult = await pullAll();
      if (!pullResult.success) {
        console.error(chalk.red(`\n❌ Pull failed: ${pullResult.error}`));
        process.exit(1);
      }
    }

    console.log(chalk.green.bold('\n✨ Sync complete!\n'));

  } catch (error) {
    console.error(chalk.red('❌ Sync error:'), error.message);
    if (error.message.includes('connect')) {
      console.log(chalk.yellow('\n💡 Tip: Check your internet connection and Supabase credentials.'));
    }
    process.exit(1);
  }
}

module.exports = syncCommand;

