import { Establishment, Beer, Brewery, Style, BeersEstablishments } from "@/types/directus";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL || "https://paraiges-directus.neodelta.dev";

// État de disponibilité du service Directus
let directusAvailable: boolean | null = null;
let lastCheckTime = 0;
const CHECK_INTERVAL = 60000; // Re-vérifier toutes les 60 secondes

async function checkDirectusAvailability(): Promise<boolean> {
  const now = Date.now();
  if (directusAvailable !== null && now - lastCheckTime < CHECK_INTERVAL) {
    return directusAvailable;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${DIRECTUS_URL}/items/establishments?limit=1`, {
      signal: controller.signal,
      next: { revalidate: 0 },
    });

    clearTimeout(timeoutId);
    directusAvailable = response.ok;
  } catch {
    directusAvailable = false;
  }

  lastCheckTime = now;
  return directusAvailable;
}

export function isDirectusAvailable(): boolean | null {
  return directusAvailable;
}

async function fetchDirectus<T>(
  collection: string,
  params?: Record<string, string>
): Promise<T[]> {
  // Vérifier si Directus est disponible
  const available = await checkDirectusAvailability();
  if (!available) {
    console.warn(`Directus is unavailable, skipping fetch for ${collection}`);
    return [];
  }

  const url = new URL(`${DIRECTUS_URL}/items/${collection}`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url.toString(), {
      signal: controller.signal,
      next: { revalidate: 300 },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`Failed to fetch ${collection}: ${response.statusText}`);
      return [];
    }

    const result = await response.json();
    return result.data || [];
  } catch (error) {
    console.warn(`Error fetching ${collection} from Directus:`, error);
    directusAvailable = false;
    return [];
  }
}

export async function getEstablishments(): Promise<Establishment[]> {
  return fetchDirectus<Establishment>("establishments", {
    sort: "title",
    limit: "-1",
  });
}

export async function getEstablishment(id: number): Promise<Establishment | null> {
  const data = await fetchDirectus<Establishment>("establishments", {
    "filter[id][_eq]": String(id),
  });
  return data[0] || null;
}

export async function getBeers(): Promise<Beer[]> {
  return fetchDirectus<Beer>("beers", {
    sort: "title",
    limit: "-1",
    "fields[]": "*,brewery.*",
  });
}

export async function getBeer(id: number): Promise<Beer | null> {
  const data = await fetchDirectus<Beer>("beers", {
    "filter[id][_eq]": String(id),
    "fields[]": "*,brewery.*",
  });
  return data[0] || null;
}

export async function getBreweries(): Promise<Brewery[]> {
  return fetchDirectus<Brewery>("breweries", {
    sort: "title",
    limit: "-1",
  });
}

export async function getStyles(): Promise<Style[]> {
  return fetchDirectus<Style>("styles", {
    sort: "title",
    limit: "-1",
  });
}

export async function getBeersEstablishments(): Promise<BeersEstablishments[]> {
  return fetchDirectus<BeersEstablishments>("beers_establishments", {
    limit: "-1",
  });
}

export async function getBeersByEstablishment(
  establishmentId: number
): Promise<Beer[]> {
  const junctions = await fetchDirectus<BeersEstablishments>(
    "beers_establishments",
    {
      "filter[establishments_id][_eq]": String(establishmentId),
      limit: "-1",
    }
  );

  const beerIds = junctions.map((j) => j.beers_id);
  if (beerIds.length === 0) return [];

  const beers = await fetchDirectus<Beer>("beers", {
    "filter[id][_in]": beerIds.join(","),
    "fields[]": "*,brewery.*",
    sort: "title",
  });

  return beers;
}

export async function getEstablishmentsByBeer(
  beerId: number
): Promise<Establishment[]> {
  const junctions = await fetchDirectus<BeersEstablishments>(
    "beers_establishments",
    {
      "filter[beers_id][_eq]": String(beerId),
      limit: "-1",
    }
  );

  const establishmentIds = junctions.map((j) => j.establishments_id);
  if (establishmentIds.length === 0) return [];

  const establishments = await fetchDirectus<Establishment>("establishments", {
    "filter[id][_in]": establishmentIds.join(","),
    sort: "title",
  });

  return establishments;
}

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

  const url = new URL(`${DIRECTUS_URL}/assets/${imageId}`);

  if (options?.width) url.searchParams.append("width", String(options.width));
  if (options?.height) url.searchParams.append("height", String(options.height));
  if (options?.fit) url.searchParams.append("fit", options.fit);
  if (options?.quality) url.searchParams.append("quality", String(options.quality));

  return url.toString();
}

export interface DirectusStatsResult {
  totalEstablishments: number;
  totalBeers: number;
  totalBreweries: number;
  totalStyles: number;
  available: boolean;
}

export async function getDirectusStats(): Promise<DirectusStatsResult> {
  const [establishments, beers, breweries, styles] = await Promise.all([
    getEstablishments(),
    getBeers(),
    getBreweries(),
    getStyles(),
  ]);

  return {
    totalEstablishments: establishments.length,
    totalBeers: beers.length,
    totalBreweries: breweries.length,
    totalStyles: styles.length,
    available: directusAvailable === true,
  };
}
