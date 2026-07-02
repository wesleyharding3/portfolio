# Wesley Harding — Portfolio

A static personal portfolio site. Hand-coded HTML / CSS / JS — no framework, no build
step, no dependencies. Dark editorial design (Fraunces · Geist · Fragment Mono) with a
choreographed load-in: decoded kickers, a flash-in name, a typed claim, and transition
styles borrowed from earth00's vector_3d materialize studies.

**Live:** _add your GitHub Pages / domain URL here_

## Cornerstone work

- **Showroom Inventory (wtf)** — a multi-tenant SaaS for fashion showrooms.
  Database-enforced tenant isolation (Postgres RLS), atomic QR check-in/out, a
  physical-to-digital source of truth (the QR binder and hangers ↔ the database),
  three role-based dashboards, Stripe payments, and earned-media analytics.
  Next.js · Supabase · Stripe.
- **earth00** — a global news-intelligence platform anchored by a multilingual NLP
  pipeline (keywords, entities, sentiment, local pgvector embeddings across ~48
  languages), an 18-handler ETL, statistical clustering, a Three.js 3D globe, a
  daily AI audio briefing, 7-platform auto-publishing, and a native iOS app.
  Node.js · PostgreSQL/pgvector · DeepL + Claude.

## Structure

```
index.html          all content, one long-scroll page
css/styles.css       design system + per-project brand palettes
js/showcase.js       Canvas2D interface gallery — 4 alternating transitions
js/main.js           shrinking nav, reveal variants, kicker decode, hero typing
assets/img/          optimized project imagery (+ storefronts/ live-site stills)
favicon*.png         site icons
Wesley_Harding_Portfolio.pdf
```

Each project section keeps its real brand identity: the chrome is aerospace-blue,
the **earth00** feature blooms into its authentic amber-on-black look, and **wtf**
carries its own wordmark and photography.

## Run locally

No build step. Serve the folder with any static server:

```bash
python3 -m http.server 4823
# open http://localhost:4823
```

## Deploy (GitHub Pages)

Push to GitHub, then in **Settings → Pages**, set the source to the `main` branch
(root). The site is plain static files, so it serves as-is.

## Accessibility & performance

- Content is visible without JavaScript; motion is purely additive.
- Honors `prefers-reduced-motion` (globe and reveals fall back to static).
- The globe pauses when offscreen; images are lazy-loaded.

---

Built from scratch. No template.
