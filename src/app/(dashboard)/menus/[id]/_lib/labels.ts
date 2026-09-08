import type { MenuItemWithDetails } from "@/types/database";

/**
 * D'où vient le descriptif de l'item. La distinction compte : un item lié tire
 * son nom du catalogue et n'est pas modifiable ici, un produit privé l'est.
 */
export const SOURCE_LABELS: Record<MenuItemWithDetails["source"], string> = {
  beer: "Catalogue bières",
  catalog: "Catalogue partagé",
  private: "Produit de l'établissement",
};
