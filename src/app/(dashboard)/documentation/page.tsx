import { Suspense } from "react";
import { BookText, FileText } from "lucide-react";
import { listCategories, readDocFile } from "@/lib/docs/loadDocs";
import { DocsTree } from "@/components/documentation/DocsTree";
import { MarkdownViewer } from "@/components/documentation/MarkdownViewer";

interface DocumentationPageProps {
  searchParams: Promise<{ file?: string }>;
}

/**
 * Page de documentation projet — lit l'arborescence du submodule docs/ et
 * rend le fichier sélectionné via le query param ?file=...
 *
 * Server Component : accès direct au filesystem (Node.js runtime).
 */
export default async function DocumentationPage({ searchParams }: DocumentationPageProps) {
  const params = await searchParams;
  const categories = listCategories();

  const selectedRelativePath = params.file ?? "supabase/README.md";
  const content = readDocFile(selectedRelativePath);

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-6 p-6">
      {/* Sidebar arborescence */}
      <aside className="w-72 shrink-0 overflow-y-auto pr-2 border-r border-border">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
          <BookText className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Documentation</h2>
        </div>
        <Suspense fallback={<div className="text-sm text-muted-foreground">Chargement…</div>}>
          <DocsTree categories={categories} />
        </Suspense>
      </aside>

      {/* Viewer */}
      <main className="flex-1 overflow-y-auto">
        {content ? (
          <MarkdownViewer content={content} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
            <FileText className="h-12 w-12" />
            <p className="text-lg">Aucun fichier sélectionné</p>
            <p className="text-sm">
              Choisis un document dans la colonne de gauche pour le consulter.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
