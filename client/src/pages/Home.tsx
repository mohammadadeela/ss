import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ProductCard } from "@/components/ui/ProductCard";
import { useProducts } from "@/hooks/use-products";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { useLanguage } from "@/i18n";

export default function Home() {
  const { data: products, isLoading } = useProducts();
  const { t, language } = useLanguage();
  const Arrow = language === "ar" ? ArrowLeft : ArrowRight;

  const featured = products?.filter((p) => p.isFeatured).slice(0, 6) || [];
  const newArrivals = products?.filter((p) => p.isNewArrival).slice(0, 6) || [];
  const bestSellers =
    products
      ?.filter((p) => p.discountPrice)
      .sort((a, b) => (b.stockQuantity || 0) - (a.stockQuantity || 0))
      .slice(0, 6) || [];
  const onSale =
    products
      ?.filter(
        (p) => p.discountPrice && parseFloat(p.discountPrice.toString()) > 0,
      )
      .slice(0, 6) || [];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1">
        <section className="relative h-[80vh] sm:h-screen flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img
              src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1920&q=80&fit=crop"
              alt="Hero Fashion"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/30" />
          </div>

          <div className="relative z-10 text-center text-white px-4">
            <h1
              className="font-display text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-bold mb-4 sm:mb-6 tracking-tight text-balance"
              data-testid="text-hero-title"
            >
              {t.home.heroTitle}
            </h1>
            <p
              className="text-lg md:text-xl font-light mb-10 tracking-wide max-w-2xl mx-auto opacity-90"
              data-testid="text-hero-subtitle"
            >
              {t.home.heroSubtitle}
            </p>
            <Link href="/shop">
              <Button
                size="lg"
                className="bg-white text-black hover:bg-white/90 rounded-none px-10 py-6 text-sm uppercase tracking-widest"
                data-testid="button-shop-collection"
              >
                {t.home.shopCollection}
              </Button>
            </Link>
          </div>
        </section>

        <section className="py-12 sm:py-24 w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-8 sm:mb-12">
            <div>
              <h2
                className="font-display text-2xl sm:text-4xl font-semibold mb-2"
                data-testid="text-new-arrivals-title"
              >
                {t.home.newArrivals}
              </h2>
              <p className="text-muted-foreground">
                {t.home.newArrivalsSubtitle}
              </p>
            </div>
            <Link
              href="/new-arrivals"
              className="hidden md:flex items-center text-sm font-semibold hover:text-muted-foreground transition-colors uppercase tracking-widest"
              data-testid="link-view-all-new"
            >
              {t.home.viewAll} <Arrow className="w-4 h-4 ms-2" />
            </Link>
          </div>

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
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-6">
              {newArrivals.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
          <div className="mt-8 md:hidden flex justify-center">
            <Link href="/new-arrivals">
              <Button
                variant="outline"
                className="rounded-none uppercase tracking-widest w-full"
                data-testid="button-view-all-mobile"
              >
                {t.home.viewAll}
              </Button>
            </Link>
          </div>
        </section>

        {bestSellers.length > 0 && (
          <section className="bg-secondary py-12 sm:py-24">
            <div className="w-full px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-end mb-8 sm:mb-12">
                <div>
                  <h2
                    className="font-display text-2xl sm:text-4xl font-semibold mb-2"
                    data-testid="text-best-sellers-title"
                  >
                    {t.home.bestSellers}
                  </h2>
                  <p className="text-muted-foreground">
                    {t.home.bestSellersSubtitle}
                  </p>
                </div>
                <Link
                  href="/shop"
                  className="hidden md:flex items-center text-sm font-semibold hover:text-muted-foreground transition-colors uppercase tracking-widest"
                  data-testid="link-view-all-best"
                >
                  {t.home.viewAll} <Arrow className="w-4 h-4 ms-2" />
                </Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-6">
                {bestSellers.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </div>
          </section>
        )}

        {featured.length > 0 && (
          <section className="py-12 sm:py-24">
            <div className="w-full px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-end mb-8 sm:mb-12">
                <div>
                  <h2
                    className="font-display text-2xl sm:text-4xl font-semibold mb-2"
                    data-testid="text-featured-title"
                  >
                    {t.home.featured}
                  </h2>
                  <p className="text-muted-foreground">
                    {t.home.featuredSubtitle}
                  </p>
                </div>
                <Link
                  href="/shop"
                  className="hidden md:flex items-center text-sm font-semibold hover:text-muted-foreground transition-colors uppercase tracking-widest"
                  data-testid="link-view-all-featured"
                >
                  {t.home.viewAll} <Arrow className="w-4 h-4 ms-2" />
                </Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-6">
                {featured.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </div>
          </section>
        )}

        {onSale.length > 0 && (
          <section className="bg-white py-12 sm:py-24">
            <div className="w-full px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-end mb-8 sm:mb-12">
                <div>
                  <h2
                    className="font-display text-2xl sm:text-4xl font-semibold mb-2 text-destructive"
                    data-testid="text-sales-title"
                  >
                    {t.home.sales}
                  </h2>
                  <p className="text-muted-foreground">
                    {t.home.salesSubtitle}
                  </p>
                </div>
                <Link
                  href="/sales"
                  className="hidden md:flex items-center text-sm font-semibold hover:text-muted-foreground transition-colors uppercase tracking-widest"
                  data-testid="link-view-all-sales"
                >
                  {t.home.viewAll} <Arrow className="w-4 h-4 ms-2" />
                </Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-6">
                {onSale.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
