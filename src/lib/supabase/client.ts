import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { translateAccessError } from "./access-errors";

// Chaque réponse en erreur passe par ici : un refus d'accès 42501 (feature
// désactivée par un super admin, ligne hors périmètre) ressort avec un message
// en français, que les pages affichent tel quel dans leurs toasts. Le corps
// d'origine est conservé dans `details`.
async function fetchWithReadableAccessErrors(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const response = await fetch(input, init);
  if (response.ok) return response;
  if (!(response.headers.get("content-type") ?? "").includes("application/json")) {
    return response;
  }

  let body: unknown;
  try {
    body = await response.clone().json();
  } catch {
    return response;
  }
  const translated = translateAccessError(body);
  if (!translated) return response;

  const headers = new Headers(response.headers);
  headers.delete("content-length");
  return new Response(JSON.stringify(translated), {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { fetch: fetchWithReadableAccessErrors } },
  );
}
