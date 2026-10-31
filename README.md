# Designili — AI 3D Fashion Studio, AR Try-On & Print-Shop Marketplace

> **An AI 3D fashion platform connecting Algerian creators and brands with local print and sewing workshops.**

**Live Demo:** [https://thirduni-designili.vercel.app](https://thirduni-designili.vercel.app)  
**Repository:** [https://github.com/fouad3966/Thirduni---Designili](https://github.com/fouad3966/Thirduni---Designili)  
**Architecture Docs:** See `ARCHITECTURE.md` in the root directory for full system specifications and ADRs.

## Hackathon Submission Checklist (8-Item Judge Guide)

This section maps directly to the **8 official judging criteria** so evaluators can verify every requirement at a glance.

### 1. Name and One-Line Summary (16 / 20 words max)

**Designili** — An AI 3D fashion platform connecting Algerian creators and brands with local print and sewing workshops.

### 2. Description: Problem, Solution & Target Audience (139 / 150 words max)

In Algeria, aspiring creators and small clothing brands often have strong apparel ideas but lack the 3D design skills, software, or technical vocabulary to turn them into production-ready garments. Meanwhile, local printing and sewing workshops waste hours translating vague client sketches into printable files. Designili bridges both sides as an end-to-end AI 3D fashion studio and marketplace. Clients describe their vision in Algerian Darija (بالدارجة الجزائرية) or English, and our AI generates custom graphics, colors, and textile patterns directly onto interactive 3D garments—from T-shirts and hoodies to Algerian caftans and karakous. Users preview fit live via our Wear It AR webcam try-on, explore community storefronts in the 3D Atelier City marketplace for inspiration, and send orders or factory-ready tech packs directly to verified partner print and sewing shops across 58 wilayas. Built for individual creators, emerging brands, and garment workshops.

### 3. Live Demo Link

* **Production Web App (Zero Install Required):** [https://thirduni-designili.vercel.app](https://thirduni-designili.vercel.app)
* **Judge Evaluation Controls:** Look for the floating **Judge Demo Bar** inside the 3D Studio to switch subscription tiers (**Free**, **Pro**, **Studio**, **Business**, **Business Plus**) in one click, reset daily AI generation quotas instantly, and inspect live DZD/USD unit economics without needing a credit or Edahabia card.

### 4. Code Repository

* **Public GitHub Repository:** [https://github.com/fouad3966/Thirduni---Designili](https://github.com/fouad3966/Thirduni---Designili)
* **Included Documentation:** This `README.md` covers what Designili is, how to run it locally, and who built which part; `ARCHITECTURE.md` details the internal WebGL, MediaPipe AR, Darija NLP, and serverless architecture; and `Financial Plan - AI 3D Fashion Design Platform (Designili).md` documents the full unit economics and 12-month financial model.

### 5. Demo Video (2–4 Minutes, Unlisted)

* **Video Link (YouTube / Google Drive — Unlisted):** `<!-- TODO: Paste your 2-4 minute unlisted YouTube or Google Drive video link here before submitting -->`

### 6. Team and Roles

| Team Member Full Name | Role | What They Built (One Honest Line) |
| :--- | :--- | :--- |
| **Amani Hansali** | Project Lead, CTO & Product Architect | Led the product strategy, and 12-month unit economics financial plan. |
| **Mohamed Fouad Rabahi && Moncef Azzouz** | Full-Stack Engineering & AI | Integrated the 3D garments and mockups, Built the studio UI enhancements, Edahabia/CIB subscription checkout, Wilaya print-shop delivery flow, and Darija NLP refinements. |
| **Abdelkader Abbes && Kassouar Fatima** | AI & Darija NLP Engineering | Developed the core Algerian Darija (الدارجة) intent parser (`darja.js`) and wired the generative AI prompt-to-texture pipeline. |
| **Abdeldjalil Benchabne** | Computer Vision & 3D Marketplace | Implemented the MediaPipe WebAssembly "Wear It" AR camera try-on pipeline and 3D Atelier City marketplace integration. |
| **Zina Guerda** | Color Palette & Preset Contributor | Curated traditional Algerian color swatches (`palette.js`) and tested meshes, and researched local Algerian print-shop pricing benchmarks and Wilaya delivery estimates. |


### 7. Tech Stack & AI Tools Disclosure

Using AI is core to both our runtime product and our engineering workflow. Below is our complete, transparent stack:

| Layer | Technologies, Frameworks, Models & Tools Used |
| :--- | :--- |
| **Languages** | JavaScript (ES2023+), HTML5, CSS3, GLSL (Three.js shaders) |
| **Frontend Framework & UI** | React 18.2, Vite 5.3, Tailwind CSS 3.4, Framer Motion 11.2, `react-color` |
| **3D Graphics & WebGL** | Three.js (`0.165`), React Three Fiber (`@react-three/fiber`), React Three Drei (`@react-three/drei`), `maath` |
| **Reactive State Management** | Valtio (`1.13`) proxy-based state store with `localStorage` persistence |
| **Computer Vision & AR Try-On** | Google MediaPipe Tasks Vision (`@mediapipe/tasks-vision` Pose Landmarker Lite in WebAssembly + Web Workers), HTML5 Canvas 2D occlusion & Kalman/EMA smoothing |
| **Runtime AI & NLP Models** | **FLUX.1-schnell** (via Hugging Face ZeroGPU / `@gradio/client`), **Pollinations AI** (resilient serverless fallback), **OpenAI API** (`DALL-E` / GPT prompt enrichment), **Decart SDK**, **IDM-VTON / FitDiT** (Gradio virtual try-on route), and our **Custom Algerian Darija (الدارجة) Rule & Lexicon NLP Engine** (`src/config/darja/darja.js`) |
| **Backend & Cloud Hosting** | Vercel Serverless Functions (`/api/dalle.js`, `/api/nlp.js`), Node.js + Express (`/serveur`), MongoDB (`mongoose`), Cloudinary |
| **AI Coding & Design Assistants** | Google Gemini (architecture planning, financial-to-UI prototyping, documentation refinement), GitHub Copilot / Cursor (code completion and refactoring) |

### 8. What Happens Next — 3-Month Roadmap (99 / 100 words max)

Over the next three months, we will transition Designili from a functional prototype to commercial launch in Algeria. In Month 1, we will integrate live SATIM (CIB and Edahabia) payment processing via Chargily Pay and upgrade to dedicated commercial FLUX.1 and NLP inference endpoints. In Month 2, we will onboard our first 15 partner printing and sewing workshops across Algiers, Oran, and Constantine with a dedicated workshop portal for automated tech-pack ingestion, order tracking, and 15% commission invoicing. In Month 3, we will launch persistent user-owned storefronts inside the 3D Atelier City marketplace and add automated multi-size pattern grading.

## Deep Dive: Understanding the Problem, Solution & Target Ecosystem

### The Problem

Across Algeria and emerging markets, custom apparel creation is broken for both sides of the market:

1. **For Everyday Clients & Aspiring Creators:** Thousands of young people, students, event organizers, and emerging streetwear creators have vivid clothing concepts in mind. However, they cannot bring them to life because professional tools (CLO3D, Adobe Illustrator, Marvelous Designer) require steep technical expertise, high-end hardware, and English design terminology. Describing an idea in **Algerian Darija** like *"ديرلي تريكو كحل فيه رسمة تاع صحراء بالذهبي"* does not work in standard international AI tools.
2. **For Local Printing & Sewing Workshops (Ateliers):** Algeria has a strong network of textile printers (DTG, screen printing, sublimation, embroidery) and sewing workshops across all 58 wilayas. Yet workshop owners spend an enormous amount of unbilled time acting as free graphic designers—back-and-forth messaging with clients over low-resolution screenshots, guessing garment measurements, and manually recreating print files.
3. **Lack of Trust Before Ordering:** Clients hesitate to order custom garments online because static 2D mockups fail to show how a garment drapes in 3D or how it looks on their own body.

### Our Solution: Designili as the Two-Sided Bridge

**Designili** sits squarely in the middle as an intelligent creative and commercial bridge between **clients who have ideas** and **printing/sewing companies that produce them**:

* **Speak Darija or English, Get a 3D Garment:** Users type their idea naturally in **Algerian Darija (الدارجة الجزائرية)**, **Arabic**, or **English**. Our custom cultural NLP engine (`src/config/darja/darja.js` and `/api/nlp/understand`) parses garment types, Algerian color idioms (e.g., كحل, زرق, بوردو, ذهبي), traditional motifs, and placement intents, then synthesizes high-resolution chest decals or seamless full-garment textures on a live 360° 3D mesh.
* **Culturally Grounded 3D Catalog:** Beyond standard T-shirts and hoodies, Designili natively supports 3D meshes for **Evening Dresses, Tailored Suits, Algerian Caftans, Traditional Karakous, and Footwear**.
* **Try Before You Print ("Wear It" Live AR):** With one click, users activate their webcam. Our in-browser MediaPipe WebAssembly pose tracker maps their shoulders, torso, and hips at 30+ FPS—letting them physically move and see their custom garment fitted on their body with zero server latency.
* **Community Inspiration in the 3D Atelier City Marketplace (`game/atelier-city`):** Users are not designing in isolation. They can enter an interactive 3D virtual shopping street to browse storefronts created by other designers, inspect community garments for inspiration, and order existing community designs.
* **Automated Tech Packs & Direct Workshop Ordering:** When a design is ready, clients choose their size (or a multi-size bulk matrix for companies/events), select their **Wilaya**, and pick a verified local partner print/sewing shop with transparent pricing and delivery times. Simultaneously, Designili compiles a **Factory Tech Pack / Spec Sheet** (`ExportModal.jsx`) containing exact HEX color codes, decal coordinates, fabric material maps, and high-res print assets so the workshop can print and sew immediately without manual redesign.

### Who Designili Serves (Target Groups)

| Target Segment | Core Pain Point Solved | How They Use Designili |
| :--- | :--- | :--- |
| **1. Individual Creators & Everyday Clients** | Have creative outfit ideas in Darija/English but zero graphic design or 3D skills. | Generate designs via AI prompts, test fit with **Wear It** AR camera, browse the marketplace, and order single pieces via **Cash on Delivery (COD)** from local partner print shops. |
| **2. Emerging Clothing Brands & Event Organizers** | Need cohesive collections, brand kits, and bulk orders without hiring an expensive 3D studio. | Subscribe to **Studio** or **Business** tiers, save brand logos/palettes in the **Brand Kit**, place multi-size bulk orders (`XS–XXL`), or export print-ready `PNG/SVG/PDF` tech packs. |
| **3. Printing & Sewing Companies (Partner Workshops)** | Lose hours fixing unusable client images and need steady, pre-validated order flow. | Receive standardized, production-ready orders and spec sheets routed by Wilaya, paying Designili a simple **15% commission** only on completed orders (**Business Plus** workshops can also use the studio for their own in-house production). |

## Business Model & Pricing Tiers (October 2026 Financial Plan)

All prices are displayed in both **Algerian Dinars (DA)** and **US Dollars (USD)** at the official exchange rate (`1 USD = 134 DA`).

* **What We Limit:** Only **AI generations** (submitting a new AI prompt or regenerating).
* **Always Free & Unlimited:** Changing garment colors, uploading custom logos/artwork, adding typography, rotating the 3D garment, and browsing community stores.
* **Separation of Payment Rule:** *Subscriptions pay for the design tools on Designili (via **Edahabia**, **CIB**, or **Mastercard**). The physical garment, printing, and delivery are paid separately to the chosen print shop via **Cash on Delivery** (Designili earns a 15% commission invoiced to partner print shops).*

### Individual Tiers

| Feature | Free | Pro | Studio |
| :--- | :--- | :--- | :--- |
| **Monthly Price** | $0 (0 DA) | $9 (1,200 DA) | $19 (2,550 DA) |
| **Annual Price** | n/a | $79 (10,600 DA) | $169 (22,600 DA) |
| **AI Generations** | 3 in total | 60/mo (100/mo on annual) | 150/month |
| **Browse Community Stores** | Yes | Yes | Yes |
| **Wear It (Live AR Camera)** | Locked | Yes | Yes |
| **Order from Partner Print Shops** | Locked | Yes | Yes |
| **Export Tech Pack Files (PNG, SVG, PDF)** | Locked | Locked | Yes |
| **Print with Any Outside Shop** | No | No | Yes |

### Company & Workshop Tiers

| Feature | Business | Business Plus |
| :--- | :--- | :--- |
| **Monthly Price** | $39 (5,200 DA) | $79 (10,600 DA) |
| **Annual Price** | $349 (46,800 DA) | $699 (93,700 DA) |
| **Shared Team AI Generations** | 300/month | 600/month |
| **Wear It (Live AR Camera)** | Yes | Yes |
| **Order from Partner Print Shops** | Yes | Yes |
| **Bulk Orders (Multi-Size Matrix)** | Yes | Yes |
| **Brand Kit (Saved Logos & Palettes)** | Yes | Yes |
| **Export Files & Outside/In-House Printers** | Locked | Yes |

## Repository Structure

```text
Thirduni---Designili/
├── api/                        # Vercel Serverless Functions (zero-config cloud deployment)
│   ├── dalle.js                # Serverless AI texture/decal synthesis gateway (/api/v1/dalle)
│   └── nlp.js                  # Serverless Algerian Darija & English NLP parser (/api/nlp/understand)
├── game/                       # 3D Virtual Marketplace subsystem
│   └── atelier-city/           # Interactive 3D street-level store exploration environment
├── public/                     # Static 3D garment assets (.glb, .mtl), textures, and studio icons
├── serveur/                    # Standalone Node.js + Express backend (full parity with /api)
│   ├── route/                  # Express routes: dalle.routes.js, nlp.routes.js, tryon.routes.js
│   ├── services/               # AI & NLP services: darja.js, colors.js, huggingface.js, tryon.js
│   └── index.js                # Express server entrypoint (port 8080)
├── src/                        # React 18 + Vite 5 Frontend Application
│   ├── canvas/                 # Three.js / React Three Fiber 3D viewport & procedural meshes
│   │   ├── index.jsx           # WebGL Canvas, PBR lighting & environment setup
│   │   ├── Garment.jsx         # Multi-garment 3D loader (Hoodie, Dress, Suit, Caftan, Karakou)
│   │   ├── Shirt.jsx           # Primary T-Shirt PBR mesh with decal & trim projection
│   │   ├── GarmentTextDecal.jsx# 3D curved text decal mesh projection
│   │   ├── useTextTexture.js   # Offscreen HTML5 Canvas dynamic text texture hook
│   │   ├── CameraRig.jsx       # Smooth pointer-reactive 3D camera controller
│   │   ├── ModelRotator.jsx    # 360-degree inspection rotation controller
│   │   └── BackDrop.jsx        # Accumulative studio shadow & lighting backdrop
│   ├── comp/                   # Studio UI, Modals & Checkout Components
│   │   ├── AIPicker.jsx        # Bilingual Darija/English AI prompt studio & quota tracker
│   │   ├── ColorPicker.jsx     # Garment & trim color studio + Company Brand Kit swatches
│   │   ├── FilePiker.jsx       # Custom artwork/logo upload & placement controls
│   │   ├── TextPicker.jsx      # 3D typography editor (fonts, scale, rotation, colors)
│   │   ├── GarmentSelector.jsx # 3D garment model switcher
│   │   ├── ExportModal.jsx     # Factory Tech Pack & Spec Sheet generator (tier-gated)
│   │   ├── PricingModal.jsx    # Interactive Individual & Company pricing comparison modal
│   │   ├── SubscriptionCheckoutModal.jsx # Edahabia, CIB & Mastercard checkout prototype
│   │   ├── OrderPrintModal.jsx # 6-step Wilaya partner print-shop order & status tracker
│   │   ├── JudgeDemoBar.jsx    # Live hackathon evaluator toolbar (1-click tier & quota switcher)
│   │   ├── DesignHistoryDropdown.jsx # Lookbook snapshot & undo/redo state manager
│   │   ├── ViewControls.jsx    # Zoom, pan, and auto-rotate viewport controls
│   │   ├── Tab.jsx             # Glassmorphic dock tab item
│   │   └── CustomButtom.jsx    # Reusable themed action button
│   ├── config/                 # Domain Logic, Darja Lexicon, Pricing & Spec Compilers
│   │   ├── darja/darja.js      # Algerian Darija (الدارجة) phonetic dictionary & intent parser
│   │   ├── garments/           # Per-garment 3D transform & material configurations
│   │   ├── pricingPlans.js     # Full USD/DA tier specs, partner print shops & unit economics
│   │   ├── dailyQuota.js       # LocalStorage AI generation quota manager & sandbox reset
│   │   ├── exportSpecSheet.js  # High-res canvas spec sheet & tech pack compiler
│   │   ├── fabricTexture.js    # Procedural weave/knit normal & roughness map generator
│   │   ├── logoMask.js         # UV decal bounding & transparency masking utilities
│   │   └── designHistory.js    # Snapshot serialization for design revisions
│   ├── pages/                  # Primary Application Views
│   │   ├── Home.jsx            # Hero landing page, marketplace entry & pricing access
│   │   └── Costumizer.jsx      # Full 3D Studio workspace, dock, and action bar
│   ├── store/                  # Reactive Global State
│   │   └── index.js            # Valtio proxy store (garment state, plans, orders, modals)
│   ├── tryon/                  # In-Browser Real-Time AR Virtual Try-On
│   │   ├── WearIt.jsx          # Live webcam AR fitting modal & snapshot capture
│   │   ├── poseTracker.js      # MediaPipe Pose Landmarker lifecycle controller
│   │   ├── pose.worker.js      # Dedicated Web Worker for off-thread pose inference
│   │   ├── fitPose.js          # 3D-to-2D torso affine transformation math
│   │   ├── smoothFit.js        # Temporal Kalman/EMA landmark smoothing filter
│   │   └── occlusion.js        # Body/arm segmentation & depth occlusion masking
│   ├── App.jsx                 # Root state-driven view orchestrator
│   └── main.jsx                # React DOM mounting entrypoint
├── ARCHITECTURE.md             # Deep-dive system architecture & ADRs for technical evaluators
├── Financial Plan - AI 3D Fashion Design Platform (Designili).md # Full financial plan
├── vercel.json                 # Serverless routing & rewrite configuration
└── package.json                # Dependencies and build scripts
```

## Quickstart: How to Run Locally

### Prerequisites

* **Node.js** `v18+` (recommended `v20` or `v22`)
* **npm** `v9+`
* Modern browser with **WebGL 2.0** and webcam permissions (for the **Wear It** AR try-on feature)

### Option A: Run Frontend + Serverless APIs (Fastest Setup)

The frontend automatically connects to the built-in Darija NLP engine and resilient AI texture pipeline out of the box:

```bash
# 1. Clone the repository
git clone https://github.com/fouad3966/Thirduni---Designili.git
cd Thirduni---Designili

# 2. Install frontend dependencies
npm install

# 3. Start the Vite development server
npm run dev
```

Open `http://localhost:5173` in your browser.

### Option B: Run Full Stack with Standalone Express Server (`/serveur`)

If you want to run the dedicated Node.js/Express backend locally on port `8080` (with custom Hugging Face / OpenAI API keys):

```bash
# 1. In a second terminal, navigate to the backend folder
cd serveur
npm install

# 2. Configure environment variables (optional — fallbacks work without keys)
# Create a .env file in /serveur:
# PORT=8080
# HF_TOKEN=your_huggingface_token_optional
# OPENAI_API_KEY=your_openai_key_optional

# 3. Start the Express server
npm start
```

### How Judges Can Test Every Feature in 60 Seconds

1. **Test Darija or English AI Design:** Click **Customize It**, open the **AI Studio** tab on the left dock, and type a prompt in Algerian Darija (e.g., `"تريكو كحل فيه رسمة تاع صحراء بالذهبي"`) or English (`"cyberpunk geometric gold embroidery"`).
2. **Switch Garments & Fabrics:** Use the bottom garment selector to switch between **T-Shirt, Hoodie, Dress, Suit, Caftan, and Karakou**, and customize colors, trims, and 3D text decals.
3. **Test Live AR Try-On ("Wear It"):** Click **Wear It** in the top bar to project your customized 3D garment onto your live webcam feed using MediaPipe pose tracking.
4. **Use the Judge Demo Bar:** Click the floating **Judge Demo Bar** pill to switch instantaneously between **Free, Pro, Studio, Business, and Business Plus** plans, test tier-gated features (like Tech Pack export and Company Brand Kits), view live **Unit Economics**, and walk through the **Edahabia / CIB Checkout** and **Wilaya Print-Shop Order Tracker** (`Received → Printing → Shipped → Delivered`).
