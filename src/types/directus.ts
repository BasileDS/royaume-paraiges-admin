export interface Establishment {
  id: number;
  title: string;
  line_address_1?: string;
  line_address_2?: string;
  zipcode?: string;
  city?: string;
  country?: string;
  short_description?: string;
  description?: string;
  featured_image?: string;
  anniversary?: string;
  logo?: string;
}

export interface Beer {
  id: number;
  title: string;
  description?: string;
  featured_image?: string;
  brewery?: number | Brewery;
  ibu?: number;
  style?: number;
  available_at?: number[];
}

export interface Brewery {
  id: number;
  title: string;
  country?: string;
}

export interface Style {
  id: number;
  title: string;
  description?: string;
}

export interface BeersEstablishments {
  id: number;
  beers_id: number;
  establishments_id: number;
  added_time?: string;
}

export interface DirectusSchema {
  beers: Beer[];
  breweries: Brewery[];
  establishments: Establishment[];
  styles: Style[];
  beers_establishments: BeersEstablishments[];
}
