import { useState, useMemo } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ProductCard } from "@/components/ui/ProductCard";
import { useProducts } from "@/hooks/use-products";
import { useLanguage } from "@/i18n";
import type { Product, ColorVariant } from "@shared/schema";

interface CategoryPageProps {
  title: string;
  subtitle: string;
  categoryIds: number[];
  heroImage: string;
}

export default function CategoryPage({ title, subtitle, categoryIds, heroImage }: CategoryPageProps) {
  const { data: products, isLoading } = useProducts();
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("newest");

  const categoryProducts = useMemo(() => {
    if (!products) return [];
    return products.filter(p => p.categoryId && categoryIds.includes(p.categoryId));
  }, [products, categoryIds]);

  const allColors = useMemo(() => {
    const colorSet = new Set<string>();
    categoryProducts.forEach(p => {
      const cv = (p as any).colorVariants as ColorVariant[] | undefined;
      if (cv && cv.length > 0) {
        cv.forEach(v => colorSet.add(v.name));
      } else {
        (p.colors || []).forEach(c => colorSet.add(c));
      }
    });
    return Array.from(colorSet).sort();
  }, [categoryProducts]);

  const filtered = useMemo(() => {
    let result = categoryProducts;
    if (search) {
      result = result.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
    }
    if (selectedColor) {
      result = result.filter(p => {
        const cv = (p as any).colorVariants as ColorVariant[] | undefined;
        const colors = cv && cv.length > 0 ? cv.map(v => v.name) : (p.colors || []);
        return colors.some(c => c.toLowerCase() === selectedColor.toLowerCase());
      });
    }
    if (sortBy === "price-low") {
      result = [...result].sort((a, b) => parseFloat(a.price.toString()) - parseFloat(b.price.toString()));
    } else if (sortBy === "price-high") {
      result = [...result].sort((a, b) => parseFloat(b.price.toString()) - parseFloat(a.price.toString()));
    } else if (sortBy === "newest") {
      result = [...result].sort((a, b) => (b.id || 0) - (a.id || 0));
    }
    return result;
  }, [categoryProducts, search, selectedColor, sortBy]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <section className="relative h-72 md:h-96 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src={heroImage} alt={title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/40" />
        </div>
        <div className="relative z-10 text-center text-white px-4">
          <h1 className="font-display text-3xl sm:text-4xl md:text-6xl font-bold mb-3 tracking-tight" data-testid="text-category-title">{title}</h1>
          <p className="text-sm sm:text-base md:text-lg font-light opacity-90 max-w-xl mx-auto" data-testid="text-category-subtitle">{subtitle}</p>
        </div>
      </section>

      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-6 sm:mb-10">
          <p className="text-muted-foreground text-sm" data-testid="text-product-count">
            {filtered.length} {t.shop.allProducts}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <input
              type="text"
              placeholder={t.shop.searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-b border-border bg-transparent px-2 py-2 focus:outline-none focus:border-primary transition-colors text-sm w-full sm:w-52"
              data-testid="input-category-search"
            />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border-b border-border bg-transparent px-2 py-2 focus:outline-none text-sm w-full sm:w-40"
              data-testid="select-sort"
            >
              <option value="newest">{t.shop.sortNewest || "Newest"}</option>
              <option value="price-low">{t.shop.sortPriceLow || "Price: Low to High"}</option>
              <option value="price-high">{t.shop.sortPriceHigh || "Price: High to Low"}</option>
            </select>
          </div>
        </div>

        {allColors.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            <button
              onClick={() => setSelectedColor("")}
              className={`text-xs px-3 py-1.5 border transition-colors ${!selectedColor ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground'}`}
              data-testid="button-all-colors"
            >
              {t.shop.allColors}
            </button>
            {allColors.map(color => (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                className={`text-xs px-3 py-1.5 border transition-colors ${selectedColor === color ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground'}`}
                data-testid={`button-filter-color-${color}`}
              >
                {color}
              </button>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-muted aspect-[3/4] mb-4"></div>
                <div className="h-4 bg-muted w-2/3 mb-2"></div>
                <div className="h-4 bg-muted w-1/4"></div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 sm:py-24 text-muted-foreground">
            <p data-testid="text-no-products">{t.shop.noProducts}</p>
            <button onClick={() => { setSearch(""); setSelectedColor(""); }} className="mt-4 text-primary uppercase tracking-widest text-sm font-semibold underline" data-testid="button-clear-filters">{t.shop.clearFilters}</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-6">
            {filtered.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
