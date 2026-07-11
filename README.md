# Wesley Harding — Portfolio

A static personal portfolio site. Hand-coded HTML / CSS / JS — no framework, no build
step, no dependencies, no webfonts. Editorial neutral: white paper, black Helvetica,
hairlines. A single spare page — sidebar nav + a work index — where each project
**pops up as a sandbox**: the real site, live or browsable, in a large modal.

**Live:** _add your domain URL here_

## Structure

```
index.html            the whole site — sidebar, work index, and every sandbox modal
css/styles.css        the design system, including the modal + sandbox
js/vitrine.js         opens/closes the modal; hotspots & tabs swap screens inside it
assets/img/logos/     brand wordmarks + earth00's circular mark
assets/img/stores/    faux-browse screenshots of the two live storefronts
assets/img/showcase/  real dashboard & app screenshots
favicon*.png          site icons
render.yaml           Render static-site blueprint
```

## The sandbox

The landing is spare: sidebar (name, work, about/contact) and a large clickable
work index — no body prose. Clicking any project, in the sidebar or the index,
pops its sandbox up in a modal. Esc / the scrim / × close it; without JavaScript
the modals fall back to `:target` and each project's screens simply stack.

What each sandbox holds:

- **earth00.com** — the real site, live in a sandboxed iframe (its headers allow it);
  Globe / Feed / App tabs offer static shots alongside.
- **bealice.com / wear-thefuture.com** — Shopify forbids framing its stores
  (`X-Frame-Options: DENY`), so these browse as full-page screenshots stitched
  together: the store's own nav (and BEALICE's menu drawer) is overlaid with
  invisible hotspots that swap pages, exactly like the live site. Nothing else
  is clickable.
- **Inventory** (`app.wear-thefuture.com`) — sends `SAMEORIGIN` and is login-gated,
  so it shows real dashboard screenshots via Dashboard / Press / The rack tabs.

## Run locally

No build step. Serve the folder with any static server:

```bash
python3 -m http.server 4823
# open http://localhost:4823
```

## Deploy

`render.yaml` is a Render static-site blueprint; the repo also serves as-is on
GitHub Pages (Settings → Pages → `main` branch, root).

---

Built from scratch. No template.
