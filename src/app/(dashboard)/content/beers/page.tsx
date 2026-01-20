"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Beer, ExternalLink, Building2, Factory } from "lucide-react";
import {
  getBeers,
  getBreweries,
  getEstablishments,
  getEstablishmentsByBeer,
  getDirectusImageUrl,
} from "@/lib/services/directusService";
import { useToast } from "@/components/ui/use-toast";
import type { Beer as BeerType, Brewery, Establishment } from "@/types/directus";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function BeersPage() {
  const [beers, setBeers] = useState<BeerType[]>([]);
  const [breweries, setBreweries] = useState<Brewery[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [breweryFilter, setBreweryFilter] = useState<string>("all");
  const [selectedBeer, setSelectedBeer] = useState<BeerType | null>(null);
  const [selectedEstablishments, setSelectedEstablishments] = useState<Establishment[]>([]);
  const [loadingEstablishments, setLoadingEstablishments] = useState(false);
  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [beersData, breweriesData] = await Promise.all([
        getBeers(),
        getBreweries(),
      ]);
      setBeers(beersData);
      setBreweries(breweriesData);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les bieres",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleViewEstablishments = async (beer: BeerType) => {
    setSelectedBeer(beer);
    setLoadingEstablishments(true);
    try {
      const establishments = await getEstablishmentsByBeer(beer.id);
      setSelectedEstablishments(establishments);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les etablissements",
      });
    } finally {
      setLoadingEstablishments(false);
    }
  };

  const getBreweryName = (beer: BeerType) => {
    if (typeof beer.brewery === "object" && beer.brewery) {
      return beer.brewery.title;
    }
    const brewery = breweries.find((b) => b.id === beer.brewery);
    return brewery?.title || "-";
  };

  const getBreweryId = (beer: BeerType): number | undefined => {
    if (typeof beer.brewery === "object" && beer.brewery) {
      return beer.brewery.id;
    }
    return beer.brewery as number | undefined;
  };

  const filteredBeers = beers.filter((beer) => {
    const matchesSearch = beer.title?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBrewery =
      breweryFilter === "all" || getBreweryId(beer)?.toString() === breweryFilter;
    return matchesSearch && matchesBrewery;
  });

  const totalBeers = beers.length;
  const totalBreweries = breweries.length;
  const averageIBU =
    beers.filter((b) => b.ibu).reduce((sum, b) => sum + (b.ibu || 0), 0) /
    (beers.filter((b) => b.ibu).length || 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Bieres</h1>
        <p className="text-muted-foreground">
          Catalogue des bieres configure sur Directus (lecture seule)
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total bieres</CardTitle>
            <Beer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBeers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Brasseries</CardTitle>
            <Factory className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBreweries}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">IBU moyen</CardTitle>
            <Beer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(averageIBU)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Source</CardTitle>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <a
              href={`${process.env.NEXT_PUBLIC_DIRECTUS_URL}/admin/content/beers`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline"
            >
              Ouvrir Directus
            </a>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Liste des bieres</CardTitle>
              <CardDescription>
                {filteredBeers.length} biere{filteredBeers.length > 1 ? "s" : ""}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-[200px]"
              />
              <Select value={breweryFilter} onValueChange={setBreweryFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Brasserie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les brasseries</SelectItem>
                  {breweries.map((brewery) => (
                    <SelectItem key={brewery.id} value={brewery.id.toString()}>
                      {brewery.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredBeers.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              Aucune biere trouvee
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Biere</TableHead>
                  <TableHead>Brasserie</TableHead>
                  <TableHead>IBU</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBeers.map((beer) => (
                  <TableRow key={beer.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {beer.featured_image && (
                          <img
                            src={getDirectusImageUrl(beer.featured_image, {
                              width: 40,
                              height: 40,
                              fit: "cover",
                            }) || ""}
                            alt={beer.title}
                            className="h-10 w-10 rounded object-cover"
                          />
                        )}
                        <div>
                          <p className="font-medium">{beer.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {beer.description?.slice(0, 50)}
                            {beer.description && beer.description.length > 50 && "..."}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getBreweryName(beer)}</TableCell>
                    <TableCell>
                      {beer.ibu ? (
                        <Badge variant="outline">{beer.ibu} IBU</Badge>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewEstablishments(beer)}
                      >
                        <Building2 className="mr-2 h-4 w-4" />
                        Disponibilite
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedBeer} onOpenChange={() => setSelectedBeer(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Disponibilite - {selectedBeer?.title}</DialogTitle>
            <DialogDescription>
              Etablissements ou cette biere est disponible
            </DialogDescription>
          </DialogHeader>
          {loadingEstablishments ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : selectedEstablishments.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              Cette biere n'est configuree dans aucun etablissement
            </div>
          ) : (
            <div className="max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Etablissement</TableHead>
                    <TableHead>Ville</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedEstablishments.map((est) => (
                    <TableRow key={est.id}>
                      <TableCell className="font-medium">{est.title}</TableCell>
                      <TableCell>
                        {est.city}, {est.country}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
