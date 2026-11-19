export const MASTER_GUIDE_TITLE = 'HK InsureHub Pro — Master Architecture, Regulatory Compliance & Operations Guide';

export const MASTER_GUIDE_FILENAME = 'HK_InsureHub_Pro_Master_Guide.md';

export const MASTER_GUIDE_MARKDOWN = `# HK InsureHub Pro — Complete Platform & HKIA Compliance Guide

## 1. Executive Summary
**HK InsureHub Pro** is an all-in-one Hong Kong Insurance Intermediary Operating System built for **Licensed Insurance Brokers (Technical Representatives)** and **Individual Tied Insurance Agents**. It unifies:
1. **Whole-of-Market Plan Aggregation & Actuarial Comparison** across Participating Savings (儲蓄分紅), Critical Illness (多重危疾), VHIS Flexi Medical (自願醫保), QDAP Tax-Deductible Annuities (合資格延期年金), and Pure Term Life.
2. **HK-Localized Lead Management & WhatsApp CRM** with dedicated workflows for both **Hong Kong Residents** and **Mainland Chinese Visitors (MCV / 內地訪港旅客)**.
3. **Bilingual Policy Provision Copilot (RAG)** delivering clause-cited comparisons in Traditional Chinese (繁體中文) and English with zero hallucination.
4. **Compliance-Gated Straight-Through Processing (STP) Policy Generation** producing downloadable and Google-Drive-synced bilingual PDF Application & Benefit Illustration packages stamped with biometric/canvas client e-signatures.

---

## 2. Mandatory Hong Kong Insurance Authority (HKIA) Regulatory Guardrails

### 2.1 Tied Agents vs. Licensed Insurance Brokers (RBAC Enforcement)
- **Individual Insurance Agents (持牌個人保險代理)**: Under the Insurance Ordinance (Cap. 41), tied agents represent their appointing insurer(s) and are restricted to a **maximum of 4 insurers**, of which **no more than 2 may be Long-Term (Life) insurers**. In HK InsureHub Pro, Tied Agents can view all-market plans strictly for internal competitive benchmarking, while **STP policy submission is hard-locked** to their appointed principal(s).
- **Insurance Brokers / Technical Representatives (持牌保險經紀業務代表)**: Represent the policyholder and are authorized to compare, advise, and submit applications across the entire Hong Kong insurance market.

### 2.2 Participating Policy Illustration Rate Caps (Effective 1 July 2025 / 2026 Practice Note)
To prevent overly aggressive dividend projections on Participating (分紅) policies, HKIA caps the maximum illustrated Internal Rate of Return (IRR) in Benefit Illustrations:
- **HKD-Denominated Participating Policies**: Capped at **6.00% p.a.**
- **Non-HKD Participating Policies (USD, RMB, GBP, AUD, CAD, etc.)**: Capped at **6.50% p.a.**
- **Mandatory Fulfillment Ratio Disclosure (分紅實現率)**: Historical fulfillment ratios and explicit separation of **Guaranteed Cash Value (保證現金價值)** vs. **Non-Guaranteed Terminal/Reversionary Bonus (非保證紅利)** are displayed side-by-side on every quote and exported PDF.

### 2.3 Guideline GL30: Financial Needs Analysis (FNA) & Risk Profile Questionnaire (RPQ)
- No Long-Term life, critical illness, participating savings, or annuity application can be generated until the client completes and signs a **GL30 Financial Needs Analysis**.
- The platform automatically evaluates **Monthly Disposable Surplus Affordability**: if proposed monthly premiums exceed **50% of monthly net surplus**, an underwriting justification alert cites the client's verified liquid asset reserve.

### 2.4 Guideline GL16 Section 7.4: Retirement Horizon Suitability
- Whenever \`Client Current Age + Premium Payment Term > Planned Retirement Age\`, the engine triggers a **GL16 Sec 7.4 Suitability Alert** and embeds the client's documented post-retirement funding source (e.g., MPF, rental income, liquid bond ladder) into the compliance audit log.

### 2.5 Cross-Border MCV (內地訪港旅客) Onshore Signing Compliance
- All MCV policies must be solicited and signed **physically onshore within HKSAR**.
- For MCV leads, STP submission requires scanning and verifying the **Hong Kong Immigration Department Landing Slip (入境標籤)** via Vision OCR to record entry date, travel document number, and permitted stay expiry.

---

## 3. Core Operating Workflows in This Application

### Workflow A — All-Market Plan Comparison & Surrender Projection
1. Open **01. Market Plans** from the left navigation sidebar.
2. Switch policy currency (**USD / HKD / RMB**), adjust **Sum Assured**, and choose **Payment Horizon (5 / 10 / 15 / 20 / 25 Years)**.
3. Observe real-time premium recalculation, HKIA IRR Cap clamping (e.g., raw 7.1% clamped to 6.5% USD or 6.0% HKD), and VHIS / QDAP HK Salaries Tax savings estimates (up to HK$8,000 for VHIS; HK$60,000 for QDAP).
4. Select 2 to 4 plans using **Compare Plan** to inspect the **10 / 15 / 20 / 30-Year Guaranteed vs. Non-Guaranteed Surrender Value Matrix**, and export a **Client Comparison Proposal PDF**.

### Workflow B — Lead CRM, Digital GL30 FNA & RNCamera + Google Cloud Vision Onboarding
1. Open **02. Lead CRM & FNA** to manage your client pipeline across \`New Lead -> FNA Completed -> Proposal Sent -> Underwriting -> In-Force\`.
2. Click **Scan Physical ID / 入境標籤** (or **Scan ID with Camera** inside **Add Client Lead**) to launch the \`react-native-camera\` (\`<RNCamera />\`) viewfinder with rear/front camera switching, torch control, ISO/IEC 7810 ID-1 card framing, and specimen card staging.
3. Capturing a frame invokes \`takePictureAsync({ base64: true })\` and posts to \`/api/kyc/ocr\`, running **Google Cloud Vision API (\`DOCUMENT_TEXT_DETECTION\` with \`zh-Hant\` + \`en\` hints)** and **HKSAR Modulus-11 HKID check-digit validation** to auto-populate \`fullNameEn\`, \`fullNameZh\`, \`hkidNumber\`, \`age\`, \`residency\`, and MCV onshore stay dates directly into the Lead CRM.
4. Click **Complete GL30 FNA** on any lead to record monthly income, expenses, liquid assets, risk tolerance, and post-retirement funding sources.

### Workflow C — Bilingual Policy Clause Copilot (RAG)
1. Open **03. Policy Clauses AI** to compare intricate medical and actuarial definitions across insurers (e.g., *Carcinoma-in-situ 原位癌 waiting periods*, *VHIS unknown pre-existing condition scales*, *currency switch & policy split clauses*).
2. Add custom insurer brochure text or clauses directly into the workspace corpus using **Add Custom Brochure Clause**.

### Workflow D — Automated STP Policy Generation & WhatsApp Dispatch
1. Open **04. Auto-Policy STP** to review the real-time **HKIA 5-Point Compliance Gate**.
2. Capture the client's handwritten signature on the interactive **Touch / Apple Pencil / Mouse Signature Pad**.
3. Click **Generate Bilingual Policy PDF** to create a tamper-evident PDF package containing applicant details, HKIA-capped benefit illustrations, GL30/GL16 audit disclosures, and the embedded client signature stamp.
4. Dispatch the proposal/confirmation message directly to the client's WhatsApp or upload the PDF straight to **Google Drive**.

### Workflow E — Google Drive Cloud Sync
1. Open **05. Google Drive & Guide** and sign in with your Google account.
2. Click **Save Master Guide to Google Drive** to store this complete Markdown reference inside an automatically organized \`HK InsureHub Pro\` folder in your Google Drive.
3. Click **Sync Workspace Backup to Google Drive** or upload any generated STP Policy PDF directly to your Drive folder, with full version overwrite protection.

### Workflow F — Market Intel, 13 HK Private Hospitals Cashless LOG & Live Google Search Grounding (InsurIntel HK Integration)
1. **30+ Flagship Plans Across 20+ HK Insurers + Live Google Search Discovery**: In **01. Market Plans**, filter across 20+ Hong Kong insurers (AIA, Prudential, Manulife, FWD, Sun Life, AXA, HSBC Life, BOC Life, CTF Life 周大福人壽, Chubb Life 安達人壽, China Life Overseas, YF Life, Generali, China Taiping, Blue Cross, Bupa, Cigna, Bowtie, Blue, Zurich) and 6 categories including **Universal Life (萬用壽險 / 保費融資)**. Click **Live Google Search Plans** to query real-time web disclosures via Gemini Google Search Grounding (\`/api/market/live-search\`) and 1-click import newly discovered plans into your catalog.
2. **External Client Safe Mode Lock (見客匿名合規鎖)**: Toggle **Client Safe Mode** during café/iPad meetings to automatically anonymize non-appointed competitor names into neutral \`Market Peer A / 同業保司 A\` labels, and inspect separated **Guaranteed Breakeven (~Yr 18–22)** vs. **Total Illustrated Breakeven (~Yr 5–8)** metrics.
3. **13 Cap. 633 Private Hospitals Cashless LOG Matrix & GN16 Registry**: Open **06. Market Intel & LOG** to inspect zero-deposit Cashless LOG vs. HK$20k–$70k cash admission deposits across all 13 HK private hospitals, verify 16 official HKIA GN16 insurer fulfillment portals, calculate IRD Cap. 112 s.26ZZD progressive salaries tax savings (HK$60k single / HK$120k married QDAP + VHIS), and model SaaS practice unit economics (\`cost_model.json\` v4.0.0).

---

## 4. Production Deployment Reference (Cloud Run / AWS ap-east-1 Hong Kong)
- **Runtime**: Node.js 22+ Express API (\`server.ts\`) + React 19 + Tailwind CSS v4 + \`@google/genai\` (\`gemini-4-hydrogen\` with \`googleSearch\` grounding) + \`pdf-lib\` + Google Drive API v3 (\`drive.file\` least-privilege scope).
- **Data Residency (PDPO Cap. 486)**: Deploy container in **Hong Kong (\`asia-east2\` on Google Cloud Run or \`ap-east-1\` on AWS)** with Personal Information Collection Statement (PICS) consent captured prior to HKID/medical collection.
- **Commands**:
  - Development: \`npm run dev\` (Port 3000)
  - Typecheck: \`npm run lint\`
  - Unit Tests: \`npx tsx --test src/domain/actuarialEngine.test.ts src/domain/hkIdentityParser.test.ts\`
  - Production Build & Start: \`npm run build && npm start\`
`;

