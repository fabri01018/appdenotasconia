# Quick Setup (No .env file needed!)

The easiest way to get Supabase sync working:

## Step 1: Get Your Credentials

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click **Settings** (⚙️) → **API**
4. Copy:
   - **Project URL** (looks like: `https://abcdefghijk.supabase.co`)
   - **anon public** key (long string starting with `eyJ...`)

## Step 2: Paste Credentials

Open `productionai-cli/src/lib/supabase.js` and find lines 7-8:

```javascript
const HARDCODED_URL = 'https://your-project.supabase.co';  // ← PASTE YOUR URL HERE
const HARDCODED_KEY = 'your-anon-key-here';                // ← PASTE YOUR KEY HERE
```

Replace with your actual values:

```javascript
const HARDCODED_URL = 'https://abcdefghijk.supabase.co';
const HARDCODED_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

## Step 3: Test It

```bash
prod sync
```

You should see:
```
✅ Supabase client initialized
🔄 Starting sync...
```

That's it! 🎉

---

**Note:** If you want better security later, use the `.env` file method described in ENV_SETUP.md. But for quick testing, hardcoding works fine.

