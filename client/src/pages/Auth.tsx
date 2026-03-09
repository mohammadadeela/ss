import { useState } from "react";
import { useLocation } from "wouter";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useLogin, useRegister, useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const { data: user } = useAuth();
  const [, setLocation] = useLocation();
  const login = useLogin();
  const register = useRegister();
  const { toast } = useToast();
  const { t } = useLanguage();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
  });

  if (user) {
    setLocation("/profile");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isLogin) {
        await login.mutateAsync({ email: formData.email, password: formData.password });
        toast({ title: t.auth.welcomeBackToast });
        setLocation("/profile");
      } else {
        await register.mutateAsync({ email: formData.email, password: formData.password, fullName: formData.fullName });
        toast({ title: t.auth.accountCreated || t.auth.welcomeBackToast });
        setLocation("/profile");
      }
    } catch (err: any) {
      toast({ title: t.auth.error, description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen flex flex-col pt-20">
      <Navbar />
      <main className="flex-1 flex items-center justify-center p-4 py-20 bg-muted/20">
        <div className="bg-card w-full max-w-md p-6 sm:p-8 md:p-12 shadow-2xl border border-border/50">
          <div className="text-center mb-8 sm:mb-10">
            <h1 className="font-display text-3xl sm:text-4xl mb-2" data-testid="text-auth-title">{isLogin ? t.auth.signIn : t.auth.createAccount}</h1>
            <p className="text-muted-foreground text-sm">
              {isLogin ? t.auth.welcomeBack : t.auth.joinUs}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="fullName">{t.auth.fullName}</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={e => setFormData({...formData, fullName: e.target.value})}
                  className="rounded-none h-12"
                  required
                  data-testid="input-fullname"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">{t.auth.email}</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                className="rounded-none h-12"
                required
                data-testid="input-email"
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="password">{t.auth.password}</Label>
              </div>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
                className="rounded-none h-12"
                required
                data-testid="input-password"
              />
            </div>

            <Button
              type="submit"
              disabled={login.isPending || register.isPending}
              className="w-full rounded-none h-12 uppercase tracking-widest text-sm font-semibold mt-4"
              data-testid="button-auth-submit"
            >
              {isLogin ? t.auth.signIn : t.auth.register}
            </Button>
          </form>

          <div className="mt-8 text-center text-sm text-muted-foreground">
            {isLogin ? t.auth.noAccount : t.auth.hasAccount}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-foreground font-semibold uppercase tracking-widest ms-1 hover:underline"
              data-testid="button-toggle-auth"
            >
              {isLogin ? t.auth.register : t.auth.signIn}
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
