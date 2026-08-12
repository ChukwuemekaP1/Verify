import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, FileSearch, ScanLine, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { Logo } from "@/components/brand/logo";
import { Container } from "@/components/layout/container";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/common/form-field";

export const Route = createFileRoute("/")({
  component: LandingPage,
  head: () => ({
    meta: [
      { title: "Verifis — AI-Assisted Academic Certificate Verification" },
      {
        name: "description",
        content:
          "Verify academic certificates in seconds. Institutions issue, employers confirm, and every check is auditable.",
      },
      { property: "og:title", content: "Verifis — Academic Certificate Verification" },
      {
        property: "og:description",
        content:
          "AI-assisted verification of academic credentials for institutions, employers and accreditation bodies.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const capabilities = [
  {
    icon: ScanLine,
    title: "Document intake",
    body: "Certificates are read with OCR and structured into reviewable fields before a decision is made.",
  },
  {
    icon: ShieldCheck,
    title: "Institution-signed records",
    body: "Awarding institutions confirm authenticity from their own workspace — no email chains.",
  },
  {
    icon: FileSearch,
    title: "Auditable outcomes",
    body: "Every verification produces a reference that can be re-checked at any time.",
  },
];

function LandingPage() {
  const navigate = useNavigate();
  const [reference, setReference] = useState("");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-sm">
        <Container className="flex h-14 items-center justify-between gap-4">
          <Logo />
          <nav aria-label="Primary" className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <a href="#how-it-works">How it works</a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/verify">Verify Certificate</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/login">Sign in</Link>
            </Button>
          </nav>
        </Container>
      </header>

      <main className="flex-1">
        <section className="border-b border-border">
          <Container className="grid gap-12 py-16 sm:py-24 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="min-w-0">
              <p className="text-eyebrow text-muted-foreground">Credential integrity</p>
              <h1 className="text-display mt-4 text-foreground">
                Confirm an academic certificate without guessing.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
                Verifis pairs document intelligence with institution-signed records, so employers
                and registries get a definitive answer instead of a scanned PDF.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button size="lg" asChild>
                  <Link to="/verify">
                    Verify a certificate
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/login">
                    Sign in to your workspace
                  </Link>
                </Button>
              </div>
            </div>

            <div className="surface-panel p-6 shadow-sm sm:p-7">
              <h2 className="text-sm font-semibold text-foreground">Check a verification reference</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Enter the reference printed on the certificate or encoded in its QR code.
              </p>
              <form
                className="mt-5 space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (reference.trim()) {
                    navigate({ to: "/verify/result", search: { ref: reference.trim(), method: "reference" } });
                  }
                }}
                noValidate
              >
                <FormField
                  id="public-reference"
                  label="Verification reference"
                  hint="Format example: VRF-XXXX-XXXX"
                >
                  <Input
                    id="public-reference"
                    name="reference"
                    autoComplete="off"
                    placeholder="VRF-…"
                    value={reference}
                    onChange={(event) => setReference(event.target.value)}
                    aria-describedby="public-reference-hint"
                    className="font-mono"
                  />
                </FormField>
                <Button type="submit" className="w-full" disabled={!reference.trim()}>
                  Check reference
                </Button>
              </form>
            </div>
          </Container>
        </section>

        <section id="how-it-works" className="scroll-mt-16">
          <Container className="py-16 sm:py-20">
            <h2 className="text-title text-foreground">How verification works</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Three steps, one audit trail — from upload to a reference anyone can re-check.
            </p>

            <ol className="mt-10 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3">
              {capabilities.map((item, index) => (
                <li key={item.title} className="bg-card p-6">
                  <span className="text-eyebrow text-muted-foreground">
                    Step {String(index + 1).padStart(2, "0")}
                  </span>
                  <item.icon className="mt-4 size-5 text-primary" aria-hidden="true" />
                  <h3 className="mt-3 text-sm font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                </li>
              ))}
            </ol>
          </Container>
        </section>
      </main>

      <Footer />
    </div>
  );
}
