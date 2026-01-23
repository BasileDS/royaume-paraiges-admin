"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2, Upload, X } from "lucide-react";
import {
  getEstablishment,
  updateEstablishment,
  uploadEstablishmentImage,
  deleteEstablishmentImage,
  getImageUrl,
} from "@/lib/services/contentService";
import { useToast } from "@/components/ui/use-toast";

export default function EditEstablishmentPage() {
  const router = useRouter();
  const params = useParams();
  const id = parseInt(params.id as string);
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  // Image principale
  const [currentFeaturedImage, setCurrentFeaturedImage] = useState<string | null>(null);
  const [newFeaturedFile, setNewFeaturedFile] = useState<File | null>(null);
  const [featuredPreview, setFeaturedPreview] = useState<string | null>(null);

  // Logo
  const [currentLogo, setCurrentLogo] = useState<string | null>(null);
  const [newLogoFile, setNewLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    shortDescription: "",
    description: "",
    lineAddress1: "",
    lineAddress2: "",
    zipcode: "",
    city: "",
    country: "",
    anniversary: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const establishment = await getEstablishment(id);

        if (establishment) {
          setForm({
            title: establishment.title || "",
            shortDescription: establishment.short_description || "",
            description: establishment.description || "",
            lineAddress1: establishment.line_address_1 || "",
            lineAddress2: establishment.line_address_2 || "",
            zipcode: establishment.zipcode || "",
            city: establishment.city || "",
            country: establishment.country || "",
            anniversary: establishment.anniversary
              ? establishment.anniversary.split("T")[0]
              : "",
          });
          setCurrentFeaturedImage(establishment.featured_image);
          setCurrentLogo(establishment.logo);
        } else {
          toast({
            variant: "destructive",
            title: "Erreur",
            description: "Etablissement introuvable",
          });
          router.push("/content/establishments");
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Impossible de charger l'etablissement",
        });
        router.push("/content/establishments");
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [id, router, toast]);

  const handleFeaturedImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewFeaturedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFeaturedPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveFeaturedImage = () => {
    setNewFeaturedFile(null);
    setFeaturedPreview(null);
  };

  const handleRemoveLogo = () => {
    setNewLogoFile(null);
    setLogoPreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let newFeaturedPath = currentFeaturedImage;
      let newLogoPath = currentLogo;

      // Upload de l'image principale si modifiee
      if (newFeaturedFile) {
        if (currentFeaturedImage) {
          await deleteEstablishmentImage(currentFeaturedImage);
        }
        newFeaturedPath = await uploadEstablishmentImage(id, newFeaturedFile, "featured");
      }

      // Upload du logo si modifie
      if (newLogoFile) {
        if (currentLogo) {
          await deleteEstablishmentImage(currentLogo);
        }
        newLogoPath = await uploadEstablishmentImage(id, newLogoFile, "logo");
      }

      await updateEstablishment(id, {
        title: form.title,
        short_description: form.shortDescription || null,
        description: form.description || null,
        line_address_1: form.lineAddress1 || null,
        line_address_2: form.lineAddress2 || null,
        zipcode: form.zipcode || null,
        city: form.city || null,
        country: form.country || null,
        anniversary: form.anniversary || null,
        featured_image: newFeaturedPath,
        logo: newLogoPath,
      });

      toast({ title: "Etablissement mis a jour" });
      router.push("/content/establishments");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de mettre a jour l'etablissement",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/content/establishments">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Modifier l'etablissement</h1>
          <p className="text-muted-foreground">{form.title}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Informations generales</CardTitle>
            <CardDescription>
              Modifiez les informations de l'etablissement
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Nom de l'etablissement *</Label>
              <Input
                id="title"
                placeholder="Ex: Le Royaume des Paraiges"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="shortDescription">Description courte</Label>
              <Input
                id="shortDescription"
                placeholder="Resume en une ligne"
                value={form.shortDescription}
                onChange={(e) =>
                  setForm({ ...form, shortDescription: e.target.value })
                }
                maxLength={150}
              />
              <p className="text-xs text-muted-foreground">
                {form.shortDescription.length}/150 caracteres
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description complete</Label>
              <Textarea
                id="description"
                placeholder="Description detaillee de l'etablissement"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="anniversary">Date anniversaire</Label>
              <Input
                id="anniversary"
                type="date"
                value={form.anniversary}
                onChange={(e) =>
                  setForm({ ...form, anniversary: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                Date de creation ou d'ouverture de l'etablissement
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Images</CardTitle>
            <CardDescription>
              Image principale et logo de l'etablissement
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Image principale */}
            <div className="space-y-2">
              <Label>Image principale</Label>
              <div className="flex items-start gap-4">
                {(featuredPreview || currentFeaturedImage) && (
                  <div className="relative">
                    <div className="flex h-32 w-48 items-center justify-center overflow-hidden rounded-lg border bg-muted/10">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={featuredPreview || getImageUrl(currentFeaturedImage) || ""}
                        alt="Image principale"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    {featuredPreview && (
                      <button
                        type="button"
                        onClick={handleRemoveFeaturedImage}
                        className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground hover:bg-destructive/90"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )}
                <div className="flex-1">
                  <label
                    htmlFor="featured-upload"
                    className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-6 transition-colors hover:border-muted-foreground/50"
                  >
                    <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {newFeaturedFile
                        ? newFeaturedFile.name
                        : currentFeaturedImage
                        ? "Changer l'image"
                        : "Importer une image"}
                    </span>
                    <span className="mt-1 text-xs text-muted-foreground">
                      PNG, JPG, WebP, AVIF jusqu'a 5MB
                    </span>
                  </label>
                  <input
                    id="featured-upload"
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp,image/avif"
                    className="hidden"
                    onChange={handleFeaturedImageChange}
                  />
                </div>
              </div>
            </div>

            {/* Logo */}
            <div className="space-y-2">
              <Label>Logo</Label>
              <div className="flex items-start gap-4">
                {(logoPreview || currentLogo) && (
                  <div className="relative">
                    <div className="flex h-24 items-center justify-center overflow-hidden rounded-lg border bg-muted/10 p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={logoPreview || getImageUrl(currentLogo) || ""}
                        alt="Logo"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    {logoPreview && (
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground hover:bg-destructive/90"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )}
                <div className="flex-1">
                  <label
                    htmlFor="logo-upload"
                    className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-6 transition-colors hover:border-muted-foreground/50"
                  >
                    <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {newLogoFile
                        ? newLogoFile.name
                        : currentLogo
                        ? "Changer le logo"
                        : "Importer un logo"}
                    </span>
                    <span className="mt-1 text-xs text-muted-foreground">
                      PNG, JPG, WebP, AVIF jusqu'a 2MB
                    </span>
                  </label>
                  <input
                    id="logo-upload"
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp,image/avif"
                    className="hidden"
                    onChange={handleLogoChange}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Adresse</CardTitle>
            <CardDescription>
              Localisation de l'etablissement
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="lineAddress1">Adresse ligne 1</Label>
              <Input
                id="lineAddress1"
                placeholder="Numero et rue"
                value={form.lineAddress1}
                onChange={(e) =>
                  setForm({ ...form, lineAddress1: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lineAddress2">Adresse ligne 2</Label>
              <Input
                id="lineAddress2"
                placeholder="Complement d'adresse (optionnel)"
                value={form.lineAddress2}
                onChange={(e) =>
                  setForm({ ...form, lineAddress2: e.target.value })
                }
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="zipcode">Code postal</Label>
                <Input
                  id="zipcode"
                  placeholder="Ex: 57000"
                  value={form.zipcode}
                  onChange={(e) =>
                    setForm({ ...form, zipcode: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">Ville</Label>
                <Input
                  id="city"
                  placeholder="Ex: Metz"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Pays</Label>
                <Input
                  id="country"
                  placeholder="Ex: France"
                  value={form.country}
                  onChange={(e) =>
                    setForm({ ...form, country: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <Link href="/content/establishments">
                <Button type="button" variant="outline">
                  Annuler
                </Button>
              </Link>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enregistrer
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
