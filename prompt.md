# VeriFlow — Fix, Seed, Test & Deployment Preparation

You are working on the **existing VeriFlow project**.

```text
Verify/
├── backend/
└── frontend/
    └── veriflow-ui/
```

Backend: `Verify/backend`
Frontend: `Verify/frontend/veriflow-ui`

## OBJECTIVE

Make the existing VeriFlow application **fully testable locally**, fix the current blocking issues, create a realistic demo environment, and prepare the existing project for:

* GitHub
* Render backend deployment
* Vercel frontend deployment

**Do not rebuild the project. Do not redesign the architecture. Do not refactor working code.**

Work with the existing implementation and conventions.

The priority is:

```text
Fix what is broken
→ Create usable demo data
→ Test the important workflows
→ Prepare deployment
```

---

# 1. FIX THE CURRENT APPLICATION

The application currently has issues such as:

* `404 Not Found`
* `Failed to fetch`
* Vite unresolved imports
* possible frontend/backend route mismatches

Start by running the application and reproducing the actual problems.

Do **not** audit every endpoint or every file.

Only investigate code directly related to an actual failure or the workflows required for testing.

When a frontend action fails, trace:

```text
Frontend
→ API client
→ Backend route
→ Controller/service
→ Database
```

Find the actual cause and fix it.

### Important

Some endpoints and features are already working.

**Do not rewrite or re-test everything simply because it exists.**

If something is already working, leave it alone.

Do not create duplicate routes to hide a `404`.

Do not create duplicate services/components.

Do not replace working implementations.

Use the smallest appropriate fix.

---

# 2. VITE IMPORT ERRORS

There are currently unresolved imports such as:

```text
@/components/ui/toaster
```

Known affected routes include:

```text
src/routes/verify.index.tsx
src/routes/certificates.upload.tsx
```

Inspect the existing toast implementation first.

Determine whether:

* the file is missing
* the import path is incorrect
* the component was renamed
* another toast implementation already exists

Fix the existing implementation consistently.

Do not install another toast library unless absolutely necessary.

Run the frontend build after fixing the issue.

---

# 3. MONGOOSE WARNINGS

There are duplicate Mongoose index definitions involving:

```text
verificationReference
confidenceScore
```

Remove the duplicate definitions while preserving one correct index for each.

Do not modify unrelated schemas.

Confirm the warnings are resolved when the backend starts.

---

# 4. AUTHENTICATION

Ensure the existing authentication system works for:

### Super Admin

Use the existing Super Admin account if the seed/bootstrap system already creates it.

Expected account:

```text
admin@veriflow.local
```

### Institutions

Each demo institution must have its own working login credentials.

Verify only the authentication flow required to demonstrate the application:

```text
Login
→ authenticated session/token
→ dashboard
→ protected API request
```

Also ensure logout and page refresh behave correctly with the existing authentication mechanism.

**Do not weaken or bypass authentication just to make the demo work.**

---

# 5. CREATE A DEMO ENVIRONMENT

Use the project's **existing seed mechanism**.

Do not create a separate database architecture just for demo data.

Create **3 fictional/demo Nigerian universities**:

```text
University of Nigeria, Nsukka
Nnamdi Azikiwe University
University of Lagos
```

If these records already exist, reuse them instead of creating duplicates.

Each institution must have working login credentials.

Create **10 fictional/demo graduates**, distributed across the institutions.

Use realistic synthetic data only.

Populate the fields required by the existing Graduate schema, including where applicable:

* full name
* student/matriculation ID
* institution
* faculty
* department
* programme/degree
* graduation year
* certificate/reference number
* certificate status
* other required fields

Create certificate records where supported by the existing architecture.

The data should allow me to test:

* graduate listing
* graduate details
* graduate creation
* certificate issuance
* certificate lookup
* certificate verification
* valid verification
* invalid verification

The seed must be **idempotent**.

Running it multiple times must not create duplicate institutions, graduates, or certificates.

---

# 6. CREATE A LOCAL CREDENTIALS PACKAGE

This is important.

Create a dedicated local credentials area, for example:

```text
Verify/
└── .veriflow/
    └── credentials/
        └── DEMO_CREDENTIALS.md
```

The file must contain the actual credentials needed to test the seeded environment.

Include:

### Super Admin

```text
Email:
Password:
Login URL:
```

### Each Demo Institution

```text
Institution:
Email/Username:
Password:
Login URL:
```

Also include, where useful:

```text
Frontend URL:
Backend URL:
Demo verification examples:
```

The credentials file must be automatically excluded from Git.

Add the appropriate path to `.gitignore` if necessary.

**Never commit actual passwords, secrets, JWT secrets, MongoDB credentials, Cloudinary credentials, or API keys.**

The purpose of this file is to make local testing easy.

Also create/update a safe template if useful:

```text
.veriflow/credentials/DEMO_CREDENTIALS.example.md
```

The example file may be committed, but must contain placeholders only.

---

# 7. TEST THE IMPORTANT USER FLOWS

Do not test every endpoint individually.

Test the actual application from the user's perspective.

## Super Admin

```text
Login
→ Dashboard
→ authenticated functionality
```

## Institution

```text
Institution Login
→ Institution Dashboard
→ View Graduates
→ Create Graduate
→ View Graduate
→ Create/Issue Certificate
→ View Certificate
```

## Verification

Test one valid certificate:

```text
Certificate/reference
→ Verification
→ Correct successful result
```

Then test one invalid certificate/reference:

```text
Invalid certificate/reference
→ Verification
→ Correct invalid/not-found result
→ No frontend crash
```

If one of these flows exposes a backend/frontend contract problem, fix it.

If a feature is already working and passes testing, **do not unnecessarily modify it.**

---

# 8. DEPLOYMENT PREPARATION

Only prepare deployment after the critical local workflow works.

Do a **focused deployment check**, not a production-wide audit.

## Render Backend

Verify only what is required for deployment:

* `package.json`
* build/start commands
* `PORT`
* MongoDB Atlas connection
* Cloudinary configuration
* JWT/session secrets
* CORS
* production frontend origin
* environment variables
* API configuration

Remove hardcoded localhost dependencies from production configuration.

Ensure `.env.example` contains variable names/placeholders only.

Never commit secrets.

If `render.yaml` already exists, verify and correct it.

Create one only if genuinely useful.

---

# 9. VERCEL FRONTEND

Verify:

* Vite environment variables
* production API base URL
* build command
* output directory
* SPA routing if required
* no hardcoded production dependency on `localhost:4000`

The frontend must be able to communicate with the Render backend through environment configuration.

---

# 10. GITHUB PREPARATION

Keep the existing preferred structure:

```text
Verify/
├── backend/
└── frontend/
    └── veriflow-ui/
```

Prefer one repository containing both applications.

Expected deployment:

```text
GitHub
├── backend → Render
└── frontend/veriflow-ui → Vercel
```

Check only:

* `.gitignore`
* `.env` protection
* credentials protection
* `node_modules`
* build output
* basic README/deployment instructions

Do not create separate repositories.

Do not push to GitHub automatically unless explicitly instructed.

---

# 11. EFFICIENCY RULES

These rules are important.

### Do not:

* audit the entire codebase
* inspect every endpoint
* rewrite working features
* redesign the UI
* restructure the architecture
* replace authentication
* replace the database
* install unnecessary packages
* create duplicate routes
* create duplicate components
* create duplicate services
* refactor unrelated code
* fix hypothetical problems
* spend time explaining code that does not need changing

### Instead:

```text
Run it
→ Reproduce the problem
→ Find the cause
→ Fix it
→ Test it
→ Move on
```

**Prefer the smallest correct change over a cleaner rewrite.**

---

# 12. FINAL ACCEPTANCE

Before finishing, confirm that the following are actually working.

### Application

* Backend starts
* Frontend starts
* Frontend builds successfully
* No unresolved Vite imports
* MongoDB connects
* authentication works
* dashboards load
* critical workflows work

### Demo Environment

* 3 demo universities exist
* each has working credentials
* 10 demo graduates exist
* certificates exist where supported
* repeated seeding does not duplicate records
* valid verification works
* invalid verification is handled correctly

### Credentials

A local credentials file exists containing:

* Super Admin credentials
* all institution credentials
* relevant local URLs
* useful demo verification information

The credentials file is protected from Git.

### Deployment

* Render configuration is ready
* Vercel configuration is ready
* production API URL is configurable
* CORS can support the production frontend
* secrets are protected
* repository structure is ready

---

# FINAL RESPONSE

Return only:

## Root Causes Found

## Files Modified

## Fixes Applied

## Demo Credentials

Include the Super Admin and every institution's testing credentials.

## Demo Data

Brief summary of the 3 universities and 10 graduates.

## Tests Performed

Clearly state what was actually tested and whether it passed.

## Render Configuration

Only the required settings/environment variables.

## Vercel Configuration

Only the required settings/environment variables.

## GitHub Structure

## Git Commands

Give the exact commands I should run to commit and push the project.

## Remaining Blockers

If there are none, say:

```text
None.
```

**Never claim something works unless you actually tested it.**

**Do not give me a broad codebase audit or a long explanation. Focus on fixing, testing, and preparing the existing VeriFlow application.**
