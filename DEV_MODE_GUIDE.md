# Development Mode Guide

## 🚀 Enable Unlimited Testing

Dev Mode bypasses all usage limits so you can test AI features without restrictions.

---

## Quick Setup

### For Railway (Production Testing)

1. Go to Railway Dashboard
2. Select your project → backend service
3. Go to "Variables" tab
4. Add new variable:
   ```
   Name: DEV_MODE
   Value: true
   ```
5. Railway will auto-redeploy
6. You now have unlimited searches! 🎉

### For Local Development

Add to `backend/.env`:
```bash
DEV_MODE=true
```

Or it works automatically if you have:
```bash
NODE_ENV=development
```

---

## What Gets Bypassed?

When `DEV_MODE=true`:

✅ **Unlimited AI searches** - No monthly limit
✅ **No usage tracking** - Counters don't increment
✅ **All subscription features** - Full access to everything
✅ **Clear console logs** - See when dev mode is active

---

## Console Output

When dev mode is active, you'll see:
```
🚀 DEV MODE: Bypassing usage limits for testing
🚀 DEV MODE: Skipping usage increment for testing
```

---

## How It Works

The middleware checks for dev mode FIRST:
```javascript
const DEV_MODE = process.env.DEV_MODE === 'true' ||
                 process.env.NODE_ENV === 'development';

if (DEV_MODE) {
  console.log('🚀 DEV MODE: Bypassing usage limits for testing');
  return next(); // Skip all limit checks
}
```

---

## Production Safety

✅ Requires explicit `DEV_MODE=true` flag
✅ Won't activate by accident
✅ Clear logging when active
✅ Easy to disable (just remove the variable)

---

## When to Use

**Enable dev mode when:**
- Testing AI recommendations
- Developing new features
- Demonstrating the app
- Running end-to-end tests
- Debugging travel searches

**Disable dev mode for:**
- Production deployment
- Real user testing
- Billing/subscription testing
- Usage analytics testing

---

## Disable Dev Mode

Simply remove the `DEV_MODE` variable from Railway or your `.env` file.

Railway will auto-redeploy and limits will be enforced again.

---

## Current Limits (when NOT in dev mode)

- **Free Plan:** 3 searches/month
- **Explorer Plan:** 20 searches/month
- **Wanderer Plan:** Unlimited searches

---

## Testing Subscription Features

If you want to test subscription features but KEEP usage limits:
1. Don't use DEV_MODE
2. Manually upgrade your plan in the database
3. Or test with Stripe test mode

---

## Troubleshooting

**Dev mode not working?**
1. Check Railway logs for the `🚀 DEV_MODE` message
2. Verify the variable is set to string `"true"` (not boolean)
3. Make sure Railway has redeployed after adding the variable

**Still seeing 403 errors?**
- Clear your browser cache
- Hard refresh (Cmd+Shift+R / Ctrl+Shift+R)
- Check Railway deployment is complete
- Verify the variable is in the correct service (backend)

---

## Quick Test

After enabling dev mode:
1. Go to your app
2. Try creating multiple trips
3. Do 10+ AI searches
4. No 403 errors = dev mode is working! ✅

---

**Note:** Remember to disable dev mode before launching to real users!
