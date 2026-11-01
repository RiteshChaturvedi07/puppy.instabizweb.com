# 🐾 TeddyPups U.A.E. — Premium Puppy Adoption Platform

A high-performance, production-ready static web platform cloned and refactored from **TeddyPups U.A.E.**, Dubai’s premier boutique for miniature, teacup, and teddy bear puppies.

Fully optimized for static hosting (Netlify, Vercel, GitHub Pages) and zero-dependency local previews.

---

## 📖 Project Overview

TeddyPups U.A.E. provides an inviting, storybook-style digital experience for prospective pet parents. This project includes the complete frontend presentation layer with interactive filtering, responsive gallery layouts, storybook mascot animations, expandable Q&A notes, and WhatsApp inquiry integrations.

### Key Highlights:
- **Clean Static Codebase:** Flattened root architecture free of scraper artifacts, third-party trackers, and telemetry tokens.
- **Pure Client-Side Interactivity:** Accordions, modal dialogues, catalog filters, and image galleries operate with pure vanilla JavaScript with zero runtime server requirements.
- **Fast & Lightweight:** Unminified, human-readable HTML documents with direct relative media links and optimized assets.
- **Netlify & GitHub Ready:** Includes `netlify.toml` pre-configured for pretty URLs, security headers, and asset caching.

---

## 🛠 Tech Stack

- **Markup:** HTML5 (Semantic, accessible, human-readable formatting)
- **Styling:** Modern CSS3, Custom Properties / CSS Variables, Tailwind CSS utility classes
- **Interactivity:** Vanilla JavaScript (`assets/js/main.js`) + Next.js client hydration bundle
- **Typography & Assets:** Local Web Open Font Format (`.woff2`), modern responsive images (`.webp`, `.avif`, `.jpg`, `.png`), and streaming MP4 video previews
- **Deployment:** Zero-config static hosting (`netlify.toml` included)

---

## ✨ Features Implemented

1. **Available Puppies Catalog (`/puppies`)**:
   - Multi-attribute filtering (Origin: *Everywhere, Imported, Korean Teacup*; Breeds: *Maltipoo, Pomeranian, Poodle, Cavapoo, Shih Tzu*; Gender: *Boys, Girls*).
   - Dynamic counter showing real-time matches.
   - Smooth card transitions and direct links to individual puppy profiles.

2. **Puppy Profiles (`/puppies/[slug]`)**:
   - 20 complete puppy profiles (e.g. `/puppies/maltipoo-max-male`).
   - Interactive photo stack and video gallery slider.
   - Specifications card with direct WhatsApp inquiry CTA (`+971 54 167 6733`).

3. **Questions & Answers Pinboard (`/faq`)**:
   - Corkboard push-pin UI with 9 interactive folded-note accordions.
   - "Sniff out a question" live search box that instantly filters questions on the board.
   - Smooth CSS grid unfolding animations.

4. **Wall of Happy Endings (`/happy-families`)**:
   - Polaroid-style gallery showcasing clients and their puppies with floating angles and tape badge accents.

5. **Adoption Journey Guide (`/how-it-works`)**:
   - 4-step adoption process breakdown, Dubai showroom information, and delivery & collection details.

6. **Contact & Showroom (`/contact`)**:
   - Storybook-style stationery inquiry form, direct contact info, and Google Maps showroom location.

7. **Storybook Transitions**:
   - Quilted blanket page curtain transition (`RouteCurtain`) with walking mascot dog and paw trail canvas.

---

## 📁 Repository Structure

```text
├── assets/
│   └── js/
│       └── main.js             # Pure vanilla JavaScript client controller
├── brand/                      # Brand assets (logo, favicons)
├── cursor/                     # Custom cursor assets
├── media/                      # 150+ high-resolution puppy photos & videos
├── puppies/                    # Puppies catalog & 20 individual puppy profiles
│   ├── maltipoo-max-male/
│   ├── korean-teacup-maltipoo-female/
│   └── ...
├── contact/                    # Contact page (index.html)
├── faq/                        # FAQ page (index.html)
├── gone-home/                  # Adopted puppies archive (index.html)
├── happy-families/             # Testimonials & gallery (index.html)
├── how-it-works/               # Adoption process page (index.html)
├── _next/                      # Minified CSS stylesheets & client bundles
├── index.html                  # Homepage
├── puppies.html                # Puppies catalog fallback
├── contact.html                # Contact page fallback
├── faq.html                    # FAQ page fallback
├── happy-families.html         # Happy families fallback
├── how-it-works.html           # How it works fallback
├── gone-home.html              # Gone home fallback
├── netlify.toml                # Netlify deployment configuration
├── package.json                # Project manifest & npm scripts
├── server.js                   # Zero-dependency local Node.js preview server
└── .gitignore                  # Git ignore rules
```

---

## 🚀 Local Setup & Preview

### Option 1: Native Node.js Preview Server (Recommended)
Requires Node.js (no npm install required):
```bash
npm start
```
Open [http://localhost:3001](http://localhost:3001) in your browser.

### Option 2: Any Static Web Server
Because the project is 100% static, you can use any static file server:
```bash
npx serve .
```
or with Python:
```bash
python -m http.server 3000
```

---

## 🌐 Netlify Deployment

1. **Push to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: TeddyPups UAE production-ready static site"
   git branch -M main
   git remote add origin https://github.com/<your-username>/teddypups-uae.git
   git push -u origin main
   ```

2. **Deploy to Netlify**:
   - Log in to [Netlify](https://app.netlify.com/).
   - Click **Add new site** > **Import an existing project**.
   - Select your GitHub repository.
   - Build settings will automatically detect `netlify.toml`:
     - **Publish directory:** `.`
     - **Build command:** *(leave empty or `npm run build`)*
   - Click **Deploy Site**.

---

## 📄 License
MIT License. Content and branding assets are properties of their respective owners.
