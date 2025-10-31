#!/bin/bash

# Script to create local test users in Supabase.
# Credentials are read from the environment instead of being hard-coded.

set -euo pipefail

SUPABASE_URL="${SUPABASE_URL:-http://127.0.0.1:54321}"
SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-${SERVICE_ROLE_KEY:-}}"

if [[ -z "${SERVICE_ROLE_KEY}" ]]; then
  echo "❌ Missing service role key. Export SUPABASE_SERVICE_ROLE_KEY before running this script." >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "❌ This script requires jq. Install it (e.g. brew install jq) and retry." >&2
  exit 1
fi

ADMIN_EMAIL="${ADMIN_EMAIL:-admin@sizehub.local}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-Admin@123}"
DEMO_EMAIL="${DEMO_EMAIL:-demo@sizehub.local}"
DEMO_PASSWORD="${DEMO_PASSWORD:-Demo@123}"

create_user() {
  local email="$1"
  local password="$2"
  local display_name="$3"

  echo "➡️ Ensuring user ${email} exists..."
  curl -sS -X POST "${SUPABASE_URL}/auth/v1/admin/users" \
    -H "apikey: ${SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json" \
    -d "{
      \"email\": \"${email}\",
      \"password\": \"${password}\",
      \"email_confirm\": true,
      \"user_metadata\": {
        \"display_name\": \"${display_name}\"
      }
    }" | jq -r '.user.id // empty' >/dev/null || true
}

set_role() {
  local email="$1"
  local role="$2"

  echo "➡️ Setting role ${role} for ${email}..."

  curl -sS -X PATCH "${SUPABASE_URL}/rest/v1/profiles?email=eq.${email}" \
    -H "apikey: ${SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=minimal" \
    -d "{\"role\": \"${role}\"}" >/dev/null
}

create_user "${ADMIN_EMAIL}" "${ADMIN_PASSWORD}" "Administrator"
create_user "${DEMO_EMAIL}" "${DEMO_PASSWORD}" "Demo User"

set_role "${ADMIN_EMAIL}" "admin"
set_role "${DEMO_EMAIL}" "free"

echo ""
echo "✅ Test users ready."
echo "👤 Admin: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}"
echo "👤 Demo:  ${DEMO_EMAIL} / ${DEMO_PASSWORD}"
