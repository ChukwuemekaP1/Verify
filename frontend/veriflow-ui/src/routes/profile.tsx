import { createFileRoute } from "@tanstack/react-router";

import { FormField } from "@/components/common/form-field";
import { ProtectedRoute } from "@/components/common/protected-route";
import { SectionCard } from "@/components/common/section-card";
import { AppLayout, PageSection } from "@/components/layout/app-layout";
import { PageHeader } from "@/components/layout/page-header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
  head: () => ({
    meta: [
      { title: "Profile — Verifis" },
      {
        name: "description",
        content: "Manage your user profile, institution details and account password.",
      },
      { property: "og:title", content: "Profile — Verifis" },
      {
        property: "og:description",
        content: "User and institution profile settings for your Verifis account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function ProfilePage() {
  return (
    <AppLayout title="Profile" currentPath="/profile">
      <PageSection className="mx-auto max-w-4xl space-y-6">
        <PageHeader
          title="Profile"
          description="Your account details and the institution you represent."
          crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Profile" }]}
        />

        <Tabs defaultValue="user">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="user" className="flex-1 sm:flex-none">
              User profile
            </TabsTrigger>
            <TabsTrigger value="institution" className="flex-1 sm:flex-none">
              Institution
            </TabsTrigger>
            <TabsTrigger value="password" className="flex-1 sm:flex-none">
              Password
            </TabsTrigger>
          </TabsList>

          <TabsContent value="user" className="mt-5">
            <SectionCard title="User profile" description="Shown to colleagues in your workspace">
              <form
                className="space-y-6"
                onSubmit={(event) => {
                  event.preventDefault();
                }}
              >
                <div className="flex items-center gap-4">
                  <Avatar className="size-14">
                    <AvatarFallback className="text-sm">—</AvatarFallback>
                  </Avatar>
                  <Button type="button" variant="outline" size="sm">
                    Change photo
                  </Button>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField id="profile-first" label="First name" required>
                    <Input id="profile-first" autoComplete="given-name" />
                  </FormField>
                  <FormField id="profile-last" label="Last name" required>
                    <Input id="profile-last" autoComplete="family-name" />
                  </FormField>
                  <FormField id="profile-email" label="Email address" required>
                    <Input id="profile-email" type="email" autoComplete="email" />
                  </FormField>
                  <FormField id="profile-role" label="Role" hint="Assigned by your administrator">
                    <Input id="profile-role" disabled />
                  </FormField>
                </div>

                <div className="flex justify-end border-t border-border pt-5">
                  <Button type="submit">Save profile</Button>
                </div>
              </form>
            </SectionCard>
          </TabsContent>

          <TabsContent value="institution" className="mt-5">
            <SectionCard
              title="Institution profile"
              description="Details shown on verification results"
            >
              <form
                className="space-y-6"
                onSubmit={(event) => {
                  event.preventDefault();
                }}
              >
                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField id="inst-name" label="Institution name" className="sm:col-span-2">
                    <Input id="inst-name" />
                  </FormField>
                  <FormField id="inst-ref" label="Accreditation reference">
                    <Input id="inst-ref" className="font-mono" />
                  </FormField>
                  <FormField id="inst-country" label="Country">
                    <Input id="inst-country" autoComplete="country-name" />
                  </FormField>
                  <FormField id="inst-contact" label="Public contact email">
                    <Input id="inst-contact" type="email" />
                  </FormField>
                  <FormField id="inst-site" label="Website">
                    <Input id="inst-site" type="url" placeholder="https://" />
                  </FormField>
                </div>
                <FormField
                  id="inst-about"
                  label="About"
                  hint="Appears alongside verification results"
                >
                  <Textarea id="inst-about" rows={3} />
                </FormField>
                <div className="flex justify-end border-t border-border pt-5">
                  <Button type="submit">Save institution</Button>
                </div>
              </form>
            </SectionCard>
          </TabsContent>

          <TabsContent value="password" className="mt-5">
            <SectionCard title="Change password" description="Use at least 12 characters">
              <form
                className="max-w-md space-y-5"
                onSubmit={(event) => {
                  event.preventDefault();
                }}
              >
                <FormField id="current-password" label="Current password" required>
                  <Input id="current-password" type="password" autoComplete="current-password" />
                </FormField>
                <FormField
                  id="new-password"
                  label="New password"
                  hint="Mix letters, numbers and symbols"
                  required
                >
                  <Input id="new-password" type="password" autoComplete="new-password" />
                </FormField>
                <FormField id="confirm-password" label="Confirm new password" required>
                  <Input id="confirm-password" type="password" autoComplete="new-password" />
                </FormField>
                <div className="flex justify-end border-t border-border pt-5">
                  <Button type="submit">Update password</Button>
                </div>
              </form>
            </SectionCard>
          </TabsContent>
        </Tabs>
      </PageSection>
    </AppLayout>
  );
}
