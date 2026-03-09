import { useState, useMemo, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ProductCard } from "@/components/ui/ProductCard";
import { useProducts } from "@/hooks/use-products";
import { useCategories } from "@/hooks/use-categories";
import { useLanguage } from "@/i18n";
import { useSearch, useLocation } from "wouter";

export default function Shop() {
  const { data: products, isLoading } = useProducts();
  const { data: categories } = useCategories();
  const { t } = useLanguage();
  const searchParams = useSearch();
  const [, setLocation] = useLocation();

  const urlColor = new URLSearchParams(searchParams).get("color") || "";
  
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [selectedColor, setSelectedColor] = useState<string>(urlColor);

  useEffect(() => {
    setSelectedColor(urlColor);
  }, [urlColor]);

  const allColors = useMemo(() => {
    if (!products) return [];
    const colorSet = new Set<string>();
    products.forEach(p => {
      const cv = (p as any).colorVariants as Array<{name: string}> | undefined;
      if (cv && cv.length > 0) {
        cv.forEach(v => colorSet.add(v.name));
      } else {
        (p.colors || []).forEach(c => colorSet.add(c));
      }
    });
    return Array.from(colorSet).sort();
  }, [products]);

  const handleColorFilter = (color: string | null) => {
    if (color) {
      setSelectedColor(color);
      setLocation(`/shop?color=${encodeURIComponent(color)}`, { replace: true });
    } else {
      setSelectedColor("");
      setLocation("/shop", { replace: true });
    }
  };

  const filteredProducts = products?.filter(p => {
    if (selectedCategory && p.categoryId !== selectedCategory) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (selectedColor) {
      const cv = (p as any).colorVariants as Array<{name: string}> | undefined;
      const productColors = cv && cv.length > 0 ? cv.map(v => v.name) : (p.colors || []);
      if (!productColors.some(c => c.toLowerCase() === selectedColor.toLowerCase())) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen flex flex-col pt-20">
      <Navbar />
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="flex flex-col md:flex-row items-baseline justify-between mb-8 sm:mb-12">
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-semibold" data-testid="text-collection-title">{t.shop.collection}</h1>
          <div className="mt-4 md:mt-0 w-full md:w-auto flex flex-col sm:flex-row gap-4">
            <input 
              type="text" 
              placeholder={t.shop.searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-b border-border bg-transparent px-2 py-2 focus:outline-none focus:border-primary transition-colors text-sm w-full sm:w-64"
              data-testid="input-search"
            />
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-12">
          <aside className="w-full lg:w-64 flex-shrink-0">
            <div className="sticky top-28 space-y-8">
              <div>
                <h3 className="font-semibold uppercase tracking-widest text-sm mb-4">{t.shop.categories}</h3>
                <ul className="space-y-3">
                  <li>
                    <button 
                      onClick={() => setSelectedCategory(null)}
                      className={`text-sm hover:text-foreground transition-colors ${selectedCategory === null ? 'text-foreground font-medium' : 'text-muted-foreground'}`}
                      data-testid="button-all-products"
                    >
                      {t.shop.allProducts}
                    </button>
                  </li>
                  {categories?.map(cat => (
                    <li key={cat.id}>
                      <button 
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`text-sm hover:text-foreground transition-colors ${selectedCategory === cat.id ? 'text-foreground font-medium' : 'text-muted-foreground'}`}
                        data-testid={`button-category-${cat.id}`}
                      >
                        {cat.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              {allColors.length > 0 && (
                <div>
                  <h3 className="font-semibold uppercase tracking-widest text-sm mb-4">{t.shop.colors}</h3>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleColorFilter(null)}
                      className={`text-xs px-3 py-1.5 border transition-colors ${!selectedColor ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground hover:border-primary hover:text-foreground'}`}
                      data-testid="button-all-colors"
                    >
                      {t.shop.allColors}
                    </button>
                    {allColors.map(color => (
                      <button
                        key={color}
                        onClick={() => handleColorFilter(color)}
                        className={`text-xs px-3 py-1.5 border transition-colors ${selectedColor === color ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground hover:border-primary hover:text-foreground'}`}
                        data-testid={`button-filter-color-${color}`}
                      >
                        {color}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>

          <div className="flex-1">
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="bg-muted aspect-[3/4] mb-4"></div>
                    <div className="h-4 bg-muted w-2/3 mb-2"></div>
                    <div className="h-4 bg-muted w-1/4"></div>
                  </div>
                ))}
              </div>
            ) : filteredProducts?.length === 0 ? (
              <div className="text-center py-16 sm:py-24 text-muted-foreground">
                <p data-testid="text-no-products">{t.shop.noProducts}</p>
                <button onClick={() => {setSearch(""); setSelectedCategory(null); handleColorFilter(null);}} className="mt-4 text-primary uppercase tracking-widest text-sm font-semibold underline" data-testid="button-clear-filters">{t.shop.clearFilters}</button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-6">
                {filteredProducts?.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
