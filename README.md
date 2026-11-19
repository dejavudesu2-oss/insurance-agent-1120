# HK InsureHub Pro · 香港持牌保險顧問全市場工作系統

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6.svg)](tsconfig.json)
[![HKIA Compliance](https://img.shields.io/badge/HKIA-GL16_%7C_GL28_%7C_GL30-0B172A.svg)](#6-stage-advisor-architecture)

**HK InsureHub Pro** is a full-stack bilingual (`繁體中文` / `简体中文` / `English`) advisory, actuarial comparison, straight-through processing (STP), post-sale servicing, and HKIA regulatory compliance workbench engineered for Hong Kong Licensed Insurance Intermediaries (Broker Technical Representatives & Tied Agents).

Styled with the **Victoria Harbour Private Wealth** (`#060D18` deep harbour navy + `#D4AF37` champagne gold) executive system, it unifies client discovery, whole-market product comparison across **46 authorized Hong Kong insurers (250+ plans)**, modular dual-currency rider carts, mobile proposal microsites with scannable ISO/IEC 18004 QR codes, STP e-signature, and post-sale lifecycle servicing.

---

## 6-Stage Advisor Architecture (`01A` – `06`)

| Stage | Sub-Modules | Key Capabilities |
| :--- | :--- | :--- |
| **Stage 01 · Client Discovery & CRM** | `1A` Profile & 6-Axis Gap Radar<br/>`1B` CRM Stage Funnel, GL30 FNA & OCR | • **6-Axis Protection Gap Radar** + Family Household roll-up<br/>• **Instant CRM Search** by Client Name (EN/ZH), In-Force Policy ID (`HK-POL-*`), Existing Policy ID, or STP Ref<br/>• **Consultant Client Notes** with Voice/Transcript AI Structuring & Actionable Follow-Up Tasks<br/>• **HKID / MCV Entry Slip OCR** & iAM Smart e-KYC verification |
| **Stage 02 · Whole-Market Actuarial Lab** | `2A` Whole-Market Comparator<br/>`2B` Policy Clause AI & 5-Axis Radar<br/>`2C` 567 Withdrawal, HIBOR Matrix & 3-Gen | • **250+ HK Insurance Plans** with 3-Plan Color-Coded Comparison (`Red / Blue / Yellow`) & GN16 fulfillment stress tests<br/>• **AI Link Verification Sub-Agent** for official insurer brochures & GN16 fulfillment pages<br/>• **Custom "567" Partial Withdrawal Simulator** through Age 100<br/>• **2D HIBOR / SOFR × Crediting Rate Sensitivity Matrix** for HNW Premium Financing<br/>• **3-Generation Family & Beneficiary Tree** (Contingent Owner + Successor Insured + 100% Beneficiary validation) |
| **Stage 03 · Dual-FX Cart & Hospital LOG** | `3A` Dual-FX Rider Cart & Claim Stress<br/>`3B` Private Hospital LOG & Tax Trio | • Plan-matched **Modular Rider Cart** (`HKD / USD / RMB`) synced across Stages `01–05`<br/>• **Private Hospital Cashless Pre-Approval (LOG) Pass** matched to active medical plan tier, Surgeon P50/P90 benchmarks & VHIS/QDAP/TVC tax calculator |
| **Stage 04 · Pitch Deck & Client Microsite** | `4A` 5-Slide Visual Case Deck + PDF<br/>`4B` Objection Roleplay & Sub-Agents<br/>`4C` Interactive Client Microsite + QR | • **1-Click Executive Summary PDF** export from the 5-slide briefing deck<br/>• **Scannable Proposal QR Generator** + mobile vertical card layout with sticky CTA<br/>• **2-Way Client Interactive Reply** (payment mode, preferred signing slot & questions synced back to CRM) |
| **Stage 05 · STP e-Sign, Servicing & HKIA** | `5A` Proposal Sign-Off & Submission<br/>`5B` Google Drive Vault<br/>`5C` Renewal, LOG Claims & Endorsements<br/>`5D` HKIA CPD, Audit Dossier & Handover | • **HKIA GL16 / GL28 / GL30 Pre-Submission Gate** + HTML5 e-Signature & PDF policy pack<br/>• **Policy Anniversary, Renewal & 30-Day Grace Calendar** + 1-click bilingual WhatsApp reminders<br/>• **Cashless LOG Claims Concierge Kanban** & **Multi-Currency Endorsement Wizard**<br/>• **HKIA 15-Hour CPD Tracker** (with `>= 3h` mandatory Ethics/Regulations check)<br/>• **1-Click HKIA Inspection Audit Dossier PDF** & **Multi-Role Cloud Case Handover** (`Advisor ⇄ UW Assistant ⇄ Compliance Officer`) |
| **Stage 06 · 32 Pro Calculators** | `FN-01..08` & `IMP-01..20` | • 32 specialized HNW, MCV cross-border, tax, savings, and practice ROI tools that pin snapshots directly to any client file |

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4 (`@tailwindcss/vite`), Lucide Icons, custom SVG actuarial charts, ISO/IEC 18004 QR generator (`qrcode`), client/server PDF synthesis (`pdf-lib`), PWA offline indicator.
- **Backend (`server.ts`)**: Express + Vite middleware (dev) / static SPA serving (prod), REST endpoints for workspace sync, microsite read receipts & 2-way client feedback, live FX & promo governance, multi-role agency handovers, Cloud Vision OCR, and server-side `@google/genai` routes with deterministic fallbacks.
- **Testing**: Deterministic pure-domain unit tests powered by Node's built-in test runner (`node:test` + `tsx`).

---

## Getting Started Locally

### 1. Prerequisites
- **Node.js 20+** (Node 22 LTS recommended)
- **npm 10+**

### 2. Clone & Install
```bash
git clone <your-github-repo-url>
cd hk-insurehub-pro
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env` and add your keys (all core deterministic calculators, CRM search, PDF generators, and seed workflows run out-of-the-box even before keys are configured):
```bash
cp .env.example .env
```

### 4. Start the Full-Stack Dev Server (Port 3000)
```bash
npm run dev
```
Open `http://localhost:3000` in your browser. Press `Cmd/Ctrl + K` anywhere to open the Global Command Palette.

---

## Verification, Testing & Production Build

```bash
# 1. TypeScript strict typecheck
npm run lint

# 2. Run all deterministic domain, actuarial, CRM search & compliance unit tests
npm test

# 3. Build optimized production frontend bundle into dist/
npm run build

# 4. Run production server
NODE_ENV=production npm start
```

---

## Firebase Auth, Google Drive Cloud Backup & Firebase Hosting Deployment

### 1. Clean Two-File Firebase & Google Drive Backup Architecture
- **`src/firebase.ts`**: Single source of truth initializing Firebase (`initializeApp`), exporting `auth = getAuth(app)` and `googleProvider = new GoogleAuthProvider()` pre-configured with `https://www.googleapis.com/auth/drive.appdata` (private `appDataFolder` cloud backup) and `https://www.googleapis.com/auth/drive.file` (`/HK InsureHub Pro` PDF & dossier sync). Reads `import.meta.env.VITE_FIREBASE_*` with automatic fallback to `firebase-applet-config.json`.
- **`src/components/LoginButton.tsx`**: Reusable Google Sign-In & Cloud Backup button (`signInWithPopup(auth, googleProvider)` + `GoogleAuthProvider.credentialFromResult(result)`) embedded on the **Harbour Family Office Cinema** landing page and inside **Stage 05B (Cloud Sync)**.

### 2. Deploy Live to Firebase Hosting (`hk-is-pro`)
`firebase.json` (SPA rewrites + immutable `/assets/**` caching) and `.firebaserc` (`default: hk-is-pro`) are pre-configured out of the box:

```bash
# 1. Authenticate Firebase CLI once on your machine
npx firebase-tools login

# 2. Build production bundle (dist/) and deploy to https://hk-is-pro.web.app
npm run deploy:firebase
```

> **Enable Google Sign-In Domain on Firebase Console**: After deploying, ensure your custom domain or `hk-is-pro.web.app` / `hk-is-pro.firebaseapp.com` is listed under **Firebase Console → Authentication → Settings → Authorized domains**, and **Google** sign-in provider is enabled under **Sign-in method**.

---

## Pushing to GitHub (Automated CI & Firebase Hosting CD)

1. Export or clone this workspace locally (or use AI Studio's built-in **Export to GitHub** action).
2. Verify `.env` and `.data/` are untracked (`git status` — protected via `.gitignore`).
3. Push to `main`:
   - `.github/workflows/ci.yml` runs `npm ci`, `npm run lint`, `npm test`, and `npm run build` on every push/PR.
   - `.github/workflows/firebase-hosting.yml` automatically deploys `dist/` to Firebase Hosting whenever `FIREBASE_SERVICE_ACCOUNT_HK_IS_PRO` is configured in GitHub Repository Secrets.

---

## License

Licensed under the [Apache License 2.0](LICENSE).

