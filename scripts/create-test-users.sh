#!/bin/bash

# Script to create test users in Supabase
# These users need to be created via API because password hashing is handled by GoTrue

SUPABASE_URL="http://127.0.0.1:54321"
SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"

echo "Creating Admin user (admin@sizehub.local)..."
curl -X POST "${SUPABASE_URL}/auth/v1/admin/users" \
  -H "apikey: ${SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@sizehub.local",
    "password": "Admin@123",
    "email_confirm": true,
    "user_metadata": {
      "display_name": "Administrator"
    }
  }'

echo -e "\n\nCreating Demo user (demo@sizehub.local)..."
curl -X POST "${SUPABASE_URL}/auth/v1/admin/users" \
  -H "apikey: ${SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@sizehub.local",
    "password": "Demo@123",
    "email_confirm": true,
    "user_metadata": {
      "display_name": "Demo User"
    }
  }'

echo -e "\n\nUpdating user roles..."
docker exec supabase_db_ezdlbipecmcykybkshkz psql -U postgres -d postgres -c "
UPDATE public.profiles
SET role = 'admin'::public.user_role
WHERE email = 'admin@sizehub.local';

UPDATE public.profiles
SET role = 'free'::public.user_role
WHERE email = 'demo@sizehub.local';
" > /dev/null 2>&1

echo -e "\n✅ Test users created successfully!"
echo "👤 Admin: admin@sizehub.local / Admin@123"
echo "👤 Demo: demo@sizehub.local / Demo@123"
