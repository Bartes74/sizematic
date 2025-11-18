# SMTP Timeout Issue - Investigation and Resolution

## Issue Summary

**Problem**: HTTP 504 Gateway Timeout when Supabase Auth tried to send confirmation emails during user registration.

**Workaround Applied**: Email confirmations were disabled (`enable_confirmations = false`) to allow registrations to proceed.

**Goal**: Fix the underlying SMTP issue and re-enable email confirmations.

---

## Investigation Results

### Test Results (2025-11-17)

**SMTP Server**: smtp.zenbox.pl
**Port**: 587 (STARTTLS)
**User**: giftfit@darylosu.pl

Ran direct SMTP test from local machine using `tools/test-smtp.ts`:

```
✅ Connection verified in 299ms
✅ Email sent successfully in 512ms
✅ Total time: 814ms
```

**Conclusion**: The SMTP server is working perfectly and is very responsive (< 1 second). The issue is NOT with the SMTP server itself.

### Email Template Analysis

- **confirmation.html**: 3.1KB (very small, not an issue)
- **recovery.html**: 3.1KB (very small, not an issue)

Templates are well-optimized and cannot be causing timeouts.

---

## Root Cause Analysis

Since the SMTP server works fine from our local machine, the 504 timeout is likely caused by:

### 1. **Supabase Dashboard SMTP Configuration** (Most Likely)
   - **Issue**: Credentials might be entered incorrectly in the Supabase Dashboard
   - **Impact**: Auth service cannot authenticate with SMTP server
   - **Fix**: Verify and re-enter SMTP credentials exactly as shown below

### 2. **Network/Firewall Issues**
   - **Issue**: Supabase's infrastructure might not be able to reach smtp.zenbox.pl
   - **Impact**: Connection times out before reaching SMTP server
   - **Fix**: Contact Supabase support or switch to different SMTP provider

### 3. **Supabase Auth Timeout Too Low**
   - **Issue**: Default timeout might be too aggressive for external SMTP
   - **Impact**: Connection fails even if SMTP would respond
   - **Fix**: Contact Supabase support to check timeout settings

---

## Recommended Solutions

### Option 1: Verify Supabase Dashboard SMTP Settings ⭐ RECOMMENDED

**Action**: Double-check SMTP configuration in Supabase Dashboard

1. Go to: **Supabase Dashboard → Authentication → Email Templates → SMTP Settings**

2. Verify these EXACT values:
   ```
   Host:     smtp.zenbox.pl
   Port:     587
   User:     giftfit@darylosu.pl
   Password: Dunczyk1974!
   Sender:   giftfit@darylosu.pl
   ```

3. **Important**: Make sure there are NO extra spaces or characters

4. Click **"Send test email"** in the Dashboard
   - If successful → SMTP is configured correctly
   - If fails → credentials are wrong or network issue

5. If test email works, re-enable confirmations:
   ```toml
   # In supabase/config.toml (already set)
   [auth.email]
   enable_confirmations = true
   ```

6. Push config to remote:
   ```bash
   supabase db push
   ```

7. **Test full registration flow**:
   - Register with a real email you control
   - Verify confirmation email arrives
   - Click confirmation link
   - Confirm user can log in

---

### Option 2: Switch to Faster SMTP Provider (if Dashboard config fails)

If Option 1 doesn't work, switch to a more reliable SMTP provider:

#### **SendGrid** (Recommended for Production)

**Why**: Enterprise-grade, very fast, excellent deliverability, generous free tier

1. Sign up at [sendgrid.com](https://sendgrid.com)
   - Free tier: 100 emails/day (sufficient for MVP)

2. Create API key:
   - Dashboard → Settings → API Keys → Create API Key
   - Give it "Mail Send" permissions
   - Copy the API key (shown only once!)

3. Update Supabase SMTP settings:
   ```
   Host:     smtp.sendgrid.net
   Port:     587
   User:     apikey (literal string "apikey")
   Password: <your-sendgrid-api-key>
   Sender:   giftfit@darylosu.pl
   ```

4. **Verify sender domain** (important for deliverability):
   - SendGrid → Settings → Sender Authentication
   - Verify darylosu.pl domain
   - Add DNS records as instructed

5. Test and re-enable confirmations (same as Option 1, steps 4-7)

#### **Resend** (Modern Alternative)

**Why**: Developer-friendly, simple API, good free tier

1. Sign up at [resend.com](https://resend.com)
   - Free tier: 100 emails/day, 3,000/month

2. Get SMTP credentials from Resend dashboard

3. Update Supabase SMTP settings with Resend values

4. Test and re-enable confirmations

#### **AWS SES** (Enterprise Option)

**Why**: Extremely reliable, pay-as-you-go, best for scale

- More complex setup (requires AWS account, domain verification)
- Recommended only if scaling beyond 10,000 emails/month

---

### Option 3: Custom Email Solution (Last Resort)

If Supabase SMTP continues to fail, implement custom email sending:

1. **Disable Supabase email confirmations** (keep current state)

2. **Create Server Action for manual confirmation**:
   ```typescript
   // apps/web/src/app/actions.ts
   'use server'
   import nodemailer from 'nodemailer'

   export async function sendConfirmationEmail(email: string) {
     const transporter = nodemailer.createTransport({
       host: 'smtp.zenbox.pl',
       port: 587,
       auth: { user: '...', pass: '...' }
     })

     await transporter.sendMail({
       from: 'giftfit@darylosu.pl',
       to: email,
       subject: 'Potwierdź swoje konto w SizeHub',
       html: confirmationTemplate
     })
   }
   ```

3. **Call from signup flow**:
   ```typescript
   // After user signs up
   await sendConfirmationEmail(user.email)
   ```

**Pros**:
- Full control over email sending
- Can use verified SMTP server (smtp.zenbox.pl works great!)
- Can customize timeout, retry logic, etc.

**Cons**:
- More code to maintain
- Need to handle confirmation token generation manually
- Need to implement confirmation endpoint

---

## Current Status

✅ **SMTP server verified working** (smtp.zenbox.pl responds in < 1 second)
✅ **Email templates optimized** (3.1KB each)
✅ **Test script created** (`tools/test-smtp.ts`)
⏸️ **Email confirmations disabled** (temporary workaround)
🔄 **Next step**: Verify Supabase Dashboard SMTP configuration

---

## Testing Checklist

Before declaring the issue fixed:

- [ ] **SMTP test passes** (`pnpm tsx tools/test-smtp.ts`)
- [ ] **Supabase "Send test email" works** (in Dashboard)
- [ ] **Email confirmations re-enabled** (`enable_confirmations = true`)
- [ ] **Full registration flow tested**:
  - [ ] Register new user with real email
  - [ ] Confirmation email arrives within 1 minute
  - [ ] Email has correct branding (SizeHub)
  - [ ] Confirmation link works
  - [ ] User can log in after confirming
- [ ] **Database verification**:
  ```sql
  SELECT email, email_confirmed_at
  FROM auth.users
  ORDER BY created_at DESC
  LIMIT 5;
  ```
- [ ] **Supabase Auth Logs clean** (no SMTP errors)
- [ ] **Existing users unaffected** (can still log in)

---

## Files Created/Modified

### Created
- `/tools/test-smtp.ts` - SMTP connection test script
- `/docs/smtp-fix.md` - This document

### To Modify (when fixing)
- Supabase Dashboard → Auth Settings → SMTP Configuration
- Supabase Dashboard → Auth Settings → Email Confirmations

### Already Configured
- `/supabase/config.toml` - Already has `enable_confirmations = true` (local)
- `/supabase/templates/confirmation.html` - Email template (optimized)
- `/supabase/templates/recovery.html` - Password recovery template (optimized)

---

## Support Resources

- **Supabase SMTP Docs**: https://supabase.com/docs/guides/auth/auth-smtp
- **Supabase Support**: support@supabase.io
- **SendGrid Docs**: https://docs.sendgrid.com/
- **Resend Docs**: https://resend.com/docs

---

## Next Steps

1. **Verify Supabase Dashboard SMTP configuration** (Option 1)
2. If that fails, **switch to SendGrid** (Option 2)
3. **Re-enable email confirmations**
4. **Test thoroughly** using checklist above
5. **Monitor** Supabase Auth Logs for any issues
6. **Update this document** with final resolution

---

Last Updated: 2025-11-17
Status: Investigation Complete, Awaiting Dashboard Verification
