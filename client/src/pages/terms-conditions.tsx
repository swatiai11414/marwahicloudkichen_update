import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Utensils, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function TermsConditionsPage() {
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
            Terms & Conditions
          </h1>

          <div className="prose prose-gray dark:prose-invert max-w-none space-y-6">
            <p className="text-muted-foreground">
              Last updated: {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground">
                By accessing and using the HDOS (Hotel Digital Operating System) platform, you accept and agree 
                to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use our services.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">2. Services Description</h2>
              <p className="text-muted-foreground">
                HDOS provides a digital ordering platform that connects customers with partner restaurants and hotels. 
                Our services include:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>QR-based menu browsing and ordering</li>
                <li>Digital payment tracking</li>
                <li>Order management for businesses</li>
                <li>WhatsApp bill sharing</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">3. User Responsibilities</h2>
              <p className="text-muted-foreground">
                As a user of our platform, you agree to:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Provide accurate information when placing orders</li>
                <li>Not misuse the platform for fraudulent activities</li>
                <li>Respect the terms of individual partner establishments</li>
                <li>Not attempt to bypass security measures</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">4. Orders and Payments</h2>
              <p className="text-muted-foreground">
                When placing an order through HDOS:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Prices displayed are set by individual partner establishments</li>
                <li>Payment verification is required before order fulfillment</li>
                <li>Accepted payment modes include Cash and UPI</li>
                <li>Bills are generated upon payment confirmation</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">5. Cancellation and Refunds</h2>
              <p className="text-muted-foreground">
                Order cancellation and refund policies are determined by individual partner establishments. 
                Please contact the respective restaurant or hotel directly for cancellation requests.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">6. Intellectual Property</h2>
              <p className="text-muted-foreground">
                All content, logos, and trademarks displayed on HDOS are the property of their respective owners. 
                Unauthorized use is prohibited.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">7. Limitation of Liability</h2>
              <p className="text-muted-foreground">
                HDOS acts as a technology platform connecting customers with partner establishments. 
                We are not responsible for:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Quality of food or services provided by partner establishments</li>
                <li>Delays in order preparation or delivery</li>
                <li>Disputes between customers and partner establishments</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">8. Changes to Terms</h2>
              <p className="text-muted-foreground">
                We reserve the right to modify these terms at any time. Continued use of the platform 
                after changes constitutes acceptance of the new terms.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">9. Contact</h2>
              <p className="text-muted-foreground">
                For any questions regarding these Terms & Conditions, please visit our{" "}
                <Link href="/contact" className="text-primary hover:underline">Contact Page</Link>.
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
