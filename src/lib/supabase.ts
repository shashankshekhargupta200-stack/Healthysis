import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

let client: SupabaseClient | null = null;
let missingConfigurationWarningShown = false;

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseUrl || !supabaseAnonKey) {
    const message = "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.";
    if (!missingConfigurationWarningShown) {
      console.warn(message);
      missingConfigurationWarningShown = true;
    }
    throw new Error(message);
  }
  if (!client) client = createClient(supabaseUrl, supabaseAnonKey);
  return client;
}

export async function requireAuthenticatedUser(
  supabase: SupabaseClient,
  expectedUserId: string | undefined
): Promise<string> {
  if (!expectedUserId) {
    throw new Error("A signed-in user is required to access health records.");
  }

  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;

  const sessionUserId = data.session?.user.id;
  if (!sessionUserId || sessionUserId !== expectedUserId) {
    throw new Error("The current Supabase session does not match the requested health-record owner.");
  }
  return sessionUserId;
}
