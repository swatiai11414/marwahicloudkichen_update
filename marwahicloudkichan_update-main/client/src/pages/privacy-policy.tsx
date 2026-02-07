import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Utensils, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <Utensils className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-display text-xl font-bold tracking-tight">HDOS</span>
            </div>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="pt-24 pb-12">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <Link href="/">
            <Button variant="ghost" size="sm" className="mb-6 gap-2" data-testid="button-back-home">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>

          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl mb-8">
            Privacy Policy
          </h1>

          <div className="prose prose-gray dark:prose-invert max-w-none space-y-6">
            <p className="text-muted-foreground">
              Last updated: {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">1. Information We Collect</h2>
              <p className="text-muted-foreground">
                We collect information you provide directly to us, such as when you place an order, 
                create an account, or contact us. This includes:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Name and phone number for order processing</li>
                <li>Order history and preferences</li>
                <li>Device information (browser, operating system) for analytics</li>
                <li>IP address (stored as a hashed value for privacy)</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">2. How We Use Your Information</h2>
              <p className="text-muted-foreground">
                We use the information we collect to:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Process and deliver your orders</li>
                <li>Send order confirmations via WhatsApp (if consented)</li>
                <li>Improve our services and user experience</li>
                <li>Analyze usage patterns to enhance our platform</li>
                <li>Prevent fraud and ensure security</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">3. Information Sharing</h2>
              <p className="text-muted-foreground">
                We do not sell, trade, or rent your personal information to third parties. 
                We may share your information with:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Partner restaurants/hotels to fulfill your orders</li>
                <li>Service providers who assist in our operations</li>
                <li>Law enforcement when required by law</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">4. Data Security</h2>
              <p className="text-muted-foreground">
                We implement appropriate security measures to protect your personal information, including:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Encrypted data transmission (HTTPS)</li>
                <li>Secure session management</li>
                <li>Rate limiting to prevent abuse</li>
                <li>Privacy-safe IP hashing</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">5. Cookies and Tracking</h2>
              <p className="text-muted-foreground">
                We use cookies and similar technologies to maintain your session and improve your experience. 
                These are essential for the functioning of our ordering system.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">6. Your Rights</h2>
              <p className="text-muted-foreground">
                You have the right to:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Access your personal information</li>
                <li>Request correction of inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Opt out of marketing communications</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">7. Contact Us</h2>
              <p className="text-muted-foreground">
                If you have any questions about this Privacy Policy, please contact us through our{" "}
                <Link href="/contact" className="text-primary hover:underline">Contact Page</Link>.
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
