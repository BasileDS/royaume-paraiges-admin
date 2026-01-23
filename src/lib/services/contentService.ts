/**
 * Service de contenu - Donnees Supabase
 *
 * Ce service fournit les donnees de contenu (bieres, etablissements, brasseries, styles)
 * stockees dans Supabase.
 *
 * Les images sont servies depuis Supabase Storage (bucket: content-assets).
 */

import { createClient } from "@/lib/supabase/client";

// Types pour le contenu
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
  // Relation chargee
  breweries?: Brewery | null;
}

export interface BeersEstablishments {
  id: number;
  beer_id: number;
  establishment_id: number;
  added_time: string | null;
  created_at: string;
}

// URL Supabase Storage pour les images
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://uflgfsoekkgegdgecubb.supabase.co";
const STORAGE_BUCKET = "content-assets";

/**
 * Construit l'URL d'une image depuis Supabase Storage
 * Utilise le endpoint /render/image pour les transformations (redimensionnement)
 */
export function getImageUrl(
  imagePath: string | undefined | null,
  options?: {
    width?: number;
    height?: number;
    quality?: number;
  }
): string | null {
  if (!imagePath) return null;

  // Si des transformations sont demandees, utiliser le endpoint render
  if (options?.width || options?.height) {
    const params = new URLSearchParams();
    if (options.width) params.append("width", String(options.width));
    if (options.height) params.append("height", String(options.height));
    if (options.quality) params.append("quality", String(options.quality));
    return `${SUPABASE_URL}/storage/v1/render/image/public/${STORAGE_BUCKET}/${imagePath}?${params}`;
  }

  // Sinon, retourner l'URL directe
  return `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${imagePath}`;
}

/**
 * Recupere tous les etablissements
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
 * Recupere un etablissement par ID
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
 * Recupere toutes les bieres avec leurs brasseries
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
 * Recupere une biere par ID avec sa brasserie
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
 * Recupere toutes les brasseries
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
 * Recupere tous les styles de bieres
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
 * Recupere toutes les liaisons bieres-etablissements
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
 * Recupere les bieres disponibles dans un etablissement
 */
export async function getBeersByEstablishment(
  establishmentId: number
): Promise<Beer[]> {
  const supabase = createClient();

  // Recuperer les IDs des bieres liees a cet etablissement
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: junctions, error: junctionError } = await (supabase as any)
    .from("beers_establishments")
    .select("beer_id")
    .eq("establishment_id", establishmentId);

  if (junctionError || !junctions || junctions.length === 0) {
    return [];
  }

  const beerIds = (junctions as { beer_id: number }[]).map((j) => j.beer_id);

  // Recuperer les bieres
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
 * Recupere les etablissements ou une biere est disponible
 */
export async function getEstablishmentsByBeer(
  beerId: number
): Promise<Establishment[]> {
  const supabase = createClient();

  // Recuperer les IDs des etablissements lies a cette biere
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

  // Recuperer les etablissements
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
}

/**
 * Recupere les statistiques de contenu
 */
export async function getContentStats(): Promise<ContentStatsResult> {
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
  };
}
