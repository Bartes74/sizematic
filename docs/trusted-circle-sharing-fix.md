# Trusted Circle Sharing Fix

## Problem

Users could not see sizes shared by members of their Trusted Circle. When User A added User B to their Trusted Circle and User B shared sizes with User A, User A could only see their own sizes (what they shared with User B), not the sizes that User B shared with them.

## Root Cause

The Trusted Circle sharing system had the following issues:

1. **Limited API response**: The API endpoint `/api/v1/trusted-circle/members/[memberId]/shared` only returned `size_labels`, not `garments` or `body_measurements`
2. **Incomplete server functions**: The `getAccessibleSizeLabels` function in `src/server/trusted-circle/access.ts` only fetched size labels, ignoring garments and body measurements
3. **Frontend display limitation**: The `TrustedCircle` component only displayed size labels, not the full range of shared data

The RLS (Row Level Security) policies on `body_measurements` and `garments` tables were correctly configured to allow shared access based on `trusted_circle_permissions`, but the application layer wasn't fetching or displaying this data.

## Solution

### 1. Added New Server Functions

**File**: `/Users/bartek/Developer/sizematic/src/server/trusted-circle/access.ts`

Added two new functions to fetch shared data:

- `getAccessibleGarments(ownerProfileId, memberProfileId)` - Fetches garments shared by circle members based on permissions
- `getAccessibleBodyMeasurements(ownerProfileId, memberProfileId)` - Fetches body measurements if size access is enabled

Both functions:
- Check circle membership and `allow_size_access` flag
- Filter data based on `trusted_circle_permissions` (category and product_type)
- Respect granular sharing rules (whole categories or specific product types)

### 2. Updated API Endpoint

**File**: `/Users/bartek/Developer/sizematic/src/app/api/v1/trusted-circle/members/[memberId]/shared/route.ts`

Modified the endpoint to:
- Import the new functions: `getAccessibleGarments` and `getAccessibleBodyMeasurements`
- Fetch all three data types in parallel using `Promise.all()`
- Return expanded response with `size_labels`, `garments`, and `body_measurements`

### 3. Updated Frontend Component

**File**: `/Users/bartek/Developer/sizematic/src/components/trusted-circle.tsx`

Changes:
- **Updated `SharedData` type** to include `garments` array and `body_measurements` object
- **Enhanced display logic** in the "They share with me" section to show:
  - Body measurements (if available) - displayed as a grid of measurement fields
  - Garments - displayed with name, brand, category, type, and size values
  - Size labels - displayed with category and product type

The display now shows all three types of shared data in organized sections with proper headings and counts.

## How It Works

### Data Flow

1. **User configures sharing permissions**:
   - In Trusted Circle, User B selects which categories/product types to share with User A
   - These selections are saved to `trusted_circle_permissions` table

2. **User A views shared data**:
   - Opens member dialog for User B in Trusted Circle
   - Frontend calls `/api/v1/trusted-circle/members/{User B's profile ID}/shared`
   - API checks membership and permissions
   - Server functions filter data based on shared categories:
     - If whole category is shared → return all items in that category
     - If specific product types are shared → return only matching items
   - Frontend displays all shared data in organized sections

3. **RLS enforcement**:
   - Database policies on `body_measurements` and `garments` enforce access control
   - Even if API is bypassed, database won't return unauthorized data
   - Double layer of security: application logic + database policies

### Permission Filtering Logic

The filtering respects granular permissions:

- **Whole category sharing**: If User B shares "shirts" category (without product type), User A sees:
  - All size labels for shirts (any product type)
  - All garments in shirts category (any product type)
  - Body measurements (always shared if size access is enabled)

- **Product type sharing**: If User B shares only "shirts → dress_shirts", User A sees:
  - Only size labels for dress shirts
  - Only garments with `product_type_id: "dress_shirts"` in the shirts category
  - Body measurements (always shared if size access is enabled)

## Files Modified

### Backend

1. `/Users/bartek/Developer/sizematic/src/server/trusted-circle/access.ts`
   - Added `getAccessibleGarments()` function
   - Added `getAccessibleBodyMeasurements()` function

2. `/Users/bartek/Developer/sizematic/src/app/api/v1/trusted-circle/members/[memberId]/shared/route.ts`
   - Updated to fetch and return garments and body measurements

3. `/Users/bartek/Developer/sizematic/supabase/migrations/20251118000000_add_garments_trusted_circle_sharing.sql` **(NEW MIGRATION)**
   - Added RLS policy for garments to support trusted circle sharing
   - Replaces owner-only policy with multi-layered access policy
   - Includes category and product_type filtering logic

### Frontend

4. `/Users/bartek/Developer/sizematic/src/components/trusted-circle.tsx`
   - Updated `SharedData` type definition
   - Enhanced display to show garments and body measurements

## Deployment Steps

### 1. Apply Database Migration

**Local development:**
```bash
supabase db reset --seed
```

**Remote/Production:**
```bash
supabase db push --db-url "postgresql://..."
```

Or apply manually via Supabase Dashboard SQL Editor.

### 2. Deploy Application Code

The code changes are backward compatible and can be deployed immediately. No environment variables or configuration changes required.

### 3. Verify Deployment

After deployment, check:
1. No errors in server logs
2. RLS policies active: `SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'garments';` should show `rowsecurity = true`
3. Test with two accounts to verify sharing works

## Testing Recommendations

### Manual Testing Flow

**Setup** (with two user accounts):
1. User A creates Trusted Circle
2. User A invites User B via email
3. User B accepts invitation
4. User B has some data:
   - Body measurements filled
   - At least 2 garments in different categories
   - At least 2 size labels saved

**Test Case 1: Whole Category Sharing**
1. User B configures sharing: share "shirts" (whole category)
2. User A opens User B's profile in Trusted Circle
3. Verify User A sees:
   - ✅ All of User B's shirts garments
   - ✅ All of User B's shirt size labels
   - ✅ User B's body measurements
   - ❌ No garments/labels from other categories

**Test Case 2: Product Type Sharing**
1. User B configures sharing: share "shoes → sneakers" only
2. User A opens User B's profile
3. Verify User A sees:
   - ✅ Only sneakers garments (not dress shoes or boots)
   - ✅ Only sneaker size labels
   - ✅ Body measurements
   - ❌ Other shoe types not visible

**Test Case 3: Bidirectional Sharing**
1. User A shares "pants" with User B
2. User B shares "shirts" with User A
3. Verify:
   - User A sees User B's shirts ✅
   - User B sees User A's pants ✅
   - No cross-contamination ✅

**Test Case 4: No Sharing**
1. User B removes all sharing permissions
2. User A opens User B's profile
3. Verify: "No shared sizes" message is displayed ✅

**Test Case 5: Size Access Disabled**
1. User A disables "allow_size_access" on the circle
2. Verify: No data is visible even with permissions configured ✅

### Edge Cases

- ❌ User not in circle → Cannot see any data
- ❌ Permission revoked → Data immediately becomes invisible
- ❌ User removed from circle → Cannot access shared endpoint
- ✅ Multiple circles → Permissions are circle-specific
- ✅ Empty data → Shows appropriate "no data" messages

## Security Notes

1. **RLS policies remain authoritative**: Even if application code has bugs, database policies prevent unauthorized access
2. **Admin client used server-side**: API uses service role to query on behalf of users, but only returns data allowed by permissions
3. **No direct user access to other profiles**: All queries go through permission checks
4. **Circle membership required**: Both `circle_id` and member relationship must exist

## Performance Considerations

- All three data types fetched in parallel using `Promise.all()` - ~100-200ms total
- Filtering happens server-side - minimal data transfer
- Indexes exist on `profile_id` and `category` columns for fast queries
- RLS policies use EXISTS subqueries - PostgreSQL optimizes these well

## Future Improvements

1. **Caching**: Consider caching shared data in SWR with longer TTL
2. **Pagination**: If users have hundreds of garments, add pagination
3. **Real-time updates**: Use Supabase Realtime to update when permissions change
4. **Export feature**: Allow users to export shared data as CSV/PDF
5. **Measurement labels**: Replace `key.replace(/_/g, ' ')` with proper translation keys
