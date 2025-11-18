# SMTP Fix - Action Plan

## Executive Summary

**Issue**: Registration confirmation emails fail with HTTP 504 Gateway Timeout
**Root Cause**: NOT the SMTP server (smtp.zenbox.pl works perfectly in < 1 second)
**Likely Cause**: Supabase Dashboard SMTP configuration error or network issue
**Status**: Ready for Dashboard configuration check

---

## What We Know

✅ **SMTP Server Works Perfectly**
- Direct test from local machine: **814ms total** (very fast!)
- Connection verified: 299ms
- Email sent: 512ms
- Server: smtp.zenbox.pl:587
- Credentials: giftfit@darylosu.pl / Dunczyk1974!

✅ **Email Templates Optimized**
- confirmation.html: 3.1KB (no timeout risk)
- recovery.html: 3.1KB (no timeout risk)

✅ **Local Configuration Correct**
- `supabase/config.toml` has `enable_confirmations = true`
- Email templates properly configured
- No issues with local setup

❌ **Production Issue**
- Supabase Dashboard SMTP settings may be incorrect
- OR: Network issue between Supabase infrastructure and smtp.zenbox.pl
- OR: Supabase Auth timeout too aggressive

---

## Immediate Action Required

### Step 1: Verify Supabase Dashboard SMTP Settings

**You need to do this manually in the Supabase Dashboard:**

1. Go to: https://supabase.com/dashboard/project/orrekemjkarsmazykemn
2. Navigate to: **Authentication → Email Templates → SMTP Settings**
3. Verify these EXACT values (no extra spaces!):

   ```
   SMTP Host:     smtp.zenbox.pl
   SMTP Port:     587
   SMTP Username: giftfit@darylosu.pl
   SMTP Password: Dunczyk1974!
   Sender Email:  giftfit@darylosu.pl
   Sender Name:   SizeHub (optional)
   ```

4. Click **"Save"**

5. Click **"Send Test Email"** button
   - Enter your email: giftfit@darylosu.pl
   - Click send
   - **Check inbox within 1 minute**

**Expected Result**: Test email arrives successfully

**If test email fails**:
- Check spam folder
- Verify credentials are exactly as shown above
- Try re-entering password (no copy-paste, type manually)
- Check Supabase Auth Logs for error details

---

### Step 2: Re-enable Email Confirmations

After test email succeeds:

1. In same Supabase Dashboard → **Authentication → Email Auth → Settings**

2. Find **"Confirm email"** toggle

3. **Enable it** ✅

4. **Save changes**

5. Wait 2-3 minutes for changes to propagate

---

### Step 3: Test Full Registration Flow

**Important**: Use a real email you can access for testing!

1. Open browser in **incognito/private mode**

2. Go to: https://www.gift.fit (or your production URL)

3. Click **"Sign Up"** / **"Zarejestruj się"**

4. Fill in form with:
   - Email: your-real-email@example.com (NOT giftfit@darylosu.pl)
   - Password: Test123!@#

5. Submit registration

6. **Check email inbox** (should arrive within 1 minute)

7. Click confirmation link in email

8. Verify you can log in

**If successful**: Issue is fixed! ✅

**If confirmation email doesn't arrive**:
- Check spam folder
- Check Supabase Auth Logs for errors
- Proceed to Step 4 (Alternative Solutions)

---

### Step 4: Alternative Solution (if Dashboard config fails)

If Supabase SMTP continues to fail, switch to **SendGrid**:

#### Why SendGrid?
- ✅ Enterprise-grade reliability
- ✅ Very fast (< 500ms typical)
- ✅ Excellent deliverability (99%+ inbox rate)
- ✅ Free tier: 100 emails/day (enough for MVP)
- ✅ Easy Supabase integration
- ✅ Detailed analytics and logs

#### Setup Instructions

**A. Create SendGrid Account**

1. Go to: https://sendgrid.com/pricing/ → **Free Plan**
2. Sign up with email/Google
3. Verify your account via email

**B. Create API Key**

1. Login to SendGrid Dashboard
2. Go to: **Settings → API Keys**
3. Click: **"Create API Key"**
4. Name: "SizeHub Production"
5. Permissions: **"Mail Send" → Full Access**
6. Click: **"Create & View"**
7. **COPY THE API KEY** (shown only once!)
   - Looks like: `SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
8. Save it securely (password manager)

**C. Update Supabase Dashboard**

1. Go to Supabase Dashboard → **Authentication → SMTP Settings**

2. Update to SendGrid values:
   ```
   SMTP Host:     smtp.sendgrid.net
   SMTP Port:     587
   SMTP Username: apikey
   SMTP Password: SG.xxxxxxxx... (your API key from step B7)
   Sender Email:  giftfit@darylosu.pl
   ```

3. **Important**: Username is literally the word `apikey` (not your email!)

4. Click **"Save"**

5. Click **"Send Test Email"**
   - Should arrive in seconds!

6. If test works, proceed to Step 2 (Re-enable Email Confirmations)

**D. Verify Sender Domain (Recommended for Production)**

For best deliverability:

1. SendGrid Dashboard → **Settings → Sender Authentication**
2. Click **"Verify a Single Sender"** (quick) OR
3. Click **"Authenticate Your Domain"** (better, requires DNS access to darylosu.pl)
4. Follow instructions to add DNS records
5. Wait for verification (24-48 hours)

---

## Verification Checklist

Before declaring issue fixed:

- [ ] Supabase Dashboard SMTP settings verified/updated
- [ ] Supabase "Send test email" successful
- [ ] Test email arrives in inbox < 1 minute
- [ ] Email confirmations re-enabled in Dashboard
- [ ] Full registration flow tested (incognito browser)
- [ ] Confirmation email arrives < 1 minute
- [ ] Confirmation link works
- [ ] New user can log in successfully
- [ ] Supabase Auth Logs show no errors
- [ ] Existing users still able to log in

---

## Monitoring & Maintenance

### After Re-enabling Confirmations

**Monitor for 24 hours**:

1. **Check Supabase Auth Logs daily**:
   - Dashboard → Logs → Auth Logs
   - Look for: `email`, `smtp`, `timeout`, `error`

2. **Test registration every few days**:
   - Use different test email addresses
   - Verify emails arrive promptly

3. **Monitor email deliverability**:
   - If using SendGrid: check Dashboard analytics
   - Watch for bounces, spam reports

### If Issues Recur

**Symptoms**: Emails stop arriving or timeout again

**Troubleshooting**:

1. Run SMTP test script:
   ```bash
   pnpm tsx tools/test-smtp.ts
   ```
   - If fails → SMTP server down
   - If succeeds → Issue is with Supabase

2. Check Supabase Status:
   - https://status.supabase.com
   - Look for Auth service issues

3. Check SMTP provider status:
   - smtp.zenbox.pl: Contact hosting provider
   - SendGrid: https://status.sendgrid.com

4. Contact Supabase Support:
   - Email: support@supabase.io
   - Include: Project ID, Auth Logs, timestamps

---

## Testing Resources

### SMTP Test Script

**Location**: `/tools/test-smtp.ts`

**Usage**:
```bash
pnpm tsx tools/test-smtp.ts
```

**What it does**:
- Tests direct connection to smtp.zenbox.pl
- Sends test email to giftfit@darylosu.pl
- Reports timing and success/failure

**Expected output**:
```
✅ Connection verified in 299ms
✅ Email sent successfully in 512ms
✅ Total time: 814ms
```

### Manual SMTP Test (alternative)

If Node.js script doesn't work:

```bash
# Test SMTP connection using telnet/openssl
openssl s_client -starttls smtp -connect smtp.zenbox.pl:587

# Then type:
EHLO localhost
AUTH LOGIN
# Base64 encode username: Z2lmdGZpdEBkYXJ5bG9zdS5wbA==
# Base64 encode password: RHVuY3p5azE5NzQh
MAIL FROM:<giftfit@darylosu.pl>
RCPT TO:<giftfit@darylosu.pl>
DATA
Subject: Test
From: giftfit@darylosu.pl
To: giftfit@darylosu.pl

Test message
.
QUIT
```

---

## Files Reference

### Created by Investigation

- `/tools/test-smtp.ts` - SMTP connection test script
- `/docs/smtp-fix.md` - Detailed investigation results
- `/docs/smtp-action-plan.md` - This document (action items)

### Existing Configuration

- `/supabase/config.toml` - Local Supabase config (email confirmations enabled)
- `/supabase/templates/confirmation.html` - Confirmation email template (3.1KB)
- `/supabase/templates/recovery.html` - Password recovery template (3.1KB)
- `/.env.local` - Environment variables (Supabase connection)

### Supabase Dashboard (manual configuration required)

- Authentication → Email Templates → SMTP Settings
- Authentication → Email Auth → Settings → Confirm email toggle

---

## Quick Reference

### SMTP Credentials (Current)

```
Host:     smtp.zenbox.pl
Port:     587 (STARTTLS)
User:     giftfit@darylosu.pl
Password: Dunczyk1974!
```

### SMTP Credentials (SendGrid Alternative)

```
Host:     smtp.sendgrid.net
Port:     587 (STARTTLS)
User:     apikey
Password: SG.xxxxxxxxxxxxxxx... (your API key)
```

### Supabase Project

```
Project ID:  orrekemjkarsmazykemn
Project URL: https://orrekemjkarsmazykemn.supabase.co
Dashboard:   https://supabase.com/dashboard/project/orrekemjkarsmazykemn
```

---

## Success Criteria

The issue is considered **FIXED** when:

✅ Supabase "Send test email" works (< 30 seconds)
✅ Email confirmations re-enabled in Dashboard
✅ New user registration sends confirmation email (< 1 minute)
✅ Confirmation link works correctly
✅ User can log in after confirming email
✅ No 504 timeout errors
✅ Supabase Auth Logs clean (no SMTP errors)
✅ Existing users unaffected

---

## Next Steps (You Need To Do)

1. **Access Supabase Dashboard** → Auth → SMTP Settings
2. **Verify/update SMTP credentials** (see Step 1 above)
3. **Send test email** from Dashboard
4. **Re-enable email confirmations** (see Step 2 above)
5. **Test full registration flow** (see Step 3 above)
6. **If fails, switch to SendGrid** (see Step 4 above)

---

Last Updated: 2025-11-17
Status: **Ready for Dashboard Configuration**
Next Action: **Verify Supabase Dashboard SMTP Settings**
