# Environment Setup for Supabase Sync

To enable sync functionality in the ProductionAI CLI, you need to configure your Supabase credentials.

## Step 1: Create .env file

In the `productionai-cli` directory, create a file named `.env`:

```bash
cd productionai-cli
touch .env  # or create manually on Windows
```

## Step 2: Add Your Credentials

Add the following to your `.env` file:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

## Step 3: Get Your Supabase Credentials

### From Supabase Dashboard:

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click on **Settings** (gear icon) in the left sidebar
4. Click on **API**
5. Copy the following:
   - **Project URL** → This is your `SUPABASE_URL`
   - **anon/public key** → This is your `SUPABASE_ANON_KEY`

### Example:

```env
SUPABASE_URL=https://abcdefghijklmnop.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYyMzA1MTIwMCwiZXhwIjoxOTM4NjI3MjAwfQ.1234567890abcdefghijklmnopqrstuvwxyz
```

## Step 4: Test Your Setup

Run the sync command to verify everything works:

```bash
prod sync
```

If configured correctly, you should see:
```
✅ Supabase client initialized

🔄 Starting sync...

📤 Pushing local changes to Supabase...
  ✅ Projects: 0 pushed
  ...

✨ Sync complete!
```

## Troubleshooting

### "Supabase not configured" error

- Make sure the `.env` file is in the `productionai-cli` directory
- Check that there are no typos in the variable names
- Ensure there are no spaces around the `=` sign
- Verify your credentials are correct

### "Connection failed" error

- Check your internet connection
- Verify your Supabase URL is correct
- Ensure your project is active on Supabase

### "Invalid API key" error

- Double-check you copied the **anon/public** key (not the service_role key)
- Make sure you didn't accidentally include quotes or extra characters

## Security Notes

- **Never commit your `.env` file to git!** It's already in `.gitignore`.
- The anon key is safe to use in client applications
- For production use, consider additional security measures

## Using with the Main App

The CLI and the main ProductionAI React Native app share the same database format and can sync to the same Supabase project. This means:

1. Add tasks in the CLI
2. Run `prod sync`
3. Open the mobile app
4. Changes appear automatically (and vice versa)

Perfect for a hybrid workflow! 🚀

