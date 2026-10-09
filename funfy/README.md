# Funfy

Funfy is a playful sticker storefront with a browser-based design studio. Visitors can browse and filter sticker packs, upload artwork, add text and shapes, save a bag between visits, and export a transparent PNG.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Use `npm run build` to check a production build and `npm run lint` to run ESLint.

## What works today

- Responsive storefront with searchable product categories and quick-add sticker packs.
- Lazy-loaded Fabric.js design studio with image upload, text, shapes, layers, image tools, preview, and PNG export.
- Cart and cart thumbnails persisted in IndexedDB, with a localStorage fallback.
- Quantity and print-preference capture; the current prototype price is USD $0.50 per sticker.

## Before accepting real orders

The current cart is a locally saved bag, not a submitted order. Payment collection, shipping rates, production/fulfillment, customer order records, and secure long-term storage of print files still need to be connected. Do not represent the current checkout as live or collect card details in the browser. Add a trusted payment provider and fulfillment/storage integrations on the server, verify payment events, and make prices authoritative on the server before launch.

Some image tools are browser-side prototypes. Test them with representative artwork and connect a production-grade image/fulfillment workflow before promising print quality or delivery dates.
