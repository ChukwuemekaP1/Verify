import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { BadgeCheck, QrCode, ShieldCheck, Upload as UploadIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { FileUpload } from "@/components/common/file-upload";
import { FormField } from "@/components/common/form-field";
import { SectionCard } from "@/components/common/section-card";
import { Logo } from "@/components/brand/logo";
import { Container } from "@/components/layout/container";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { api } from "@/lib/api";
import type { ApiError } from "@/lib/api/http-client";
import { toast } from "sonner";

export const Route = createFileRoute("/verify/")({
  component: PublicVerifyPage,
  head: () => ({
    meta: [
      { title: "Verify a certificate — Verifis" },
      {
        name: "description",
        content:
          "Confirm the authenticity of an academic certificate using its number, an uploaded copy, or its QR code.",
      },
      { property: "og:title", content: "Verify a certificate — Verifis" },
      {
        property: "og:description",
        content: "Public certificate verification by number, document upload or QR code.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function PublicVerifyPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const [certificateNumber, setCertificateNumber] = useState("");
  const [surname, setSurname] = useState("");
  const [matricNumber, setMatricNumber] = useState("");
  const [numberLoading, setNumberLoading] = useState(false);
  const [numberError, setNumberError] = useState<string | null>(null);

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [qrFile, setQrFile] = useState<File | null>(null);
  const [qrReference, setQrReference] = useState("");
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);

  const uploadFileState = useMemo(() => (uploadFile ? { file: uploadFile } : null), [uploadFile]);
  const qrFileState = useMemo(() => (qrFile ? { file: qrFile } : null), [qrFile]);

  async function handleVerifyByNumber(e: React.FormEvent) {
    e.preventDefault();
    setNumberLoading(true);
    setNumberError(null);
    try {
      const result = await api.verifications.verifyByNumber({
        certificateNumber,
        surname: surname || undefined,
        matricNumber: matricNumber || undefined,
      });
      const ref =
        result?.data?.verification?.verificationReference ??
        result?.verification?.verificationReference;
      if (!ref) {
        setNumberError("Verification returned no reference. Try again.");
        return;
      }
      await router.navigate({
        to: "/verify/result",
        search: { ref, method: "number" },
      });
    } catch (err) {
      const msg = (err as ApiError).message || "Verification failed. Please try again.";
      setNumberError(msg);
      toast.error(msg);
    } finally {
      setNumberLoading(false);
    }
  }

  async function handleVerifyByUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadFile) {
      setUploadError("Select a certificate file first.");
      return;
    }
    setUploadLoading(true);
    setUploadError(null);
    try {
      const result = await api.verifications.verifyByUpload(uploadFile, {
        surname: surname || undefined,
        matricNumber: matricNumber || undefined,
      });
      const ref =
        result?.data?.verification?.verificationReference ??
        result?.verification?.verificationReference;
      if (!ref) {
        setUploadError("Verification returned no reference. Try again.");
        return;
      }
      await router.navigate({
        to: "/verify/result",
        search: { ref, method: "upload" },
      });
    } catch (err) {
      const msg = (err as ApiError).message || "Verification failed. Please try again.";
      setUploadError(msg);
      toast.error(msg);
    } finally {
      setUploadLoading(false);
    }
  }

  async function handleVerifyByQr(e: React.FormEvent) {
    e.preventDefault();
    if (!qrFile && !qrReference.trim()) {
      setQrError("Upload a QR image or enter a verification reference.");
      return;
    }
    setQrLoading(true);
    setQrError(null);
    try {
      const result = await api.verifications.verifyByQr(
        { reference: qrReference.trim() || undefined, fileName: qrFile?.name },
        qrFile || undefined,
      );
      const ref =
        result?.data?.verification?.verificationReference ??
        result?.verification?.verificationReference;
      if (!ref) {
        setQrError("Verification returned no reference. Try again.");
        return;
      }
      await router.navigate({
        to: "/verify/result",
        search: { ref, method: "qr" },
      });
    } catch (err) {
      const msg = (err as ApiError).message || "QR verification failed. Please try again.";
      setQrError(msg);
      toast.error(msg);
    } finally {
      setQrLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-sm">
        <Container className="flex h-14 items-center justify-between">
          <Link to="/" className="focus-ring rounded-md">
            <Logo />
          </Link>
          <Button variant="outline" size="sm" asChild>
            <Link to="/login">Institution sign in</Link>
          </Button>
        </Container>
      </header>

      <main className="flex-1 py-10 sm:py-14">
        <Container size="narrow" className="space-y-6">
          <div className="text-center">
            <span className="text-eyebrow text-muted-foreground">Public verification</span>
            <h1 className="text-title mt-3 text-foreground">Verify an academic certificate</h1>
            <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
              Check a credential against the issuing institution's records. Every check returns an
              auditable reference.
            </p>
          </div>

          <SectionCard title="Choose a verification method" bodyClassName="p-4 sm:p-5">
            <Tabs defaultValue="number">
              <TabsList className="w-full">
                <TabsTrigger value="number" className="flex-1">
                  Certificate number
                </TabsTrigger>
                <TabsTrigger value="upload" className="flex-1">
                  Upload document
                </TabsTrigger>
                <TabsTrigger value="qr" className="flex-1">
                  QR code
                </TabsTrigger>
              </TabsList>

              <TabsContent value="number" className="mt-5">
                <form className="space-y-5" onSubmit={handleVerifyByNumber}>
                  <FormField
                    id="certificate-number"
                    label="Certificate number"
                    hint="Printed on the certificate, usually near the seal"
                    required
                    error={numberError || undefined}
                  >
                    <Input
                      id="certificate-number"
                      value={certificateNumber}
                      onChange={(event) => setCertificateNumber(event.target.value)}
                      className="font-mono"
                      placeholder="e.g. CERT-0000-0000"
                    />
                  </FormField>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      id="graduate-surname"
                      label="Graduate surname"
                      hint="Used to confirm the record belongs to the holder"
                    >
                      <Input
                        id="graduate-surname"
                        name="surname"
                        autoComplete="family-name"
                        value={surname}
                        onChange={(e) => setSurname(e.target.value)}
                      />
                    </FormField>
                    <FormField id="graduate-matric" label="Matric number (optional)">
                      <Input
                        id="graduate-matric"
                        name="matricNumber"
                        className="font-mono"
                        value={matricNumber}
                        onChange={(e) => setMatricNumber(e.target.value)}
                      />
                    </FormField>
                  </div>
                  <Button type="submit" className="w-full sm:w-auto" disabled={numberLoading}>
                    <BadgeCheck aria-hidden="true" />
                    {numberLoading ? "Verifying…" : "Verify certificate"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="upload" className="mt-5">
                <form className="space-y-5" onSubmit={handleVerifyByUpload}>
                  <FileUpload
                    label="Upload the certificate"
                    hint="PDF, PNG or JPG"
                    maxSizeMb={10}
                    onFilesSelected={(files) => setUploadFile(files[0] ?? null)}
                    controlledValue={uploadFileState}
                    error={uploadError || undefined}
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField id="upload-surname" label="Graduate surname (optional)">
                      <Input
                        id="upload-surname"
                        name="surname"
                        value={surname}
                        onChange={(e) => setSurname(e.target.value)}
                      />
                    </FormField>
                    <FormField id="upload-matric" label="Matric number (optional)">
                      <Input
                        id="upload-matric"
                        name="matricNumber"
                        className="font-mono"
                        value={matricNumber}
                        onChange={(e) => setMatricNumber(e.target.value)}
                      />
                    </FormField>
                  </div>
                  <Button type="submit" className="w-full sm:w-auto" disabled={uploadLoading}>
                    <UploadIcon aria-hidden="true" />
                    {uploadLoading ? "Analysing & verifying…" : "Verify certificate"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="qr" className="mt-5">
                <form className="space-y-5" onSubmit={handleVerifyByQr}>
                  <FileUpload
                    label="Upload a QR code image"
                    hint="PNG or JPG"
                    maxSizeMb={5}
                    onFilesSelected={(files) => setQrFile(files[0] ?? null)}
                    controlledValue={qrFileState}
                    error={qrError || undefined}
                  />
                  <FormField
                    id="qr-reference"
                    label="Or enter verification reference"
                    hint="Printed next to the QR code on the certificate"
                  >
                    <Input
                      id="qr-reference"
                      className="font-mono"
                      value={qrReference}
                      onChange={(e) => setQrReference(e.target.value)}
                      placeholder="e.g. V1XYZ012ABC"
                    />
                  </FormField>
                  <Button type="submit" className="w-full sm:w-auto" disabled={qrLoading}>
                    <QrCode aria-hidden="true" />
                    {qrLoading ? "Verifying QR…" : "Verify via QR"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </SectionCard>

          <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            Verification results reflect the awarding institution's own records.
          </p>
        </Container>
      </main>

      <Footer />
    </div>
  );
}
