# VeriFlow Demo Credentials (Template)

> Copy this file to `DEMO_CREDENTIALS.md` and fill in the actual values after seeding.

## Local URLs

| Service  | URL                          |
|----------|------------------------------|
| Frontend | http://localhost:5173        |
| Backend  | http://localhost:4000        |
| API      | http://localhost:4000/api/v1 |
| Login    | http://localhost:5173/login  |
| Verify   | http://localhost:5173/verify |

---

## Super Admin

| Field    | Value                  |
|----------|------------------------|
| Email    | admin@veriflow.local   |
| Password | (set in backend .env)  |
| Login URL| http://localhost:5173/login |

---

## Demo Institutions

Each institution has an admin account created during seeding.

| Institution | Email               | Password (set in seed) |
|-------------|---------------------|------------------------|
| University of Nigeria, Nsukka | admin@unn.edu.ng    | (see seed script) |
| Nnamdi Azikiwe University     | admin@unizik.edu.ng | (see seed script) |
| University of Lagos           | admin@unilag.edu.ng | (see seed script) |

---

## Demo Verification

After seeding, test verification at http://localhost:5173/verify.

Use certificate numbers from the seed output to test valid verifications.
Use any fake number (e.g. `FAKE-0000`) to test invalid/not-found results.
