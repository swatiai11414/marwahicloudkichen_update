import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { Utensils, ArrowLeft, Mail, Phone, MapPin } from "lucide-react";
import { SiInstagram, SiFacebook, SiX } from "react-icons/si";
import { Link } from "wouter";

export default function ContactPage() {
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

          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Contact Us
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            Have questions or feedback? We'd love to hear from you.
          </p>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  Get in Touch
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">Email</p>
                    <a href="mailto:khilesh11414@gmail.com" className="text-muted-foreground hover:text-primary transition-colors" data-testid="link-email">
                      khilesh11414@gmail.com
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">Phone</p>
                    <a href="tel:+917804871067" className="text-muted-foreground hover:text-primary transition-colors" data-testid="link-phone">
                      +91 7804871067
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">Address</p>
                    <p className="text-muted-foreground">
                      India
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Follow Us</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Stay connected with us on social media for updates and announcements.
                </p>
                <div className="flex flex-col gap-3">
                  <a 
                    href="https://www.instagram.com/khileshwhite" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors hover-elevate"
                    data-testid="link-instagram"
                  >
                    <SiInstagram className="h-5 w-5 text-pink-500" />
                    <span>Instagram</span>
                  </a>
                  <a 
                    href="https://www.facebook.com/khileshwhite/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors hover-elevate"
                    data-testid="link-facebook"
                  >
                    <SiFacebook className="h-5 w-5 text-blue-600" />
                    <span>Facebook</span>
                  </a>
                  <a 
                    href="https://x.com/khilesh25321781" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors hover-elevate"
                    data-testid="link-twitter"
                  >
                    <SiX className="h-5 w-5" />
                    <span>X (Twitter)</span>
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
