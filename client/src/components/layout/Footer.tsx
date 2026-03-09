import { useLanguage } from "@/i18n";
import { SiInstagram, SiFacebook } from "react-icons/si";

export function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="bg-secondary text-secondary-foreground pt-16 pb-8 border-t border-border">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="col-span-1 md:col-span-2">
            <h2 className="font-display text-2xl tracking-widest font-semibold uppercase mb-6" data-testid="text-footer-logo">Lucerne Boutique</h2>
            <p className="text-muted-foreground text-sm max-w-sm leading-relaxed mb-6" data-testid="text-footer-description">
              {t.footer.description}
            </p>
            <div>
              <h3 className="font-display font-semibold uppercase tracking-widest mb-4 text-sm">{t.footer.followUs}</h3>
              <div className="flex gap-4">
                <a href="https://www.instagram.com/lucerne.boutique/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground transition-colors" aria-label="Instagram" data-testid="link-instagram">
                  <SiInstagram className="w-5 h-5" />
                </a>
                <a href="https://www.facebook.com/Lucerne.Boutique" target="_blank" rel="noopener noreferrer" className="text-muted-foreground transition-colors" aria-label="Facebook" data-testid="link-facebook">
                  <SiFacebook className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>
          <div>
            <h3 className="font-display font-semibold uppercase tracking-widest mb-6">{t.footer.shop}</h3>
            <ul className="space-y-4 text-sm text-muted-foreground">
              <li><a href="/shop" className="hover:text-foreground transition-colors">{t.footer.allProducts}</a></li>
              <li><a href="/new-arrivals" className="hover:text-foreground transition-colors">{t.footer.newArrivals}</a></li>
              <li><a href="/sales" className="hover:text-foreground transition-colors">{t.footer.sale}</a></li>
            </ul>
          </div>
          <div>
            <h3 className="font-display font-semibold uppercase tracking-widest mb-6">{t.footer.support}</h3>
            <ul className="space-y-4 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground transition-colors">{t.footer.faq}</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">{t.footer.shippingReturns}</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">{t.footer.contactUs}</a></li>
              <li><a href="/our-location" className="hover:text-foreground transition-colors">{t.footer.ourLocation}</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Lucerne Boutique. {t.footer.allRights}</p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <a href="#" className="hover:text-foreground transition-colors">{t.footer.privacyPolicy}</a>
            <a href="#" className="hover:text-foreground transition-colors">{t.footer.termsOfService}</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
