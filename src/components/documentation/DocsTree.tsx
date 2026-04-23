"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ChevronDown, ChevronRight, FileText, Folder } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DocCategory } from "@/lib/docs/loadDocs";

interface DocsTreeProps {
  categories: DocCategory[];
}

/**
 * Sidebar de navigation pour la documentation. Catégories accordéon
 * (ouvertes par défaut), sections sous-pliables, fichiers cliquables.
 */
export function DocsTree({ categories }: DocsTreeProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeFile = searchParams.get("file");

  return (
    <nav className="space-y-1 text-sm">
      {categories.map((category) => (
        <CategoryNode
          key={category.title}
          category={category}
          activeFile={activeFile}
          pathname={pathname}
        />
      ))}
    </nav>
  );
}

interface CategoryNodeProps {
  category: DocCategory;
  activeFile: string | null;
  pathname: string;
}

function CategoryNode({ category, activeFile, pathname }: CategoryNodeProps) {
  const [open, setOpen] = useState(true);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-accent text-left font-semibold"
      >
        {open ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
        <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="truncate">{category.title}</span>
      </button>

      {open && (
        <div className="pl-4 mt-1 space-y-0.5">
          {category.rootFiles.map((file) => (
            <FileLink
              key={file.relativePath}
              relativePath={file.relativePath}
              label={prettifyFileName(file.name)}
              activeFile={activeFile}
              pathname={pathname}
            />
          ))}

          {category.sections.map((section) => (
            <SectionNode
              key={section.pathPrefix}
              section={section}
              activeFile={activeFile}
              pathname={pathname}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface SectionNodeProps {
  section: DocCategory["sections"][number];
  activeFile: string | null;
  pathname: string;
}

function SectionNode({ section, activeFile, pathname }: SectionNodeProps) {
  // Ouvert par défaut si la sélection courante est dans cette section
  const [open, setOpen] = useState(
    activeFile?.startsWith(section.pathPrefix) ?? false
  );

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 w-full px-2 py-1 rounded hover:bg-accent text-left text-muted-foreground"
      >
        {open ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
        <span className="truncate">{section.title}</span>
        <span className="ml-auto text-xs opacity-60">{section.files.length}</span>
      </button>

      {open && (
        <div className="pl-4 mt-0.5 space-y-0.5">
          {section.files.map((file) => (
            <FileLink
              key={file.relativePath}
              relativePath={file.relativePath}
              label={prettifyFileName(file.name)}
              activeFile={activeFile}
              pathname={pathname}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface FileLinkProps {
  relativePath: string;
  label: string;
  activeFile: string | null;
  pathname: string;
}

function FileLink({ relativePath, label, activeFile, pathname }: FileLinkProps) {
  const isActive = activeFile === relativePath;
  return (
    <Link
      href={`${pathname}?file=${encodeURIComponent(relativePath)}`}
      className={cn(
        "flex items-center gap-2 px-2 py-1 rounded text-xs",
        isActive
          ? "bg-primary text-primary-foreground font-medium"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
      scroll={false}
    >
      <FileText className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  );
}

function prettifyFileName(name: string): string {
  if (name.toLowerCase() === "readme") return "Vue d'ensemble";
  return name.replace(/[-_]/g, " ");
}
