# Supabase Authentication Setup for Local Development

## Quick Setup Guide

Follow these steps to enable user registration in local development.

### Step 1: Configure Environment Variables

Ensure your `.env.local` file contains:

```env
NEXT_PUBLIC_SUPABASE_URL=https://orrekemjkarsmazykemn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

✅ **Already configured** in your current `.env.local`

### Step 2: Add Localhost to Supabase Redirect URLs

**CRITICAL**: You must add localhost URLs to your production Supabase project's allowed redirect URLs.

#### Instructions:

1. **Open Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard
   - Select project: `orrekemjkarsmazykemn`

2. **Go to Authentication Settings**
   - Click **Authentication** in left sidebar
   - Click **URL Configuration**

3. **Add Redirect URLs**

   Find the **Redirect URLs** section and add these URLs:

   ```
   http://localhost:3000/**
   http://localhost:3000/auth/callback
   ```

   **Screenshot guide:**
   - Look for "Redirect URLs" or "Additional Redirect URLs" field
   - Enter each URL on a new line
   - Click "Save" or "Update"

4. **Verify Configuration**

   Your redirect URLs should now include:
   - ✅ `http://localhost:3000/**`
   - ✅ `http://localhost:3000/auth/callback`
   - ✅ `https://sizematic.vercel.app`
   - ✅ `https://www.gift.fit`
   - ✅ Other production URLs

### Step 3: Restart Development Server

```bash
# Stop current server (Ctrl+C)
# Start again
pnpm dev
```

### Step 4: Test Registration

1. Open browser to http://localhost:3000
2. Click "Register" button (top right or on landing page)
3. Fill in registration form:
   - **Display Name**: Test User (optional)
   - **Email**: your-test-email@example.com
   - **Password**: Test1234!@ (min 8 chars, uppercase, digit, special char)
   - **Confirm Password**: Test1234!@
4. Click "Submit"

### Expected Behavior

**Success**:
- No errors in browser console
- Success message appears: "Check your email to confirm your account"
- User created in `auth.users` table
- Profile automatically created in `public.profiles` table via trigger

**If you see errors**:
- Check browser console (F12 → Console tab)
- Common errors:
  - "Invalid redirect URL" → Localhost not added to Supabase (repeat Step 2)
  - "Email rate limit exceeded" → Wait a few minutes and try different email
  - "Password does not meet requirements" → Use stronger password

## Alternative: Local Supabase Stack

For a fully local development environment (recommended for teams):

### Prerequisites
- Docker Desktop installed and running

### Setup

```bash
# Start local Supabase stack
supabase start

# Wait for services to start (2-3 minutes first time)
# Get credentials
supabase status
```

### Update `.env.local`

Replace with local credentials from `supabase status`:

```env
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key-from-supabase-status>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key-from-supabase-status>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Benefits
- ✅ No need to modify production Supabase settings
- ✅ Faster development (no network latency)
- ✅ Safe testing of schema migrations
- ✅ Email testing via Inbucket: http://localhost:54324
- ✅ Supabase Studio UI: http://localhost:54323

### Email Confirmations (Local Supabase)

When using local Supabase:
1. User registers at http://localhost:3000
2. Confirmation email sent to Inbucket
3. Open Inbucket at http://localhost:54324
4. Click confirmation link in email
5. User redirected back to app and authenticated

## Troubleshooting

### Issue: "User already registered"
**Solution**: Use a different email address or delete test user from Supabase Dashboard → Authentication → Users

### Issue: "Invalid email redirect URL"
**Cause**: Localhost not in allowed redirect URLs
**Solution**: Repeat Step 2 above - add localhost URLs to Supabase Dashboard

### Issue: No confirmation email received
**Possible causes**:
1. Using production Supabase without proper email provider configured
2. Email went to spam folder
3. Rate limit exceeded

**Solutions**:
- Use local Supabase with Inbucket
- Check spam folder
- Wait 1-2 minutes between registration attempts
- Temporarily disable email confirmations in Supabase Dashboard (development only)

### Issue: Registration succeeds but can't sign in
**Cause**: Email confirmation required but not completed
**Solution**:
- Check email for confirmation link
- Or disable email confirmations in Supabase Dashboard → Authentication → Settings

### Issue: Profile not created
**Cause**: Database trigger might have failed
**Solution**:
1. Check Supabase logs in Dashboard
2. Verify trigger exists: `supabase db push` to ensure migrations applied
3. Manually create profile if needed (via Supabase Studio)

## Security Notes

### Is it safe to add localhost to production Supabase?

**Yes, with caveats**:
- ✅ Localhost URLs only work on developer's machine
- ✅ Not accessible from internet
- ✅ Common practice for development

**However, best practice**:
- 🎯 Use separate Supabase project for development
- 🎯 Or use local Supabase stack
- 🎯 Keep production clean with only production URLs

### Removing localhost URLs before production deploy

Not necessary! Having localhost in production Supabase doesn't affect security:
- Production app uses `NEXT_PUBLIC_SITE_URL=https://www.gift.fit`
- Localhost URLs ignored in production
- Can safely leave them for future local development

## Next Steps

After registration works:

1. ✅ Test complete auth flow:
   - Register → Confirm Email → Sign In → Access Dashboard

2. ✅ Test profile creation:
   - Check Supabase Dashboard → Table Editor → `profiles`
   - Verify profile exists with correct `owner_id`

3. ✅ Test protected routes:
   - Navigate to `/dashboard`
   - Should see user's dashboard, not redirect to login

4. ✅ Test measurements:
   - Add a body measurement
   - Verify it appears in dashboard
   - Check RLS policies working correctly

## Support

If registration still doesn't work after following this guide:

1. Check `docs/registration-fix.md` for detailed root cause analysis
2. Review browser console errors (F12 → Console)
3. Check Supabase Dashboard → Logs
4. Verify environment variables: `cat .env.local`

## Summary Checklist

- [ ] `.env.local` contains `NEXT_PUBLIC_SITE_URL=http://localhost:3000`
- [ ] Supabase Dashboard → Authentication → URL Configuration has `http://localhost:3000/**`
- [ ] Development server restarted: `pnpm dev`
- [ ] Tested registration with valid email/password
- [ ] No errors in browser console
- [ ] User can confirm email and sign in

Once all checks pass, registration is fully functional! 🎉
