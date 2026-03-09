import CategoryPage from "./CategoryPage";
import { useLanguage } from "@/i18n";

export default function ShoesPage() {
  const { t } = useLanguage();
  return (
    <CategoryPage
      title={t.nav.shoes}
      subtitle={t.categoryPages.shoesSubtitle}
      categoryIds={[4]}
      heroImage="https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=1920&q=80&fit=crop"
    />
  );
}
