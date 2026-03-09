import CategoryPage from "./CategoryPage";
import { useLanguage } from "@/i18n";

export default function DressesPage() {
  const { t } = useLanguage();
  return (
    <CategoryPage
      title={t.nav.dresses}
      subtitle={t.categoryPages.dressesSubtitle}
      categoryIds={[1]}
      heroImage="https://images.unsplash.com/photo-1595777457583-95e059d5bf08?w=1920&q=80&fit=crop"
    />
  );
}
