// Export only the admin client to avoid naming conflicts
// For createClient, import directly from ./client or ./server
export { createSupabaseAdminClient } from "./server";
