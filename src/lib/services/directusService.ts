/**
 * Service de contenu - Migration Directus vers Supabase
 *
 * Ce service fournit les données de contenu (bières, établissements, brasseries, styles)
 * qui étaient précédemment stockées dans Directus et ont été migrées vers Supabase.
 *
 * Les images sont temporairement servies depuis Directus jusqu'à leur migration
 * vers Supabase Storage (bucket: content-assets).
 */

import { createClient } from "@/lib/supabase/client";

// Types pour le contenu migré depuis Directus
export interface Establishment {
  id: number;
  title: string;
  line_address_1: string | null;
  line_address_2: string | null;
  zipcode: string | null;
  city: string | null;
  country: string | null;
  short_description: string | null;
  description: string | null;
  featured_image: string | null;
  anniversary: string | null;
  logo: string | null;
  created_at: string;
}

export interface Brewery {
  id: number;
  title: string;
  country: string | null;
  created_at: string;
}

export interface BeerStyle {
  id: number;
  title: string;
  description: string | null;
  created_at: string;
}

export interface Beer {
  id: number;
  title: string;
  description: string | null;
  featured_image: string | null;
  ibu: number | null;
  abv: number | null;
  brewery_id: number | null;
  created_at: string;
  // Relation chargée
  breweries?: Brewery | null;
}

export interface BeersEstablishments {
  id: number;
  beer_id: number;
  establishment_id: number;
  added_time: string | null;
  created_at: string;
}

// URL Directus pour les images (temporaire - jusqu'à migration vers Supabase Storage)
const DIRECTUS_URL =
  process.env.NEXT_PUBLIC_DIRECTUS_URL ||
  "https://paraiges-directus.neodelta.dev";

// URL Supabase Storage pour les images migrées
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://uflgfsoekkgegdgecubb.supabase.co";
const STORAGE_BUCKET = "content-assets";

// Flag pour basculer vers Supabase Storage une fois les images migrées
const USE_SUPABASE_STORAGE = false;

/**
 * Construit l'URL d'une image
 * Temporairement pointe vers Directus, basculera vers Supabase Storage après migration
 */
export function getDirectusImageUrl(
  imageId: string | undefined | null,
  options?: {
    width?: number;
    height?: number;
    fit?: "cover" | "contain" | "inside" | "outside";
    quality?: number;
  }
): string | null {
  if (!imageId) return null;

  if (USE_SUPABASE_STORAGE) {
    // Après migration: URL Supabase Storage avec transformations
    const baseUrl = `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${imageId}`;
    const params = new URLSearchParams();
    if (options?.width) params.append("width", String(options.width));
    if (options?.height) params.append("height", String(options.height));
    return params.toString() ? `${baseUrl}?${params}` : baseUrl;
  }

  // Avant migration: URL Directus
  const url = new URL(`${DIRECTUS_URL}/assets/${imageId}`);
  if (options?.width) url.searchParams.append("width", String(options.width));
  if (options?.height)
    url.searchParams.append("height", String(options.height));
  if (options?.fit) url.searchParams.append("fit", options.fit);
  if (options?.quality)
    url.searchParams.append("quality", String(options.quality));

  return url.toString();
}

/**
 * Récupère tous les établissements
 */
export async function getEstablishments(): Promise<Establishment[]> {
  const supabase = createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("establishments")
    .select("*")
    .order("title");

  if (error) {
    console.error("Error fetching establishments:", error);
    return [];
  }

  return (data as Establishment[]) || [];
}

/**
 * Récupère un établissement par ID
 */
export async function getEstablishment(
  id: number
): Promise<Establishment | null> {
  const supabase = createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("establishments")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching establishment:", error);
    return null;
  }

  return data as Establishment;
}

/**
 * Récupère toutes les bières avec leurs brasseries
 */
export async function getBeers(): Promise<Beer[]> {
  const supabase = createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("beers")
    .select("*, breweries(*)")
    .order("title");

  if (error) {
    console.error("Error fetching beers:", error);
    return [];
  }

  return (data as Beer[]) || [];
}

/**
 * Récupère une bière par ID avec sa brasserie
 */
export async function getBeer(id: number): Promise<Beer | null> {
  const supabase = createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("beers")
    .select("*, breweries(*)")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching beer:", error);
    return null;
  }

  return data as Beer;
}

/**
 * Récupère toutes les brasseries
 */
export async function getBreweries(): Promise<Brewery[]> {
  const supabase = createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("breweries")
    .select("*")
    .order("title");

  if (error) {
    console.error("Error fetching breweries:", error);
    return [];
  }

  return (data as Brewery[]) || [];
}

/**
 * Récupère tous les styles de bières
 * Note: Table renommée de "styles" à "beer_styles" lors de la migration
 */
export async function getStyles(): Promise<BeerStyle[]> {
  const supabase = createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("beer_styles")
    .select("*")
    .order("title");

  if (error) {
    console.error("Error fetching beer styles:", error);
    return [];
  }

  return (data as BeerStyle[]) || [];
}

/**
 * Récupère toutes les liaisons bières-établissements
 */
export async function getBeersEstablishments(): Promise<BeersEstablishments[]> {
  const supabase = createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("beers_establishments")
    .select("*");

  if (error) {
    console.error("Error fetching beers_establishments:", error);
    return [];
  }

  return (data as BeersEstablishments[]) || [];
}

/**
 * Récupère les bières disponibles dans un établissement
 */
export async function getBeersByEstablishment(
  establishmentId: number
): Promise<Beer[]> {
  const supabase = createClient();

  // Récupérer les IDs des bières liées à cet établissement
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: junctions, error: junctionError } = await (supabase as any)
    .from("beers_establishments")
    .select("beer_id")
    .eq("establishment_id", establishmentId);

  if (junctionError || !junctions || junctions.length === 0) {
    return [];
  }

  const beerIds = (junctions as { beer_id: number }[]).map((j) => j.beer_id);

  // Récupérer les bières
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: beers, error: beersError } = await (supabase as any)
    .from("beers")
    .select("*, breweries(*)")
    .in("id", beerIds)
    .order("title");

  if (beersError) {
    console.error("Error fetching beers by establishment:", beersError);
    return [];
  }

  return (beers as Beer[]) || [];
}

/**
 * Récupère les établissements où une bière est disponible
 */
export async function getEstablishmentsByBeer(
  beerId: number
): Promise<Establishment[]> {
  const supabase = createClient();

  // Récupérer les IDs des établissements liés à cette bière
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: junctions, error: junctionError } = await (supabase as any)
    .from("beers_establishments")
    .select("establishment_id")
    .eq("beer_id", beerId);

  if (junctionError || !junctions || junctions.length === 0) {
    return [];
  }

  const establishmentIds = (junctions as { establishment_id: number }[]).map(
    (j) => j.establishment_id
  );

  // Récupérer les établissements
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: establishments, error: establishmentsError } = await (
    supabase as any
  )
    .from("establishments")
    .select("*")
    .in("id", establishmentIds)
    .order("title");

  if (establishmentsError) {
    console.error("Error fetching establishments by beer:", establishmentsError);
    return [];
  }

  return (establishments as Establishment[]) || [];
}

export interface ContentStatsResult {
  totalEstablishments: number;
  totalBeers: number;
  totalBreweries: number;
  totalStyles: number;
  available: boolean;
}

/**
 * Récupère les statistiques de contenu
 * Remplace getDirectusStats() - les données viennent maintenant de Supabase
 */
export async function getDirectusStats(): Promise<ContentStatsResult> {
  const supabase = createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const [establishments, beers, breweries, styles] = await Promise.all([
    sb.from("establishments").select("id", { count: "exact", head: true }),
    sb.from("beers").select("id", { count: "exact", head: true }),
    sb.from("breweries").select("id", { count: "exact", head: true }),
    sb.from("beer_styles").select("id", { count: "exact", head: true }),
  ]);

  return {
    totalEstablishments: establishments.count || 0,
    totalBeers: beers.count || 0,
    totalBreweries: breweries.count || 0,
    totalStyles: styles.count || 0,
    available: true, // Supabase est toujours disponible
  };
}

/**
 * @deprecated Utilisez getDirectusStats() - Supabase est toujours disponible
 */
export function isDirectusAvailable(): boolean {
  return true;
}
