# SizeHub Documentation

This directory contains technical documentation and troubleshooting guides for the SizeHub application.

## 🔥 PRODUKCJA - Naprawa Rejestracji

### [SZYBKA_NAPRAWA.md](./SZYBKA_NAPRAWA.md) ⚡
**Szybki przewodnik naprawy rejestracji na gift.fit (5 minut)**

**START TUTAJ jeśli rejestracja nie działa na produkcji!**

- ✅ Krok po kroku w języku polskim
- ✅ Naprawa w 5 minut
- ✅ Checklisty do weryfikacji

---

### [FIX_PRODUCTION_REGISTRATION.md](./FIX_PRODUCTION_REGISTRATION.md) 📋
**Szczegółowy przewodnik naprawy rejestracji na produkcji**

Kompletny przewodnik po:
- Diagnozie problemu
- Konfiguracji Supabase Dashboard
- Konfiguracji Vercel environment variables
- Testowaniu i weryfikacji
- Troubleshooting

**Przeczytaj jeśli**: Szybka naprawa nie zadziałała lub potrzebujesz szczegółów technicznych.

---

## 📧 Email & SMTP Configuration

### [smtp-action-plan.md](./smtp-action-plan.md) ⚡
**Immediate action plan for fixing SMTP timeout issues**

**Read this if**: Registration confirmation emails fail with HTTP 504 timeout

Step-by-step guide covering:
- Verifying Supabase Dashboard SMTP configuration
- Testing SMTP connectivity
- Re-enabling email confirmations
- Alternative SMTP providers (SendGrid)
- Complete verification checklist

### [smtp-fix.md](./smtp-fix.md) 📋
**Detailed technical investigation of SMTP timeout issue**

Technical deep-dive useful for:
- Understanding the root cause analysis
- Learning about email delivery troubleshooting
- Reviewing SMTP test results
- Exploring alternative solutions

**Quick Test**:
```bash
pnpm test:smtp
```

This tests direct SMTP connection to diagnose timeout issues.

---

## 💻 Local Development

### [SETUP_SUPABASE_AUTH.md](./SETUP_SUPABASE_AUTH.md)
**Quick setup guide for enabling user registration in local development.**

Read this if you're setting up the project for the first time in local environment.

Topics covered:
- Environment variable configuration for local dev
- Adding localhost to Supabase allowed redirect URLs
- Testing registration flow locally
- Alternative: Setting up local Supabase stack
- Troubleshooting common auth issues

---

### [registration-fix.md](./registration-fix.md)
**Detailed technical analysis of the user registration issue (local dev focus)**

Technical deep-dive useful for:
- Understanding why registration was broken in local dev
- Learning about the authentication flow
- Understanding the relationship between environment variables and Supabase auth
- Preventing similar issues in the future

Topics covered:
- Root cause: Missing redirect URL configuration
- Detailed explanation of the registration flow
- Database triggers and automatic profile creation
- Prevention strategies
- Security considerations

---

## Quick Links

### For First-Time Setup
1. Read [SETUP_SUPABASE_AUTH.md](./SETUP_SUPABASE_AUTH.md)
2. Follow the step-by-step instructions
3. Test registration at http://localhost:3000

### If Registration Still Doesn't Work
1. Check [registration-fix.md](./registration-fix.md) for detailed troubleshooting
2. Review browser console for specific error messages
3. Verify environment variables: `cat .env.local`
4. Check Supabase Dashboard logs

### For Production Deployment
- See main [README.md](../README.md) for deployment instructions
- Ensure production redirect URLs are configured in Supabase
- Set `NEXT_PUBLIC_SITE_URL` to production domain

---

## Related Documentation

Additional project documentation can be found in the root directory:

- **[CLAUDE.md](../CLAUDE.md)** - AI agent development guidelines and project overview
- **[BUILD_PLAN.md](../BUILD_PLAN.md)** - Complete technical specification and MVP scope
- **[README.md](../README.md)** - Project setup and deployment guide
- **[UI.md](../UI.md)** - UI/UX specifications and design system
- **[SUPABASE_CHECKLIST.md](../SUPABASE_CHECKLIST.md)** - Supabase-specific setup tasks

---

## Contributing

When adding new documentation:

1. Create markdown files in this directory
2. Use clear, descriptive filenames
3. Update this README with a link to the new document
4. Include:
   - Problem summary
   - Step-by-step solutions
   - Code examples where applicable
   - Troubleshooting tips
   - Related links

---

## Support

If you encounter issues not covered by these documents:

1. Check existing issues in the repository
2. Review Supabase Dashboard logs
3. Enable verbose logging in development
4. Create a new issue with:
   - Clear problem description
   - Steps to reproduce
   - Error messages
   - Environment details (OS, Node version, etc.)

---

Last updated: November 2025
