import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Link } from "wouter";
import { type Product, type ColorVariant } from "@shared/schema";
import { useLanguage } from "@/i18n";

export function ProductCard({ product }: { product: Product }) {
  const { t } = useLanguage();
  const price = parseFloat(product.price.toString()).toFixed(2);
  const discountPrice = product.discountPrice ? parseFloat(product.discountPrice.toString()).toFixed(2) : null;

  const cv = (product as any).colorVariants as ColorVariant[] | undefined;
  const hasVariants = cv && cv.length > 0;

  const [activeColorIdx, setActiveColorIdx] = useState<number | null>(null);

  const allImages: string[] = useMemo(() => {
    if (hasVariants && activeColorIdx !== null && cv[activeColorIdx]) {
      const v = cv[activeColorIdx];
      return [v.mainImage, ...(v.images || [])].filter(Boolean);
    }
    const imgs: string[] = [];
    if (hasVariants) {
      cv.forEach(v => {
        if (v.mainImage) imgs.push(v.mainImage);
        (v.images || []).forEach(img => { if (img) imgs.push(img); });
      });
    } else {
      if (product.mainImage) imgs.push(product.mainImage);
      (product.images || []).forEach(img => { if (img) imgs.push(img); });
    }
    return imgs;
  }, [product, cv, hasVariants, activeColorIdx]);

  const displayImage = useMemo(() => {
    if (hasVariants && activeColorIdx !== null && cv[activeColorIdx]) {
      return cv[activeColorIdx].mainImage;
    }
    return product.mainImage;
  }, [product, cv, hasVariants, activeColorIdx]);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopCycle = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startCycle = useCallback(() => {
    if (allImages.length <= 1) return;
    stopCycle();
    intervalRef.current = setInterval(() => {
      setCurrentIdx(prev => (prev + 1) % allImages.length);
    }, 1200);
  }, [allImages.length, stopCycle]);

  useEffect(() => {
    if (isHovering && activeColorIdx === null) {
      setCurrentIdx(0);
      startCycle();
    } else {
      stopCycle();
      setCurrentIdx(0);
    }
    return stopCycle;
  }, [isHovering, activeColorIdx, startCycle, stopCycle]);

  const handleSwatchClick = (e: React.MouseEvent, idx: number) => {
    e.preventDefault();
    e.stopPropagation();
    stopCycle();
    if (activeColorIdx === idx) {
      setActiveColorIdx(null);
      setCurrentIdx(0);
    } else {
      setActiveColorIdx(idx);
      setCurrentIdx(0);
    }
  };

  const shownImages = activeColorIdx !== null ? allImages : allImages;
  const shownIdx = activeColorIdx !== null ? 0 : currentIdx;

  return (
    <Link href={`/product/${product.id}`} className="group block cursor-pointer" data-testid={`card-product-${product.id}`}>
      <div
        className="relative aspect-[3/4] overflow-hidden bg-secondary rounded-sm mb-2 sm:mb-4"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => { setIsHovering(false); if (activeColorIdx === null) setCurrentIdx(0); }}
      >
        {product.isNewArrival && (
          <div className="absolute top-2 start-2 sm:top-4 sm:start-4 z-10 bg-background text-foreground text-[10px] sm:text-xs uppercase tracking-widest px-2 py-0.5 sm:px-3 sm:py-1 font-semibold shadow-sm" data-testid={`badge-new-${product.id}`}>
            {t.product.new}
          </div>
        )}
        {discountPrice && (
          <div className="absolute top-2 end-2 sm:top-4 sm:end-4 z-10 bg-destructive text-destructive-foreground text-[10px] sm:text-xs uppercase tracking-widest px-2 py-0.5 sm:px-3 sm:py-1 font-semibold shadow-sm" data-testid={`badge-sale-${product.id}`}>
            {t.product.sale}
          </div>
        )}

        {activeColorIdx !== null ? (
          <img
            src={displayImage}
            alt={product.name}
            className="absolute inset-0 object-cover w-full h-full transition-opacity duration-500"
          />
        ) : (
          allImages.map((img, idx) => (
            <img
              key={idx}
              src={img}
              alt={product.name}
              className={`absolute inset-0 object-cover w-full h-full transition-opacity duration-500 ${idx === currentIdx ? "opacity-100" : "opacity-0"}`}
            />
          ))
        )}

        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300" />

        {allImages.length > 1 && activeColorIdx === null && (
          <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {allImages.map((_, idx) => (
              <span
                key={idx}
                className={`w-1.5 h-1.5 rounded-full transition-all ${idx === currentIdx ? "bg-white scale-125" : "bg-white/50"}`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="space-y-1 sm:space-y-1.5">
        <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">{product.brand || "Lucerne Boutique"}</div>
        <h3 className="font-medium text-foreground text-sm sm:text-lg leading-tight truncate">{product.name}</h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
            {discountPrice ? (
              <>
                <span className="font-semibold text-destructive text-sm sm:text-base" data-testid={`text-discount-price-${product.id}`}>₪{discountPrice}</span>
                <span className="text-xs sm:text-sm text-muted-foreground line-through" data-testid={`text-original-price-${product.id}`}>₪{price}</span>
              </>
            ) : (
              <span className="font-semibold text-sm sm:text-base" data-testid={`text-price-${product.id}`}>₪{price}</span>
            )}
          </div>
          {hasVariants && cv.length > 1 && (
            <div className="flex gap-1 sm:gap-1.5" data-testid={`swatches-${product.id}`}>
              {cv.map((v, idx) => (
                <button
                  key={idx}
                  onClick={(e) => handleSwatchClick(e, idx)}
                  className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 transition-all ${activeColorIdx === idx ? "border-primary scale-110 shadow-sm" : "border-border hover:border-primary/60"}`}
                  style={{ backgroundColor: v.colorCode }}
                  title={v.name}
                  data-testid={`swatch-${product.id}-${idx}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
