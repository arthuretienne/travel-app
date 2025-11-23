# 📧 Email Invitation Debugging Guide

## Current Status

### ✅ Implemented
- Resend API integration in `backend/src/services/emailService.js`
- Comprehensive logging for all email operations
- Dev mode self-invitation enabled for testing
- Email template with HTML formatting

### 🔍 Current Configuration

**From .env:**
```bash
RESEND_API_KEY=re_C2FYVDta_HZ7q6xrB2EvK3RBxBZVRHyWe
EMAIL_FROM=Travel AI <onboarding@resend.dev>
FRONTEND_URL=http://localhost:5173
```

### ⚠️ Resend Sandbox Restrictions

**IMPORTANT:** Resend sandbox mode ONLY allows sending to verified email addresses.

- You can only send to: `aetiennea@gmail.com` (your verified email)
- All other emails will be rejected by Resend API
- To send to other emails, you need to:
  1. Add and verify a custom domain in Resend
  2. OR upgrade to production mode

## How to Test Email Invitations

### Step 1: Create a Group Trip
1. Navigate to http://localhost:5174
2. Login with Clerk
3. Go to Dashboard
4. Click "Create a New Trip"
5. Fill in the form and create a group trip

### Step 2: Send Self-Invitation (Dev Mode)
1. Open the trip you just created
2. Click "Invite Friends" button
3. Enter your email: `aetiennea@gmail.com`
4. Press Enter to add it
5. Click "Send Invitation"

**Expected behavior:**
- ✅ No error about self-invitation (dev mode allows it)
- ✅ Invitation sent successfully
- ✅ Check backend logs for detailed email information

### Step 3: Check Backend Logs

You should see logs like this in your terminal:

```
📧 ========== EMAIL SERVICE: SEND INVITATION ==========
📧 Recipient: aetiennea@gmail.com
📧 Trip Name: Weekend in Paris
📧 Inviter: Arthur Etienne
📧 Accept URL: http://localhost:5173/accept-invitation/abc123...
📧 RESEND_API_KEY is configured
📧 From Address: Travel AI <onboarding@resend.dev>
📧 Calling Resend API...
✅ Email sent successfully!
✅ Email ID: 01234567-89ab-cdef-0123-456789abcdef
📧 =====================================================
```

### Step 4: Check Your Email

1. Check inbox for `aetiennea@gmail.com`
2. Look for email from "Travel AI"
3. Subject should be: "🌍 You're invited to [Trip Name]!"

### If Email Doesn't Arrive

**Check these things:**

1. **Check Spam/Junk folder**
   - Sandbox emails often go to spam

2. **Verify Resend API Key**
   ```bash
   # In backend terminal
   echo $RESEND_API_KEY
   # Should show: re_C2FYVDta_HZ7q6xrB2EvK3RBxBZVRHyWe
   ```

3. **Check Backend Logs for Errors**
   ```
   ❌ Resend API Error: { ... }
   ```

4. **Verify Email Address**
   - Only `aetiennea@gmail.com` works in sandbox
   - Make sure it's typed correctly (no spaces)

5. **Check Resend Dashboard**
   - Login to https://resend.com
   - Go to "Emails" section
   - See if email was sent and delivery status

## Common Resend Errors

### Error: "Invalid recipient"
**Cause:** Trying to send to unverified email in sandbox mode
**Solution:** Only use `aetiennea@gmail.com` OR add a custom domain

### Error: "Invalid API key"
**Cause:** API key is wrong or not set
**Solution:** Check `.env` file has correct `RESEND_API_KEY`

### Error: "Domain not verified"
**Cause:** Using custom domain that's not verified
**Solution:** Use `onboarding@resend.dev` in sandbox OR verify your domain

## Backend Log Levels

The email service logs everything:

- 📧 **Email parameters** (recipient, trip name, inviter)
- 🔑 **Configuration status** (API key set, from address)
- 📤 **API call** (when Resend is called)
- ✅ **Success** (Email ID returned by Resend)
- ❌ **Errors** (Full error object from Resend)

## Moving to Production

To send emails to anyone (not just verified addresses):

### Option 1: Add Custom Domain (Recommended)
1. Buy a domain (e.g., `travel-ai.com`)
2. Add domain in Resend dashboard
3. Add DNS records (MX, TXT, DKIM)
4. Verify domain
5. Update `.env`:
   ```bash
   EMAIL_FROM=Travel AI <invitations@travel-ai.com>
   ```

### Option 2: Verify Individual Emails
1. Go to Resend dashboard
2. Add each email you want to send to
3. They receive verification email
4. Once verified, you can send to them

### Option 3: Upgrade Plan
- Some Resend plans remove sandbox restrictions
- Check pricing at https://resend.com/pricing

## Testing Checklist

- [ ] Backend running on port 3001
- [ ] Frontend running on port 5174
- [ ] Logged in with Clerk
- [ ] Created a group trip
- [ ] Opened trip detail page
- [ ] Clicked "Invite Friends"
- [ ] Added `aetiennea@gmail.com`
- [ ] Sent invitation (no errors)
- [ ] Checked backend logs (see ✅ success)
- [ ] Checked email inbox
- [ ] Found invitation email
- [ ] Clicked accept link
- [ ] Successfully joined trip

## Troubleshooting Commands

```bash
# Check backend logs for email-related output
cd /Users/arthur/Documents/travel-ai-mvp/backend
grep "EMAIL SERVICE" logs.txt

# Restart backend to reload .env
# Kill the process and run:
npm start

# Check if RESEND_API_KEY is loaded
# Add this temporarily to server.js:
console.log('RESEND_API_KEY:', process.env.RESEND_API_KEY ? 'SET' : 'NOT SET');
```

## Quick Reference

| Environment Variable | Current Value |
|---------------------|---------------|
| RESEND_API_KEY | `re_C2FYVDta_...` (SET) |
| EMAIL_FROM | `Travel AI <onboarding@resend.dev>` |
| FRONTEND_URL | `http://localhost:5173` |
| NODE_ENV | `development` |

| URL | Purpose |
|-----|---------|
| http://localhost:3001 | Backend API |
| http://localhost:5174 | Frontend (Vite) |
| https://resend.com/emails | Check sent emails |

## Next Steps

1. ✅ Test email flow with self-invitation
2. ✅ Verify logs show success
3. ✅ Check Resend dashboard for delivery
4. ⏳ If working: test with another verified email
5. ⏳ If not working: check errors in logs and Resend dashboard
6. 🎯 For production: add custom domain

---

**Remember:** In development, you can ONLY send to `aetiennea@gmail.com` unless you add a custom domain or verify more emails in Resend!
