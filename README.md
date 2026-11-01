# TeddyPups U.A.E. — Local Machine Setup

This folder contains the complete, runnable local version of **TeddyPups U.A.E.** (Premium teacup & teddy bear puppies in Dubai).

---

## 🚀 How to Run Locally

### Option 1: Using npm (Recommended)
```bash
npm start
```
*(or `npm run dev`)*

### Option 2: Using pure Node.js (Zero installation required)
```bash
node server.js
```

---

## 🌐 Open in Browser
Once started, open:
👉 **[http://localhost:3001](http://localhost:3001)** *(or **http://localhost:3000** if port 3001 is reconfigured)*

---

## ✨ Features Included

1. **Complete Page Routing**:
   - **Home (`/`)**: Mascot intro curtain, running animations, interactive puppy cards, reviews, and booking flow.
   - **Puppies Catalog (`/puppies`)**: Filterable listings with breeds, genders, and statuses.
   - **Puppy Detail Pages (`/puppies/[slug]`)**: All 20 puppy profile pages (e.g. `/puppies/maltipoo-max-male`).
   - **Happy Families (`/happy-families`)**: Polaroid gallery and testimonials.
   - **How It Works (`/how-it-works`)**: Stepper, Dubai delivery info, and travel pass.
   - **FAQ (`/faq`)**: Interactive accordion questions and answers.
   - **Contact & Visit (`/contact`)**: Showroom location in Downtown Dubai and contact links.
   - **Gone Home (`/gone-home`)**: Previously adopted puppies.

2. **Full Next.js Client-Side Hydration**:
   - Client-side transitions and animations work smoothly without page reloads.
   - Serves React Server Component (RSC) payloads for Next.js internal router navigation.

3. **Built-in Next.js Image Optimizer & Disk Cache**:
   - Handles `/_next/image?url=...` requests seamlessly.
   - Automatically caches requested images to disk (`_next_image_cache/`) for fast, offline-ready performance.

4. **Media & Video Support**:
   - Handles HTTP 206 Partial Content range requests for seamless video playback and seeking.

5. **Zero External Dependencies**:
   - Built on native Node.js `http` and `fs` modules — no `npm install` required!
