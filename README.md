# 🚀 FacturON — Smart Invoicing & Fiscal Compliance

> **Empowering freelancers, SMBs, and modern developers with effortless, compliant, and lightning-fast invoicing.**

---

## 📌 Executive Summary

**FacturON** is an all-in-one fiscal management and electronic invoicing solution. Designed from the ground up to comply seamlessly with new anti-fraud and electronic invoicing mandates (**Veri*factu** / **TicketBAI** regulations in Spain and the EU), FacturON takes the complexity out of legal billing.

Whether you run a solo agency, consult, or manage multi-client business operations, FacturON bridges the gap between modern developer-centric architecture and frictionless daily administration.

---

## 🎯 The Problem vs. The FacturON Solution

| Traditional Billing Systems ❌ | FacturON ⚡ |
| :--- | :--- |
| **Clunky, legacy interfaces** that slow down daily tasks | **Sleek, reactive UI** built with Tailwind CSS & Flutter |
| **Manual compliance headaches** and risk of non-compliance fines | **Automated SHA-256 hash chaining** and instant QR code generation |
| **Opaque, slow relational databases** with vendor lock-in | **Supabase (PostgreSQL) + Drizzle ORM** with full schema transparency |
| **Disconnected workflows** between mobile, web, and accountants | **Cross-platform real-time sync** with instant vector PDF & CSV exports |

---

## 🌟 Core Highlights

```
┌─────────────────────────────────────────────────────────────┐
│                      FacturON Platform                      │
├─────────────────┬───────────────────────────┬───────────────┤
│   Compliance    │      Speed & Tech         │  User First   │
│  ─────────────  │     ──────────────        │  ───────────  │
│  • Veri*factu   │  • Supabase PostgreSQL   │  • Clean UI   │
│  • QR Codes     │  • Drizzle ORM Type-Safe  │  • Mobile App │
│  • Tamper-proof │  • Microsecond Queries    │  • 1-Click PDF│
└─────────────────┴───────────────────────────┴───────────────┘
```

### 1. 🛡️ Native Veri*factu & Fiscal Integrity
- **Tamper-Evident Hash Chaining:** Every generated invoice incorporates cryptographic references to the preceding transaction, ensuring verifiable audit trails.
- **Dynamic Verification QR Codes:** Fiscal authorities and customers can verify invoice validity directly with a single scan.
- **Audit-Ready Logs:** Unalterable ledger history aligned with anti-fraud tax standards.

### 2. ⚡ Modern High-Performance Stack
- **Drizzle ORM:** End-to-end type safety, ultra-fast queries, zero bloat.
- **Supabase Backend:** Granular Row-Level Security (RLS) keeping client and fiscal records completely isolated.
- **Edge Deployment:** Fast, globally distributed API endpoints.

### 3. 💼 Complete Invoice Lifecycle
- Multi-series numbering and automated invoice sequencing.
- Comprehensive tax configurations: **IVA/VAT**, personal income tax retentions (**IRPF**), and equalization surcharges (*Recargo de Equivalencia*).
- Client directory with tax identification verification, address autocomplete, and payment status tracking (Pending, Paid, Overdue).

### 4. 📄 Export & Integration Ready
- Instant generation of lightweight, pixel-perfect vector PDFs.
- Direct accountant exports (CSV, XLSX, standardized JSON format).
- Webhook events for payment reconciliation and accounting software hooks.

---

## 📊 Feature Comparison Matrix

| Capability | Basic Excel / Word | Legacy Invoicing SaaS | **FacturON** |
| :--- | :---: | :---: | :---: |
| Modern UX / UI | ❌ | ⚠️ | **✅ (Fluid & Fast)** |
| Automatic Hash Chaining | ❌ | ⚠️ (Paid add-on) | **✅ (Native)** |
| Veri*factu QR Emission | ❌ | ⚠️ | **✅ (Built-in)** |
| Multi-Device Realtime Sync | ❌ | ✅ | **✅ (Supabase)** |
| Self-Hostable / Open Core | ❌ | ❌ | **✅ (Full Control)** |
| Developer-Friendly Schema | ❌ | ❌ | **✅ (Drizzle ORM)** |

---

## 🛠️ Technology Architecture

```
                    ┌─────────────────────────┐
                    │      Client Apps        │
                    │   (Web Dashboard &      │
                    │    Flutter Mobile)      │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │      Edge API Layer     │
                    │ (Next.js / Nitro Engine)│
                    └────────────┬────────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 ▼                               ▼
      ┌─────────────────────┐         ┌─────────────────────┐
      │     Drizzle ORM     │         │   Veri*factu Signer │
      │   (TypeScript SQL)  │         │  (SHA-256 Engine)   │
      └──────────┬──────────┘         └──────────┬──────────┘
                 │                               │
                 └───────────────┬───────────────┘
                                 ▼
                    ┌─────────────────────────┐
                    │    Supabase Postgres    │
                    │  (Row-Level Security)   │
                    └─────────────────────────┘
```

---

## 🚀 Quick Evaluation & Getting Started

```bash
# 1. Clone the project repository
git clone https://github.com/your-org/facturon.git
cd facturon

# 2. Install dependencies
npm install

# 3. Synchronize database schema via Drizzle
npm run db:push

# 4. Launch your development instance
npm run dev
```

---

## 📞 Get in Touch & Contribute

- 💬 **Community Discussions:** Join our GitHub Discussions board.
- 🐛 **Issue Reporting:** Submit bug reports or request features on GitHub Issues.
- 📬 **Contact & Inquiries:** Reach out directly through the project repository.

***

<p align="center">
  <strong>FacturON</strong> — Built for clarity. Certified for compliance. Designed for growth.
</p>
