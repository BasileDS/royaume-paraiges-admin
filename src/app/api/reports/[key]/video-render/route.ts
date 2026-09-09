import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Relais vers le service de rendu vidéo (`royaume-video-renderer`, Vercel).
 *
 * Existe pour deux raisons :
 *   1. le bearer partagé avec le renderer ne doit jamais atteindre le
 *      navigateur, donc l'appel part du serveur ;
 *   2. l'appelant doit être un admin authentifié - le renderer, lui, ne
 *      connaît qu'un secret partagé et ne sait pas qui parle.
 *
 * Les réponses du renderer (`reason`, `code`) sont rédigées en français et
 * destinées à être affichées telles quelles : on les relaie sans réécriture.
 */

const RENDER_TIMEOUT_MS = 20_000;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const { key } = await params;

  // Authentification : la RLS protège les données, pas cette route, qui parle
  // au renderer avec un secret de service. Le contrôle du rôle est donc ici.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ reason: "Non authentifié." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || (profile as { role: string }).role !== "admin") {
    return NextResponse.json({ reason: "Réservé aux administrateurs." }, { status: 403 });
  }

  // Le middleware bloque déjà /api/reports pour un admin privé de la
  // fonctionnalité ; on le revérifie ici en base (admin_has_feature, migration
  // 070) pour ne pas dépendre du seul routage.
  const { data: hasFeature } = await (supabase.rpc as any)("admin_has_feature", {
    p_feature_key: "reports",
  });
  if (hasFeature !== true) {
    return NextResponse.json(
      { reason: "La fonctionnalité Rapports est désactivée pour ce compte." },
      { status: 403 },
    );
  }

  const serviceUrl = process.env.VIDEO_RENDER_URL;
  const serviceKey = process.env.VIDEO_RENDER_KEY;
  if (!serviceUrl || !serviceKey) {
    return NextResponse.json(
      {
        reason:
          "Le service de rendu n'est pas configuré (VIDEO_RENDER_URL / VIDEO_RENDER_KEY manquants).",
      },
      { status: 503 },
    );
  }

  let body: { period_identifier?: string; force?: boolean } = {};
  try {
    body = await request.json();
  } catch {
    // Corps vide accepté : le renderer résout alors lui-même la période.
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), RENDER_TIMEOUT_MS);

    const response = await fetch(`${serviceUrl.replace(/\/$/, "")}/api/render`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        report_key: key,
        ...(body.period_identifier ? { period_identifier: body.period_identifier } : {}),
        ...(body.force ? { force: true } : {}),
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const payload = await response.json().catch(() => ({}));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    return NextResponse.json(
      {
        reason: aborted
          ? "Le service de rendu n'a pas répondu dans les temps."
          : `Service de rendu injoignable : ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 502 },
    );
  }
}
