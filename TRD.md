# Technical Requirements Document (TRD)

**Project Name:** Automotive Marketplace & Quote Engine

**Document Version:** 1.0.0

**Target Architecture:** Next.js (App Router), Sanity.io CMS, Azure Cloud Services

---

## 1. System Architecture & Context

The system consists of a headless, content-driven web application tailored for the automotive category. Content management is handled centrally via Sanity.io, while transactional operations—specifically Request for Quote (RFQ) generation—are processed via serverless Next.js API routes and stored in an Azure-hosted database.

```
                  ┌───────────────────────────────────────────────┐
                  │                 Sanity.io                     │
                  │         (Multi-Tenant Content Lake)          │
                  └───────────────────────┬───────────────────────┘
                                          │ Content Queries (GROQ)
                                          │ Webhook Events (Revalidation)
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           Next.js App Router (Docker)                           │
│                                                                                 │
│  ┌────────────────────────┐  ┌───────────────────────┐  ┌────────────────────┐  │
│  │  (automotive) Layout   │  │   Quote Cart Store    │  │   Theme Engine     │  │
│  │   UI & Fitment Search  │  │   (Zustand / Client)  │  │ (Automotive Tokens)│  │
│  └───────────┬────────────┘  └───────────┬───────────┘  └────────────────────┘  │
│              │                           │                                      │
│              └─────────────┬─────────────┘                                      │
│                            │ API Requests                                       │
│                            ▼                                                    │
│               ┌─────────────────────────────┐                                   │
│               │    /api/quotes Endpoint     │                                   │
│               └──────────────┬──────────────┘                                   │
└──────────────────────────────┼──────────────────────────────────────────────────┘
                               │
               ┌───────────────┴───────────────┐
               ▼                               ▼
  ┌─────────────────────────┐     ┌─────────────────────────┐
  │  Azure DB for Postgres  │     │ Azure Communication Svc │
  │   (Quote Records Data)  │     │   (Email Notifications) │
  └─────────────────────────┘     └─────────────────────────┘

```

---

## 2. Technical Stack Specifications

| Layer | Technology | Selection Rationale |
| --- | --- | --- |
| **Frontend Framework** | Next.js 16.3.6 (App Router) | Server Components for fast initial loads, On-Demand ISR, and native Route Groups for vertical isolation. |
| **Content Management** | Sanity.io | Headless multi-tenant schema capability, real-time visual editing, tag-based revalidation. |
| **State Management** | Zustand (`persist` middleware) | Lightweight client-side cart management stored in `localStorage` for non-checkout quote assembly. |
| **Styling & Theming** | Tailwind CSS + CSS Variables | Dynamic branding token isolation for automotive, ready for future site expansion (baby/home). |
| **Database** | Azure Database for PostgreSQL | Relational storage for transactional RFQ tracking, user inquiries, and status lifecycle. |
| **Containerization** | Docker (Multi-stage build) | Minimal image footprint utilizing Next.js `standalone` mode. |
| **Hosting Platform** | Azure App Service / Container Apps | Direct CI/CD integration via GitHub Actions, native secret integration with Azure Key Vault. |
| **Transactional Email** | Azure Communication Services | Native Azure ecosystem tool for operational quote receipt emails and internal notifications. |

---

## 3. Detailed Data Models & Schemas

### 3.1 Sanity CMS Schemas (Content Lake)

#### `product` Document Schema

```typescript
import { defineType, defineField } from 'sanity';

export const product = defineType({
  name: 'product',
  title: 'Product',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'vertical',
      title: 'Vertical Taxonomy',
      type: 'string',
      options: {
        list: [
          { title: 'Automotive', value: 'automotive' },
          { title: 'Baby Products', value: 'baby' },
          { title: 'Home Needs', value: 'home' },
        ],
      },
      initialValue: 'automotive',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'sku',
      title: 'Part / SKU Number',
      type: 'string',
    }),
    defineField({
      name: 'images',
      title: 'Product Images',
      type: 'array',
      of: [{ type: 'image', options: { hotspot: true } }],
    }),
    defineField({
      name: 'automotiveSpecs',
      title: 'Automotive Specifications',
      type: 'object',
      hidden: ({ document }) => document?.vertical !== 'automotive',
      fields: [
        { name: 'make', title: 'Vehicle Make', type: 'array', of: [{ type: 'string' }] },
        { name: 'model', title: 'Vehicle Model', type: 'array', of: [{ type: 'string' }] },
        { name: 'yearStart', title: 'Year Range Start', type: 'number' },
        { name: 'yearEnd', title: 'Year Range End', type: 'number' },
        { name: 'partCategory', title: 'Part Category', type: 'string' }, // Engine, Brakes, Lighting
      ],
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'array',
      of: [{ type: 'block' }],
    }),
  ],
});

```

---

### 3.2 Relational Database Schema (PostgreSQL for RFQs)

```sql
CREATE TYPE quote_status AS ENUM ('pending', 'under_review', 'quoted', 'closed', 'rejected');

CREATE TABLE quote_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_number VARCHAR(20) UNIQUE NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    company_name VARCHAR(255),
    notes TEXT,
    status quote_status DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE quote_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_request_id UUID REFERENCES quote_requests(id) ON DELETE CASCADE,
    sanity_product_id VARCHAR(255) NOT NULL,
    product_title VARCHAR(255) NOT NULL,
    sku VARCHAR(100),
    quantity INT NOT NULL CHECK (quantity > 0),
    specifications_snapshot JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_quote_requests_ref ON quote_requests(reference_number);
CREATE INDEX idx_quote_items_request ON quote_items(quote_request_id);

```

---

## 4. API Endpoints Specification

### 4.1 Submit RFQ (`POST /api/quotes`)

* **Purpose:** Validates and saves a customer's quote request; triggers notifications.

#### Request Body

```json
{
  "customer": {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "phone": "+19876543210",
    "company": "Apex Tuning"
  },
  "items": [
    {
      "productId": "drafts.prod-1234",
      "title": "High-Performance Brake Pads",
      "sku": "BP-AUTO-99",
      "quantity": 4,
      "specs": {
        "make": "BMW",
        "model": "M3",
        "year": 2021
      }
    }
  ],
  "notes": "Looking for bulk delivery timeline estimates."
}

```

#### Response Success (`201 Created`)

```json
{
  "success": true,
  "referenceNumber": "RFQ-2026-90214",
  "message": "Quote request successfully submitted."
}

```

---

### 4.2 Sanity Revalidation Webhook (`POST /api/webhooks/sanity`)

* **Purpose:** Triggers Next.js tag-based ISR revalidation when product content changes in Sanity.

```typescript
import { revalidateTag } from 'next/cache';
import { type NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-sanity-webhook-secret');
  if (secret !== process.env.SANITY_WEBHOOK_SECRET) {
    return NextResponse.json({ message: 'Invalid signature' }, { status: 401 });
  }

  const body = await req.json();
  const { _type, vertical } = body;

  if (_type === 'product' && vertical === 'automotive') {
    revalidateTag('automotive-products');
    return NextResponse.json({ revalidated: true, tag: 'automotive-products' });
  }

  return NextResponse.json({ revalidated: false });
}

```

---

## 5. Client State Management (Quote Cart)

The quote builder operates entirely on the client until submission, managed via a persistent Zustand store.

```typescript
// src/features/quote-cart/store/useQuoteStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface QuoteItem {
  productId: string;
  title: string;
  sku?: string;
  slug: string;
  quantity: number;
  selectedVehicle?: { make: string; model: string; year: number };
}

interface QuoteStore {
  items: QuoteItem[];
  addItem: (item: QuoteItem) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearQuote: () => void;
}

export const useQuoteStore = create<QuoteStore>()(
  persist(
    (set) => ({
      items: [],
      addItem: (newItem) =>
        set((state) => {
          const existing = state.items.find((i) => i.productId === newItem.productId);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === newItem.productId
                  ? { ...i, quantity: i.quantity + newItem.quantity }
                  : i
              ),
            };
          }
          return { items: [...state.items, newItem] };
        }),
      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
        })),
      updateQuantity: (productId, quantity) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.productId === productId ? { ...i, quantity } : i
          ),
        })),
      clearQuote: () => set({ items: [] }),
    }),
    {
      name: 'automotive-quote-basket',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

```

---

## 6. CSS Theming Engine & Isolation

Theme variables are isolated to support distinct visual identities across current and future sites using native CSS custom properties.

### `src/styles/themes/automotive.css`

```css
:root {
  --theme-brand-primary: #d32f2f;      /* Automotive Sport Red */
  --theme-brand-secondary: #1a1a1a;    /* Charcoal Black */
  --theme-brand-accent: #f57c00;       /* Metallic Orange */
  --theme-surface-bg: #0f1115;          /* Dark Industrial Mode default */
  --theme-text-main: #f0f0f0;
  --theme-radius-base: 4px;            /* Sharp corners for automotive feel */
  --font-family-heading: 'Sora', sans-serif;
}

```

### Injection via Root Layout Group (`src/app/(automotive)/layout.tsx`)

```tsx
import '@/styles/themes/automotive.css';

export default function AutomotiveLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[var(--theme-surface-bg)] text-[var(--theme-text-main)] min-h-screen">
      {children}
    </div>
  );
}

```

---

## 7. Infrastructure & Deployment (Azure)

### 7.1 Dockerfile (`docker/Dockerfile`)

```dockerfile
FROM node:20-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]

```

---

### 7.2 GitHub Actions Pipeline (`.github/workflows/azure-deploy.yml`)

```yaml
name: Deploy Next.js Automotive App to Azure

on:
  push:
    branches:
      - main

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Log in to Azure Container Registry
        uses: azure/docker-login@v1
        with:
          login-server: ${{ secrets.ACR_LOGIN_SERVER }}
          username: ${{ secrets.ACR_USERNAME }}
          password: ${{ secrets.ACR_PASSWORD }}

      - name: Build and Push Docker Image
        run: |
          docker build -f docker/Dockerfile -t ${{ secrets.ACR_LOGIN_SERVER }}/automotive-site:${{ github.sha }} .
          docker push ${{ secrets.ACR_LOGIN_SERVER }}/automotive-site:${{ github.sha }}

      - name: Deploy to Azure Web App for Containers
        uses: azure/webapps-deploy@v2
        with:
          app-name: 'app-automotive-prod'
          images: '${{ secrets.ACR_LOGIN_SERVER }}/automotive-site:${{ github.sha }}'

```

---

## 8. Non-Functional Requirements (NFRs)

* **Performance:**
* Catalog pages must maintain a Largest Contentful Paint (LCP) $< 2.0\text{s}$.
* GROQ product queries must execute under $150\text{ms}$ by utilizing tagged Next.js fetch caching (`next: { tags: ['automotive-products'] }`).


* **Security:**
* All secrets (Sanity API Tokens, Azure Postgres Connection Strings) must be injected via environment variables sourced from **Azure Key Vault**.
* Input payloads on `/api/quotes` must be sanitized and validated using `zod` schemas to prevent SQL or script injection.


* **Scalability & Isolation:**
* CMS content queries must unconditionally enforce `vertical == "automotive"` at the query layer to isolate data leakage from upcoming baby and home categories.
* Local storage keys for the quote cart must be namespace-isolated (`automotive-quote-basket`).