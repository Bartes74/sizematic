# Display Name Fix - November 17, 2025

## Problem

The user header was displaying the email prefix (e.g., "bartek" from "bartek@ideomat.pl") instead of the first name entered during registration (e.g., "Mirek"). This occurred because the registration flow wasn't properly saving the first name to the database.

## Root Cause Analysis

The issue had multiple components:

1. **Registration Form**: The form captured `displayName` and passed it to Supabase signup as user metadata with both `display_name` and `first_name` fields.

2. **Database Trigger**: The `handle_new_user()` trigger that creates profiles on signup only inserted `owner_id`, `email`, and `role` - it didn't extract `first_name` from user metadata.

3. **Dashboard Pages**: All dashboard pages were querying `display_name` instead of `first_name` and falling back to email prefix when null.

4. **Profile Edit**: The profile edit form was updating `display_name` instead of `first_name`.

## Solution Implemented

### 1. Updated Database Trigger (Migration `20251117000000_fix_first_name_in_handle_new_user.sql`)

Updated the `handle_new_user()` function to extract `first_name` from user metadata:

```sql
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (owner_id, email, role, first_name)
  values (
    new.id,
    new.email,
    'free',
    coalesce(new.raw_user_meta_data->>'first_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;
```

This ensures new registrations properly save `first_name` from user metadata, with a fallback to email prefix if not provided.

### 2. Backfilled Existing Users (Migration `20251117000001_backfill_first_name_from_display_name.sql`)

Populated `first_name` for existing users who registered before the fix:

```sql
update public.profiles
set first_name = coalesce(
  first_name,
  display_name,
  split_part(email, '@', 1)
)
where first_name is null;
```

This migration ensures existing users also have their `first_name` populated from `display_name` or email prefix.

### 3. Updated Dashboard Pages

Modified all dashboard pages to query and use `first_name` instead of `display_name`:

- `/Users/bartek/Developer/sizematic/src/app/dashboard/page.tsx`
- `/Users/bartek/Developer/sizematic/src/app/dashboard/sizes/page.tsx`
- `/Users/bartek/Developer/sizematic/src/app/dashboard/wishlists/page.tsx`
- `/Users/bartek/Developer/sizematic/src/app/dashboard/secret-giver/page.tsx`
- `/Users/bartek/Developer/sizematic/src/app/dashboard/garments/add/[category]/page.tsx`

Changed from:
```typescript
.select("id, display_name, role, ...")
// ...
userName = profile.display_name || userName;
```

To:
```typescript
.select("id, first_name, role, ...")
// ...
userName = profile.first_name || userName;
```

### 4. Updated Profile Edit Flow

Modified profile edit page and form to use `first_name`:

**Page** (`/Users/bartek/Developer/sizematic/src/app/dashboard/profile/edit/page.tsx`):
```typescript
.select('first_name, avatar_url, email, plan_type, role, allow_secret_giver')
// ...
displayName: profile?.first_name || '',
```

**Form** (`/Users/bartek/Developer/sizematic/src/components/profile-edit-form.tsx`):
```typescript
const updates: Record<string, unknown> = {
  first_name: displayName,
  avatar_url: newAvatarUrl,
};
```

## Testing

To verify the fix works:

1. **For New Users**:
   - Register with email: `test@example.com`
   - Enter first name: `Mirek`
   - After registration, header should show "Mirek", not "test"

2. **For Existing Users**:
   - Log in as existing user (e.g., bartek@ideomat.pl)
   - Header should show their first name from `display_name` or email prefix
   - Can update first name in profile edit page

3. **Database Verification**:
   ```sql
   SELECT email, first_name FROM profiles WHERE email = 'test@example.com';
   ```
   Should return `first_name = 'Mirek'`

## Impact

- **New registrations**: First name is now properly saved and displayed
- **Existing users**: First name backfilled from `display_name` or email prefix
- **Profile editing**: Updates `first_name` field correctly
- **No breaking changes**: All existing functionality preserved

## Future Considerations

- The `display_name` column is now deprecated in favor of `first_name`
- Consider adding a migration to drop `display_name` column after verifying all code uses `first_name`
- May want to add validation to ensure `first_name` is always populated during registration
- Consider adding a `last_name` field for full name support in the future

## Files Modified

### Migrations
- `/Users/bartek/Developer/sizematic/supabase/migrations/20251117000000_fix_first_name_in_handle_new_user.sql`
- `/Users/bartek/Developer/sizematic/supabase/migrations/20251117000001_backfill_first_name_from_display_name.sql`

### Dashboard Pages
- `/Users/bartek/Developer/sizematic/src/app/dashboard/page.tsx`
- `/Users/bartek/Developer/sizematic/src/app/dashboard/sizes/page.tsx`
- `/Users/bartek/Developer/sizematic/src/app/dashboard/wishlists/page.tsx`
- `/Users/bartek/Developer/sizematic/src/app/dashboard/secret-giver/page.tsx`
- `/Users/bartek/Developer/sizematic/src/app/dashboard/garments/add/[category]/page.tsx`

### Profile Pages
- `/Users/bartek/Developer/sizematic/src/app/dashboard/profile/edit/page.tsx`
- `/Users/bartek/Developer/sizematic/src/components/profile-edit-form.tsx`

## Registration Flow (After Fix)

```
User fills form with:
  - email: "bartek@ideomat.pl"
  - first_name: "Mirek"
  - password: "..."
                ↓
Registration form calls supabase.auth.signUp():
  {
    email: "bartek@ideomat.pl",
    password: "...",
    options: {
      data: {
        display_name: "Mirek",    // Legacy field
        first_name: "Mirek",      // NEW: Proper field
        has_completed_onboarding: false
      }
    }
  }
                ↓
Supabase creates user in auth.users table
                ↓
handle_new_user() trigger fires:
  - Extracts first_name from raw_user_meta_data
  - Inserts into profiles: (owner_id, email, role, first_name)
  - first_name = "Mirek" ✓
                ↓
Dashboard pages query profiles.first_name
                ↓
Header displays "Mirek" ✓
```

## Notes

- Registration form still sends both `display_name` and `first_name` in user metadata for backward compatibility
- The trigger now uses `first_name` from metadata, with fallback to email prefix
- All dashboard pages now consistently use `first_name` field
- Profile edit page updates `first_name` field
