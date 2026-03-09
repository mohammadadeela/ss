import CategoryPage from "./CategoryPage";
import { useLanguage } from "@/i18n";

export default function ClothesPage() {
  const { t } = useLanguage();
  return (
    <CategoryPage
      title={t.nav.clothes}
      subtitle={t.categoryPages.clothesSubtitle}
      categoryIds={[2, 3]}
      heroImage="https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?w=1920&q=80&fit=crop"
    />
  );
}
