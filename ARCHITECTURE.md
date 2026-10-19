# DESIGNILI 3D STUDIO — Technical Architecture & System Specifications

> **Target Audience**: Senior System Architects, Technical Recruiters, Hackathon Judges, and 3D/AI Evaluators.  
> **Purpose**: Detailed technical blueprint, architectural decision records (ADRs), mathematical formulations, cultural NLP pipeline specifications, computer vision try-on architecture, and repository reference for the Designili 3D Garment Customizer platform.

---

## 1. System Overview & Core Philosophy

**Designili 3D Studio** is an enterprise-grade, browser-native fashion engineering platform. It bridges generative AI, computational linguistics, real-time 3D Physically Based Rendering (PBR), and on-device computer vision to deliver a unified apparel ideation and manufacturing pipeline.

Traditional garment workflows force designers to juggle disconnected tools: 2D raster software (Illustrator/Photoshop) for flat prints, complex desktop CAD suites (Clo3D, Marvelous Designer) requiring workstation GPUs, and ungrounded text-to-image models that generate pictures of fashion models rather than flat, production-ready textile patterns.

Designili solves this through a reactive, browser-first architecture:

```mermaid
flowchart TB
    subgraph Client["Client Browser (React 18 / Vite / Three.js)"]
        User([Fashion Designer / User])
        
        subgraph StudioUI["Atelier Workspace (Luxury Glassmorphic UI)"]
            TabAI["1. AI Textile Studio\n(FLUX.1 Schnell & Darja Engine)"]
            TabColor["2. Garment Palette\n(PBR Base & Accent Color Engine)"]
            TabDecal["3. Dynamic Typography & Decal Lab\n(Offscreen 2D Canvas Rasterizer)"]
            TabFile["4. Artwork & Branding Atelier\n(Alpha Mask Cutout & Planar Decal)"]
            TabWear["5. Live Camera Wear-It\n(MediaPipe Pose Landmarker / WASM)"]
            TabSpec["6. Production Spec Sheet\n(Automated Industrial Tech Pack)"]
        end

        ValtioStore[("Valtio Reactive Proxy Store\n(state/index.js)")]
        ThreeCanvas["Three.js / React Three Fiber Scene\n(Garment Mesh, Dynamic Decals, AccumulativeShadows)"]
        PoseWorker["Dedicated Web Worker\n(MediaPipe SIMD/WASM Body Tracker)"]
    end

    subgraph Server["Express.js Server (Node.js 22+)"]
        SecMiddleware["Security & Traffic Gate\n(Rate Limiter, CORS, Input Sanitizer)"]
        
        subgraph ApiRoutes["RESTful Route Handlers"]
            RouteDalle["POST /api/v1/dalle\n(Image & Textile Generation)"]
            RouteNLP["POST /api/nlp/understand\n(Darja / Arabizi Parser)"]
            RouteTryon["POST /api/tryon\n(Fallback Neural Try-On)"]
        end

        subgraph CoreServices["Backend Intelligence Services"]
            DarjaEngine["Algerian Darja Understanding Engine\n(Phonetic Skeleton + Lexicon Parser)"]
            HuggingFaceClient["FLUX.1 Schnell Gradio Space Client\n(ZeroGPU Anonymous / Token-Based Orchestration)"]
            PaletteEngine["Color Harmony & Hex Shader Engine"]
        end
    end

    subgraph ExternalCloud["Cloud & Model Infrastructure"]
        HF_Space["Hugging Face ZeroGPU Space\n(black-forest-labs/FLUX.1-schnell)"]
        LLM_Optional["Optional LLM Fallback\n(Gemini 1.5 / OpenAI Compatible API)"]
    end

    %% User Interactions
    User --> StudioUI
    StudioUI --> ValtioStore
    ValtioStore --> ThreeCanvas
    StudioUI -.-> PoseWorker
    
    %% API Traffic
    StudioUI --> SecMiddleware
    SecMiddleware --> ApiRoutes
    RouteDalle --> DarjaEngine
    DarjaEngine --> HuggingFaceClient
    DarjaEngine -.-> LLM_Optional
    HuggingFaceClient --> HF_Space
    RouteNLP --> DarjaEngine
```

---

## 2. Architectural Decision Records (ADRs)

### ADR 001: WebGL 3D Garment Mesh Simulation vs. 2D Canvas Mockups
- **Context**: Standard e-commerce customizers superimpose PNG decals onto static 2D product photos. This produces lifeless graphics that ignore fabric folds, light falloff, seam geometry, and back-of-garment inspection.
- **Decision**: Adopt **Three.js** and **React Three Fiber (`@react-three/fiber`)** with **React Three Drei (`@react-three/drei`)**.
- **Consequences**:
  - Full 360° interactive orbit, pan, and tilt with responsive touch/mouse controls.
  - Multi-garment library: T-Shirt (`shirt_baked.glb`), Hoodie (`hoodie/model.glb`), Evening Dress (`dress/model.glb`), Suit (`suit/model.glb`), Caftan, and Karakou.
  - Physically Based Rendering (PBR) materials reacting naturally to studio lighting and soft contact shadows (`AccumulativeShadows`).

### ADR 002: Valtio Reactive Proxy State vs. Redux / Zustand
- **Context**: 3D view manipulation involves 60fps continuous mouse dragging (`shirtRotationY`), real-time camera interpolation, text texture rasterization, and rapid color changes.
- **Decision**: Adopt **Valtio** proxy state (`src/store/index.js`).
- **Consequences**:
  - Fine-grained reactivity without boilerplate selectors or unnecessary component tree re-renders.
  - Mutations are direct (`state.color = newColor; state.shirtRotationY += deltaX`).
  - Seamless integration with Three.js render loops (`useSnapshot(state)`).
  - Snapshot-based historical state persistence (`src/config/designHistory.js`) for undo/redo and lookbook saving.

### ADR 003: Zero-Cost FLUX.1 Schnell via Gradio Space vs. Paid Inference APIs
- **Context**: Production diffusion APIs (Midjourney, DALL-E 3, paid SDXL endpoints) incur per-call costs and require credit cards, limiting open-source adoption and prototype testing.
- **Decision**: Connect directly to public **Hugging Face ZeroGPU Spaces** (`black-forest-labs/FLUX.1-schnell`) via WebSocket/Gradio RPC (`serveur/services/huggingface.js`).
- **Consequences**:
  - High-resolution (1024×1024) 4-step latent flow transformer generation with zero mandatory API credits.
  - Graceful fallback: handles anonymous mode, optional personal `HF_TOKEN`, and connection queue recovery.
  - Structured prompt engineering: automatically formats prompts into flat edge-to-edge textile patterns rather than pictures of fashion models.

### ADR 004: In-Browser MediaPipe WebAssembly Pose Tracking vs. Cloud Neural Try-On
- **Context**: Cloud virtual try-on pipelines (IDM-VTON, Cat-VTON) require high-end server GPUs, introduce 10–25 second latency, and require uploading sensitive webcam video to remote servers.
- **Decision**: Deploy **Google MediaPipe Pose Landmarker Lite** client-side via WebAssembly (WASM) and SIMD running in a dedicated **Web Worker** (`src/tryon/pose.worker.js`).
- **Consequences**:
  - Real-time 30+ FPS interactive fitting directly on user's device.
  - Zero server GPU cost and 100% user biometric privacy (video frames never leave browser memory).
  - Works offline or on low-bandwidth connections.

### ADR 005: Hybrid Lexicon + LLM Engine for Algerian Darja & Arabizi
- **Context**: North African designers express design concepts in **Darja** using Latin script (Arabizi / 3arbizi, e.g. `"tshirt k7al fih zellij dahabi"`). Off-the-shelf translators fail to interpret dialect words, numeral substitutions (`3` for ع, `7` for ح), and cultural terms. Encoder models like DziriBERT are classifiers, not generative translators.
- **Decision**: Build a two-tier hybrid engine in [darja.js](file:///d:/ISI%20Projects/Thirduni%202/serveur/services/darja.js):
  1. *Tier 1 (Default)*: High-speed, zero-cost deterministic lexicon parser with diacritic folding, phonetic skeleton hashing, negation detection, and cultural motif extraction.
  2. *Tier 2 (Optional)*: LLM-backed structured brief generator (Gemini / OpenAI API) activated only when configured.
- **Consequences**: Instant zero-latency responses locally, zero cloud dependency, and flawless understanding of Algerian fashion prompts.

---

## 3. Generative AI Pipeline & Prompt Architecture

### The "Fabric vs. Photo" Problem
Standard text-to-image prompts given to models like DALL-E or Midjourney yield a photo of a human model standing in a studio wearing a garment. This cannot be mapped onto a 3D UV mesh.

Designili intercepts every prompt in [serveur/services/huggingface.js](file:///d:/ISI%20Projects/Thirduni%202/serveur/services/huggingface.js) and reshapes it:

```
[Raw User Input] (e.g., "zellij k7al w dahabi")
       │
       ▼
[Darja Cultural NLP] ──► Extracted: Motif="geometric zellige mosaic tile", Colors=["#0B0B0B", "#D4AF37"]
       │
       ▼
[Textile Art Direction Synthesis]
"Flat edge-to-edge seamless textile artwork of geometric zellige mosaic tile motifs,
 deep black background (#0B0B0B) with metallic gold accents (#D4AF37),
 symmetrical North African ornament, top-down flat fabric print,
 high-resolution vector surface pattern, no models, no mockups, no folds."
       │
       ▼
[FLUX.1 Schnell Latent Flow Transformer (4 Steps)]
       │
       ▼
[1024x1024 Base64 Image Delivery + Dominant Color Extraction]
       │
       ▼
[Three.js Material Texture Mapping & Collar/Cuff Accent Tinting]
```

---

## 4. 3D Graphics Simulation & UV Projection Mathematics

### 4.1 Planar Decal Projection Math
Decals are projected onto arbitrary 3D geometry using the Drei `Decal` primitive. A virtual projection box is placed at position $\mathbf{P} \in \mathbb{R}^3$, oriented along normal vector $\mathbf{N} \in \mathbb{R}^3$, with scale $\mathbf{S} = (s_x, s_y, s_z)$ and rotation angle $\theta$:

$$\mathbf{M}_{\text{proj}} = \mathbf{T}(\mathbf{P}) \cdot \mathbf{R}(\mathbf{N}, \theta) \cdot \mathbf{S}(s_x, s_y, s_z)$$

Points on the garment surface intersecting this bounding volume are clipped and projected onto a planar UV coordinate frame:

$$u = \frac{\mathbf{v}_{\text{local}} \cdot \hat{\mathbf{x}}}{s_x} + 0.5, \quad v = \frac{\mathbf{v}_{\text{local}} \cdot \hat{\mathbf{y}}}{s_y} + 0.5$$

Where $(u, v) \in [0, 1]^2$.

### 4.2 Dynamic 2D Offscreen Canvas Text Decal Rasterization
To provide crisp typography on 3D garments without pre-rendering static bitmaps:
1. An offscreen 2D `<canvas>` element (typically 1024×512 or 2048×1024) is initialized in [src/config/textTexture.js](file:///d:/ISI%20Projects/Thirduni%202/src/config/textTexture.js).
2. Canvas styles (font face, weight, tracking, drop shadows, color, and multi-line alignment) are rendered dynamically.
3. The canvas is bound to a Three.js `CanvasTexture` (`needsUpdate = true`).
4. The texture is fed into a secondary `Decal` or mapped directly to the garment's front/back chest target coordinates.

### 4.3 Soft Accumulative Contact Shadows
Rather than simple hard directional shadow maps, Designili uses `AccumulativeShadows` with `RandomizedLight`:
- 60 temporal passes accumulated over multiple frames.
- Soft diffuse ambient occlusion beneath the garment hemline, creating realistic grounding in the studio space.

---

## 5. Cultural NLP Engine: Algerian Darja & Arabizi

The engine in [serveur/services/darja.js](file:///d:/ISI%20Projects/Thirduni%202/serveur/services/darja.js) parses Algerian Arabic in both Arabic script and Latin Arabizi (numbers representing phonemes: `3` = ع, `7` = ح, `9` = ق, `5` = خ).

### 5.1 Pipeline Stages
1. **Unicode Normalization (NFKC)**: Strips harakat (tashkeel), tatweel, and normalizes Arabic-Indic digits (`٠-٩` $\rightarrow$ `0-9`).
2. **Repetition Collapsing**: Collapses exaggerated letter repetitions (`"kahlaaaa"` $\rightarrow$ `"kahlaa"`).
3. **Phonetic Folding**: Unifies regional spelling variants (`"ڨ"`, `"ڤ"`, `"چ"` $\rightarrow$ standard root equivalents; Latin accents stripped).
4. **Phonetic Skeleton Indexing**:
   Consonant extraction creates a invariant hash for dialect spellings:
   - Input: `"k7al"`, `"kahal"`, `"khal"`, `"kahl"` $\rightarrow$ Skeleton: `"K-H-L"`.
   - Maps directly to Canonical Color: `Black (#0B0B0B)`.
5. **Negation & Scope Detection**:
   Detects negation markers (`"bla"`, `"blach"`, `"sans"`, `"men ghir"`, `"بدون"`, `"بلا"`):
   - Example: `"bla ktiba"` $\rightarrow$ suppresses text decal output (`textOnGarment: null`).
6. **Cultural Heritage Motif Extraction**:
   Recognizes traditional North African apparel & design concepts:
   - `zellij`: Moroccan/Algerian geometric tile mosaic.
   - `karakou`: Velvet jacket with gold thread embroidery.
   - `haik`: Traditional white woven fabric.
   - `tassili`: Prehistoric Saharan rock art figures.
   - `amazigh` / `kabyle`: Berber geometric talisman diamonds and fibula ornaments (`tazra`).
   - `casbah`: Whitewashed urban architecture of Algiers.

---

## 6. Real-Time Virtual Try-On ("Wear It") Architecture

The virtual fitting room runs client-side with zero cloud dependency:

```mermaid
sequenceDiagram
    autonumber
    actor User as User Webcam
    participant UI as WearIt.jsx (React)
    participant Worker as pose.worker.js (Web Worker)
    participant MediaPipe as MediaPipe Pose Landmarker (WASM)
    participant FitPose as fitPose.js (Affine Engine)
    participant Canvas as Overlay Canvas (2D/3D Mesh)

    UI->>User: Request Camera Permission (getUserMedia)
    User-->>UI: Video Stream (640x480 / 1280x720)
    UI->>Worker: postMessage({ type: 'init', wasmPaths })
    Worker->>MediaPipe: Compile WASM + Load Model
    MediaPipe-->>Worker: Initialized

    loop Continuous Video Loop (requestAnimationFrame)
        UI->>Worker: postMessage({ type: 'detect', imageBitmap })
        Worker->>MediaPipe: detectForVideo(frame, timestamp)
        MediaPipe-->>Worker: 33 Landmark Keypoints
        Worker-->>UI: postMessage({ type: 'results', landmarks })
        UI->>FitPose: computeGarmentTransform(landmarks, garmentType)
        FitPose-->>Canvas: { x, y, scaleX, scaleY, rotation, torsoWidth }
        Canvas->>Canvas: Render garment fitted to shoulders & torso
    end
```

### Pose Fitting Math (`fitPose.js`)
- **Shoulder Midpoint**: $\mathbf{P}_{\text{shoulder}} = \frac{\mathbf{L}_{11} + \mathbf{L}_{12}}{2}$
- **Hip Midpoint**: $\mathbf{P}_{\text{hip}} = \frac{\mathbf{L}_{23} + \mathbf{L}_{24}}{2}$
- **Torso Length**: $H_{\text{torso}} = \|\mathbf{P}_{\text{shoulder}} - \mathbf{P}_{\text{hip}}\|$
- **Bi-acromial Width**: $W_{\text{shoulder}} = \|\mathbf{L}_{11} - \mathbf{L}_{12}\|$
- **Roll Angle**: $\theta_{\text{roll}} = \operatorname{atan2}(y_{12} - y_{11}, x_{12} - x_{11})$

---

## 7. Automated Production Spec Sheet Engine

In [src/config/exportSpecSheet.js](file:///d:/ISI%20Projects/Thirduni%202/src/config/exportSpecSheet.js), Designili converts digital 3D designs into industrial factory tech packs:

1. **Multi-Angle Headless Render**: Captures high-resolution front, back, and detail viewports from the WebGL canvas.
2. **Color Palette Breakdown**: Extracts hex codes, pantone approximations, and material specifications (cotton/poly blend, gsm weight).
3. **Print Decal Specifications**: Records bounding coordinates, decal height/width in centimeters, front/back placement markers, and font metrics.
4. **Print-Ready Document Assembly**: Generates a self-contained, printable HTML/PDF spec sheet ready for garment cutting, sublimation printing, and factory stitching.

---

## 8. Security & Production Engineering

- **No Client Secrets**: The frontend contains zero Hugging Face or LLM tokens; all external API requests pass through the Express gateway.
- **In-Memory Rate Limiting**: [serveur/middleware/rateLimit.js](file:///d:/ISI%20Projects/Thirduni%202/serveur/middleware/rateLimit.js) prevents denial-of-service and quota exhaustion.
- **Safe Parsing & Sanitization**: Strict input bounds (prompts capped at 2000 chars, color hex validation via `#RRGGBB` regex, seed range verification).
- **Graceful Degradation**: If external image generation is queued or rate-limited, user designs, colors, uploaded artwork, and text decals continue to operate seamlessly.

---

## 9. Repository Blueprint

```
d:\ISI Projects\Thirduni 2\
├── public/
│   ├── garments/               # 3D Garment GLB Models & Credits
│   │   ├── hoodie/             # Hoodie mesh, textures & conversion scripts
│   │   ├── dress/              # Evening Dress mesh & materials
│   │   ├── suit/               # Tailored Suit mesh
│   │   ├── caftan/ & karakou/  # Traditional cultural garments
│   │   └── credits.html        # Open-source CC-BY model attributions
│   ├── tryon/                  # On-Device MediaPipe WASM & Pose Model
│   │   ├── wasm/               # WebAssembly binaries (SIMD & non-SIMD)
│   │   └── pose_landmarker_lite.task
│   ├── logo designili no BG.png # Transparent brand emblem
│   └── shirt_baked.glb         # High-poly PBR base t-shirt mesh
├── serveur/                    # Node.js + Express Backend
│   ├── middleware/             # Rate limiting & security guards
│   ├── route/                  # REST API routes (dalle, nlp, tryon)
│   ├── scripts/                # Evaluation & benchmark scripts
│   ├── services/
│   │   ├── darja.js            # Algerian Darja cultural NLP engine
│   │   ├── huggingface.js      # FLUX.1 Schnell Gradio Space orchestrator
│   │   ├── colors.js           # Hex shades & palette harmonies
│   │   └── tryon.js            # Server-side neural try-on fallback
│   ├── test/                   # Automated backend test suites & fixtures
│   └── index.js                # Server entry point & route registration
├── src/                        # React + Three.js Frontend
│   ├── canvas/                 # Three.js 3D Viewport Components
│   │   ├── CameraRig.jsx       # Dynamic responsive camera orbit
│   │   ├── Garment.jsx         # GLTF Loader, PBR materials & Decal mapping
│   │   ├── GarmentTextDecal.jsx# Dynamic 3D text projector
│   │   ├── BackDrop.jsx        # Soft accumulative contact shadow plane
│   │   └── ModelRotator.jsx    # Interactive touch/drag rotation controller
│   ├── comp/                   # UI Components
│   │   ├── AIPicker.jsx        # AI prompt drawer (Darja & English)
│   │   ├── ColorPicker.jsx     # Garment & trim palette selector
│   │   ├── TextPicker.jsx      # Typography, font & layout editor
│   │   ├── FilePiker.jsx       # Image & decal artwork upload
│   │   ├── GarmentSelector.jsx # Switch between T-shirt, Hoodie, Dress, Suit
│   │   └── Tab.jsx             # Active indicator tabs with tooltips
│   ├── config/                 # State & Utility Helpers
│   │   ├── textTexture.js      # Offscreen 2D canvas text rasterizer
│   │   ├── logoMask.js         # Canvas alpha cutout mask processor
│   │   ├── exportSpecSheet.js  # Automated tech pack generator
│   │   └── designHistory.js    # Undo/redo lookbook state management
│   ├── store/                  # Valtio reactive proxy store (index.js)
│   ├── tryon/                  # MediaPipe Web Worker & Pose Tracking
│   │   ├── WearIt.jsx          # Live camera modal & viewport overlay
│   │   ├── fitPose.js          # Anatomical landmark transformation math
│   │   └── pose.worker.js      # Dedicated WebAssembly worker
│   ├── pages/                  # Top-Level Views (Home.jsx, Costumizer.jsx)
│   ├── App.jsx                 # Application layout & animated ambient studio
│   └── index.css               # Luxury Atelier dark glassmorphic design system
├── ARCHITECTURE.md             # In-depth architectural blueprint
└── README.md                   # Project overview, quickstart & team attributions
```
