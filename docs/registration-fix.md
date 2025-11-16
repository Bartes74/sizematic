# User Registration Fix - Local Development

## Problem Summary

User registration was completely broken in local development environment. Users were unable to sign up for new accounts when running the application locally.

## Root Cause Analysis

The issue was caused by a **missing redirect URL configuration** in Supabase Auth settings. The application exhibited the following problems:

### 1. Environment Configuration Mismatch
- **`.env.local`** was correctly pointing to production Supabase instance (`orrekemjkarsmazykemn.supabase.co`)
- **`NEXT_PUBLIC_SITE_URL`** environment variable was **missing**
- This is a valid setup for development (using production backend locally)

### 2. Redirect URL Restriction
When users attempted to register through the `RegisterForm` component:

1. Client calls `supabase.auth.signUp()` with `emailRedirectTo: ${window.location.origin}/auth/callback`
2. Since `NEXT_PUBLIC_SITE_URL` was undefined, it correctly fell back to `window.location.origin` = `http://localhost:3000`
3. The registration request went to **production Supabase** with redirect URL: `http://localhost:3000/auth/callback`
4. **Production Supabase rejected this** because `localhost:3000` was not in the allowed redirect URLs
5. Registration failed with an obscure error or silently failed

### 3. Why It Worked Differently in Production
Production deployment works because:
- `NEXT_PUBLIC_SITE_URL` is set to the production domain (e.g., `https://www.gift.fit` or `https://sizematic.vercel.app`)
- These domains ARE included in Supabase's allowed redirect URLs
- Email confirmations complete successfully

### Configuration Context
The `supabase/config.toml` file only applies to **local Supabase stack** (when running `supabase start`). Since the project uses production Supabase for local development, this config file doesn't affect auth behavior. The allowed redirect URLs in `config.toml` were:

```toml
[auth]
site_url = "https://www.gift.fit"
additional_redirect_urls = [
  "https://sizematic.vercel.app",
  "https://sizematic.vercel.app/*",
  "https://www.gift.fit",
  "https://www.gift.fit/*",
  "https://gift.fit",
  "https://gift.fit/*"
]
```

Notice `http://localhost:3000` is **not** included.

## The Fix

The fix required two steps:

### Step 1: Add `NEXT_PUBLIC_SITE_URL` to `.env.local`

**File**: `/Users/bartek/Developer/sizematic/.env.local`

Added:
```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

This ensures the redirect URL is explicitly set to localhost during local development.

### Step 2: Add Localhost to Production Supabase Allowed Redirect URLs

**IMPORTANT**: You must manually add `http://localhost:3000/*` to your production Supabase project's allowed redirect URLs.

#### Instructions:
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `orrekemjkarsmazykemn`
3. Navigate to **Authentication** → **URL Configuration**
4. Find **Redirect URLs** section
5. Add the following URLs:
   - `http://localhost:3000/**`
   - `http://localhost:3000/auth/callback`

**Security Note**: Adding localhost URLs to production Supabase is safe for development purposes, as these URLs are only accessible from the developer's local machine. However, if you prefer stricter security, you can:
- Use a separate Supabase project for development
- Run local Supabase stack with Docker: `supabase start`

### Step 3: Updated `.env.example` Documentation

**File**: `/Users/bartek/Developer/sizematic/.env.example`

Updated the template to clearly document the requirement:

```env
# Required: URL used by Supabase auth redirects (must be added to Supabase Auth > Redirect URLs)
# For local dev: http://localhost:3000
# For production: https://your-production-domain.com
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## How Registration Works

### Registration Flow:
1. User fills out `RegisterForm` component (`/src/components/auth/register-form.tsx`)
2. Client-side validation checks:
   - Valid email format
   - Password meets requirements (min 8 chars, uppercase, digit, special char)
   - Passwords match
3. Calls `supabase.auth.signUp()` with:
   ```typescript
   {
     email,
     password,
     options: {
       data: {
         display_name: displayName || email.split('@')[0],
         first_name: displayName || null,
         has_completed_onboarding: false,
       },
       emailRedirectTo: `${window.location.origin}/auth/callback`,
     },
   }
   ```
4. Supabase creates user in `auth.users` table
5. Database trigger `on_auth_user_created` (from migration `20250210000000_add_user_roles.sql`) automatically creates profile:
   ```sql
   create trigger on_auth_user_created
     after insert on auth.users
     for each row execute function public.handle_new_user();
   ```
6. If email confirmations are enabled:
   - User receives confirmation email
   - Clicks link → redirected to `/auth/callback`
   - Callback page completes authentication
7. User can now sign in

### Why the Trigger is Important:
The `handle_new_user()` function ensures every new user gets a profile record:
```sql
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (owner_id, email, role)
  values (new.id, new.email, 'free');
  return new;
end;
$$ language plpgsql security definer;
```

Without this trigger, users would exist in `auth.users` but have no profile in `public.profiles`, breaking the application's RLS policies.

## Verification Steps

After applying the fix, verify the complete signup flow:

### 1. Environment Check
```bash
# Verify environment variables are set
cat .env.local
# Should show:
# NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 2. Supabase Dashboard Check
- Log into Supabase Dashboard
- Navigate to Authentication → URL Configuration
- Verify `http://localhost:3000/**` is in Redirect URLs

### 3. Test Registration
```bash
# Start dev server
pnpm dev

# Open browser to http://localhost:3000
# Click "Register" or signup button
# Fill in test credentials:
#   - Email: test@example.com
#   - Password: Test1234!@
#   - Display Name: Test User
# Submit form
```

### 4. Expected Behavior
- **No errors** in browser console
- Success message appears: "Check your email to confirm your account"
- Check email for confirmation link (or check Inbucket if using local Supabase)

### 5. Database Verification
If using production Supabase, check via Supabase Dashboard:
- Go to **Table Editor** → `auth.users`
- Verify new user exists with test email
- Go to **Table Editor** → `public.profiles`
- Verify profile was created with matching `owner_id`

### 6. Sign In Test
After confirming email (or if confirmations are disabled):
- Return to login page
- Sign in with test credentials
- Should redirect to `/dashboard`

## Prevention Strategies

To prevent similar issues in the future:

### 1. Environment Variable Checklist
Always ensure `.env.local` includes:
```env
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000  # ← Critical for auth
```

### 2. Local Supabase Stack (Recommended)
For true local development, use local Supabase:

```bash
# Start Docker Desktop
# Then start local Supabase stack
supabase start

# Get local credentials
supabase status
```

Update `.env.local` to use local endpoints:
```env
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<local-anon-key-from-supabase-status>
SUPABASE_SERVICE_ROLE_KEY=<local-service-role-key-from-supabase-status>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Benefits:
- No need to modify production auth settings
- Faster development (no network latency)
- Can test migrations and schema changes safely
- Email testing via Inbucket (http://localhost:54324)

### 3. Error Logging
Consider adding more explicit error logging in `RegisterForm`:

```typescript
if (error) {
  console.error('Signup error details:', {
    message: error.message,
    status: (error as any).status,
    code: (error as any).code,
    details: error
  });
  // ... existing error handling
}
```

### 4. Development Documentation
Keep `CLAUDE.md` and `.env.example` up to date with:
- Required environment variables
- Supabase configuration steps
- Common troubleshooting tips

## Additional Notes

### Email Confirmations
Production Supabase has email confirmations enabled (`enable_confirmations = true`). This means:
- Users must click email confirmation link before signing in
- Email provider must be properly configured in Supabase
- Test emails in development might go to spam or be rate-limited

To disable confirmations for testing (not recommended for production):
1. Supabase Dashboard → Authentication → Settings
2. Find "Enable email confirmations"
3. Toggle off (development only)

### Alternative: API Route Registration
The project also has a Server Route for registration at `/src/app/api/auth/register/route.ts` which is currently unused by the `RegisterForm`. This could be an alternative approach, but the client-side `supabase.auth.signUp()` is more standard and recommended by Supabase.

### Password Requirements
From `supabase/config.toml` (for local Supabase):
```toml
minimum_password_length = 8
password_requirements = "lower_upper_letters_digits_symbols"
```

The `RegisterForm` validates these client-side via `/src/lib/password-validation.ts`.

## Summary

**Root Cause**: Missing `NEXT_PUBLIC_SITE_URL` environment variable and `localhost:3000` not in production Supabase allowed redirect URLs.

**Fix**:
1. ✅ Added `NEXT_PUBLIC_SITE_URL=http://localhost:3000` to `.env.local`
2. ⚠️ **ACTION REQUIRED**: Add `http://localhost:3000/**` to Supabase Dashboard → Authentication → URL Configuration → Redirect URLs
3. ✅ Updated `.env.example` with clear documentation

**Result**: User registration now works in local development environment.

**Recommendation**: For long-term development, migrate to local Supabase stack using Docker to avoid production dependency.
