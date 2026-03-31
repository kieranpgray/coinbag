
/**
 * Supabase Edge Function: workspace-member-profiles
 *
 * POST JSON { workspace_id: uuid }
 * Header: x-clerk-token (Clerk JWT)
 *
 * Verifies caller membership via Supabase RLS (anon + JWT). Fetches Clerk user
 * display fields per member. No email in response.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-clerk-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const BATCH_SIZE = 5;

function jsonResponse(body: object, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getUserIdFromJwt(token: string): string | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    let base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4 !== 0) base64 += "=";
    const payload = JSON.parse(atob(base64));
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

interface ClerkUserRow {
  image_url?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}

async function fetchClerkUser(
  clerkSecretKey: string,
  userId: string,
): Promise<ClerkUserRow | null> {
  const res = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
    headers: {
      Authorization: `Bearer ${clerkSecretKey}`,
      "Content-Type": "application/json",
    },
  });
  if (res.status === 404) return null;
  if (res.status === 429) return null;
  if (!res.ok) return null;
  return res.json();
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const clerkToken = req.headers.get("x-clerk-token");
  if (!clerkToken) {
    return jsonResponse(
      { error: "Clerk JWT token required in x-clerk-token header" },
      401,
    );
  }

  const userId = getUserIdFromJwt(clerkToken);
  if (!userId) {
    return jsonResponse({ error: "Invalid token" }, 401);
  }

  let body: { workspace_id?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const workspaceId = body?.workspace_id;
  if (!workspaceId || typeof workspaceId !== "string" || !uuidRegex.test(workspaceId)) {
    return jsonResponse({ error: "workspace_id must be a valid UUID" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const clerkSecretKey = Deno.env.get("CLERK_SECRET_KEY");

  if (!supabaseUrl || !supabaseAnonKey) {
    return jsonResponse({ error: "Server configuration error" }, 500);
  }
  if (!clerkSecretKey) {
    return jsonResponse({ error: "Server configuration error" }, 500);
  }

  const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${clerkToken}` } },
  });

  const { data: membership, error: memErr } = await supabaseAuth
    .from("workspace_memberships")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();

  if (memErr) {
    console.error("membership check error", memErr);
    return jsonResponse({ error: "Forbidden" }, 403);
  }
  if (!membership) {
    return jsonResponse({ error: "Forbidden" }, 403);
  }

  const { data: rows, error: listErr } = await supabaseAuth
    .from("workspace_memberships")
    .select("user_id")
    .eq("workspace_id", workspaceId);

  if (listErr) {
    console.error("list members error", listErr);
    return jsonResponse({ error: "Failed to list members" }, 500);
  }

  const userIds = [...new Set((rows ?? []).map((r: { user_id: string }) => r.user_id))];

  const profiles: Array<{
    userId: string;
    imageUrl: string | null;
    firstName: string | null;
    lastName: string | null;
  }> = [];

  for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
    const batch = userIds.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (uid: string) => {
        const u = await fetchClerkUser(clerkSecretKey, uid);
        if (!u) {
          return {
            userId: uid,
            imageUrl: null,
            firstName: null,
            lastName: null,
          };
        }
        return {
          userId: uid,
          imageUrl: u.image_url ?? null,
          firstName: u.first_name ?? null,
          lastName: u.last_name ?? null,
        };
      }),
    );
    profiles.push(...results);
  }

  return jsonResponse({ profiles }, 200);
});
