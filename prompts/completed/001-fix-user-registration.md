# Fix User Registration in Local Development

<objective>
Diagnose and fix the user registration issue in local development environment. Users are currently unable to register at all. The goal is to restore full signup functionality for new users while preserving all other features unchanged.
</objective>

<context>
This is a SizeHub PWA built with Next.js 15 and Supabase. Registration works differently or successfully in production, but is completely broken in local development. The issue specifically affects new user signup - existing authentication and other features should remain untouched.

Project uses:
- Supabase for auth and database
- Server Actions for mutations
- RLS policies for access control
- Email-based authentication

Refer to CLAUDE.md for project conventions and architecture patterns.
</context>

<investigation>
Thoroughly investigate the issue by checking multiple potential root causes:

1. **Supabase Local Stack Status**
   - Run `!supabase status` to verify all services are running
   - Check if auth service is accessible
   - Verify database connection is working

2. **Authentication Configuration**
   - Run `!supabase settings get auth` or check `supabase/config.toml`
   - Verify email provider settings (local dev may use Inbucket or need SMTP)
   - Check if email confirmations are required and properly configured
   - Review auth.users table permissions and triggers

3. **Environment Variables**
   - Examine `.env.local` for completeness
   - Verify NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY match local stack
   - Compare with `.env.example` to ensure no missing variables
   - Check if service role key is needed for any operations

4. **Signup Code Flow**
   - Review @apps/web/src/app/actions.ts for signup-related Server Actions
   - Check signup form implementation
   - Examine Supabase client initialization in @apps/web/src/lib/supabase/
   - Look for any error handling or logging that might reveal the issue

5. **Database Schema & RLS**
   - Verify `profiles` table exists and has proper structure
   - Check RLS policies on profiles table (should allow INSERT for authenticated users)
   - Confirm triggers are working (e.g., profile creation trigger on auth.users)
   - Run `!supabase db reset --seed` if schema might be out of sync

6. **Logs & Error Messages**
   - Check browser console for client-side errors
   - Review Next.js dev server output
   - Check Supabase logs: `!supabase logs` or `!supabase logs auth`
   - Look for any 403, 401, or 500 errors in network requests

</investigation>

<diagnosis>
After gathering information from the investigation phase, carefully analyze:
- What is the exact point of failure in the signup flow?
- Is it a configuration issue, code bug, or environment problem?
- Why does it work in production but not locally?
- Are there any error messages or stack traces that pinpoint the cause?
</diagnosis>

<fix_implementation>
Based on your diagnosis, implement the minimal fix needed:

**Configuration Fixes:**
- Update `supabase/config.toml` if auth settings are incorrect
- Fix `.env.local` if environment variables are missing/wrong
- Adjust email provider settings for local development

**Code Fixes:**
- Fix Server Actions if there's a bug in signup logic
- Update Supabase client initialization if incorrectly configured
- Add missing error handling if silent failures are occurring

**Schema Fixes:**
- Apply missing migrations: `!supabase db reset --seed`
- Fix RLS policies if they're blocking user creation
- Repair triggers if profile creation isn't working

**Important Constraints:**
- Do NOT modify features unrelated to signup
- Do NOT change existing authentication for signed-in users
- Do NOT alter production configuration
- Keep changes minimal and focused on local development registration
</fix_implementation>

<verification>
Before declaring the issue resolved, verify the complete signup flow:

1. **Reset Test State**
   - Clear browser cache/cookies
   - Ensure you're testing with a fresh email address

2. **Test Registration Flow**
   - Navigate to signup page
   - Fill in registration form with test credentials
   - Submit and observe the full flow
   - Check for success message or redirect

3. **Verify Database**
   - Confirm user appears in auth.users: `!supabase db psql -c "SELECT email FROM auth.users ORDER BY created_at DESC LIMIT 5;"`
   - Verify profile was created: `!supabase db psql -c "SELECT owner_id, username FROM profiles ORDER BY created_at DESC LIMIT 5;"`

4. **Test Sign In**
   - If email confirmation is disabled, try signing in immediately
   - If email confirmation is enabled, check Inbucket (http://localhost:54324) for confirmation email
   - Verify successful authentication after signup

5. **Check Logs**
   - No errors in browser console
   - No errors in Next.js dev server
   - No auth errors in Supabase logs
</verification>

<success_criteria>
The fix is complete when:
- New users can successfully register through the signup form in local development
- User account is created in auth.users table
- User profile is created in profiles table
- User can sign in after registration (with or without email confirmation as configured)
- No errors appear in browser console, server logs, or Supabase logs
- All other application features remain unchanged and functional
</success_criteria>

<output>
Document your findings and fix:
- Create `./docs/registration-fix.md` with:
  - Root cause analysis
  - What was broken and why
  - What was changed to fix it
  - Steps to prevent similar issues
- Update any configuration files as needed
- Apply code changes to relevant files
</output>
