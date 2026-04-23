import fs from "fs";
import path from "path";

/**
 * Helpers Server-only pour lire le submodule docs/ et exposer son arborescence
 * + le contenu d'un fichier .md à la page admin /documentation.
 */

export interface DocFile {
  /** Chemin relatif depuis docs/docs/ (ex. "supabase/tables/quests.md") */
  relativePath: string;
  /** Nom de fichier sans extension (ex. "quests") */
  name: string;
}

export interface DocSection {
  /** Titre lisible (ex. "Tables") */
  title: string;
  /** Préfixe de chemin (ex. "supabase/tables") */
  pathPrefix: string;
  /** Fichiers .md de cette section */
  files: DocFile[];
}

export interface DocCategory {
  /** Titre lisible (ex. "Supabase") */
  title: string;
  /** Sections (sous-dossiers) */
  sections: DocSection[];
  /** Fichiers .md à la racine de la catégorie (README.md, etc.) */
  rootFiles: DocFile[];
}

/**
 * Racine du submodule docs/ — résolue depuis la racine du projet admin.
 * Note : process.cwd() en App Router pointe sur la racine projet (royaume-paraiges-admin).
 */
const DOCS_ROOT = path.join(process.cwd(), "docs", "docs");

/**
 * Liste toutes les catégories (claude, supabase, rgpd, qrcode, migrations).
 * Retourne uniquement les dossiers présents.
 */
export function listCategories(): DocCategory[] {
  if (!fs.existsSync(DOCS_ROOT)) {
    return [];
  }

  const categoryNames = fs
    .readdirSync(DOCS_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  return categoryNames.map((name) => {
    const categoryPath = path.join(DOCS_ROOT, name);
    const entries = fs.readdirSync(categoryPath, { withFileTypes: true });

    const rootFiles: DocFile[] = entries
      .filter((e) => e.isFile() && e.name.endsWith(".md"))
      .map((e) => ({
        relativePath: `${name}/${e.name}`,
        name: e.name.replace(/\.md$/, ""),
      }))
      .sort((a, b) => {
        // README en premier
        if (a.name.toLowerCase() === "readme") return -1;
        if (b.name.toLowerCase() === "readme") return 1;
        return a.name.localeCompare(b.name);
      });

    const subDirs = entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort();

    const sections: DocSection[] = subDirs.map((sub) => {
      const sectionPath = path.join(categoryPath, sub);
      const files = fs
        .readdirSync(sectionPath, { withFileTypes: true })
        .filter((e) => e.isFile() && e.name.endsWith(".md"))
        .map((e) => ({
          relativePath: `${name}/${sub}/${e.name}`,
          name: e.name.replace(/\.md$/, ""),
        }))
        .sort((a, b) => {
          if (a.name.toLowerCase() === "readme") return -1;
          if (b.name.toLowerCase() === "readme") return 1;
          return a.name.localeCompare(b.name);
        });

      return {
        title: humanize(sub),
        pathPrefix: `${name}/${sub}`,
        files,
      };
    });

    return {
      title: humanize(name),
      sections,
      rootFiles,
    };
  });
}

/**
 * Lit le contenu d'un fichier .md, en sécurisant contre la traversée de chemin.
 * Retourne null si le fichier n'existe pas ou est en dehors de DOCS_ROOT.
 */
export function readDocFile(relativePath: string): string | null {
  if (!relativePath.endsWith(".md")) {
    return null;
  }

  const resolved = path.resolve(DOCS_ROOT, relativePath);
  if (!resolved.startsWith(DOCS_ROOT + path.sep)) {
    // Tentative de traversée — on refuse
    return null;
  }

  if (!fs.existsSync(resolved)) {
    return null;
  }

  return fs.readFileSync(resolved, "utf-8");
}

/**
 * Met une majuscule + transforme les underscores/dashes en espaces pour
 * obtenir un libellé lisible (ex. "edge-functions" → "Edge functions").
 */
function humanize(slug: string): string {
  const words = slug.replace(/[-_]/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
