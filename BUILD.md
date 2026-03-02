# Static Site Generation Build System

This website now uses **Static Site Generation (SSG)** to pre-render all content from `data.json` at build time, improving SEO while maintaining all interactive features.

## 🚀 Quick Start

### Build the site
```bash
npm run build
```

This generates a static version of the site in the `dist/` folder with:
- ✅ Pre-rendered content from `data.json`
- ✅ All interactive features intact (swipe navigation, responsive design)
- ✅ SEO-optimized HTML with actual content visible to search engines
- ✅ Fetched Medium blog posts (with fallback)

### Preview locally
```bash
# Preview the built site
npm run preview

# Or run the source directly (for development)
npm run dev
```

## 📝 How It Works

### Build Process
1. Reads `data.json` containing all site content
2. For each HTML page, injects pre-rendered content into placeholder divs
3. Removes client-side rendering scripts (no longer needed)
4. Keeps `nav.js` and `footer.js` for interactive features (swipe, responsive nav)
5. Fetches Medium RSS feed and pre-renders blog posts
6. Copies all static assets to `dist/`

### What's Preserved
- ✅ **Swipe navigation** on mobile (in nav.js)
- ✅ **Responsive design** and all CSS
- ✅ **Navigation highlighting** for active page
- ✅ **All visual styling** - zero visual changes
- ✅ **Progressive enhancement** - works without JS

### Key Benefits
- 🎯 **Perfect SEO** - Search engines see full content immediately
- ⚡ **Faster LCP** - No client-side data fetching
- 📱 **Better mobile performance** - Less JavaScript execution
- 🤖 **Bot-friendly** - Social media previews work correctly
- 🔧 **Easy updates** - Edit `data.json`, rebuild, deploy

## 🔄 Updating Content

1. Edit `data.json` with your new content
2. Run `npm run build`
3. Deploy the `dist/` folder

## ☁️ Cloudflare Pages Deployment

### Build Configuration
```
Build command:    node build.js
Build output:     dist
Root directory:   /
```

### Environment Requirements
- Node.js 18+ (Cloudflare Pages has this by default)
- No additional dependencies needed

### Deploy Workflow
1. Push changes to your repository
2. Cloudflare Pages automatically runs `node build.js`
3. Serves files from `dist/` folder
4. Done! ✨

### Headers & Redirects
The build script copies `_headers` and `_redirects` files to `dist/` automatically, so your Cloudflare Pages configuration works as expected.

## 📁 Project Structure

```
.
├── build.js              # SSG build script
├── package.json          # Build commands
├── data.json             # Single source of truth for content
├── *.html                # Source HTML templates
├── nav.js                # Navigation + swipe logic (preserved)
├── footer.js             # Footer rendering (preserved)
├── style.css             # All styles
├── images/               # Static assets
├── _headers              # Cloudflare headers
├── _redirects            # Cloudflare redirects
└── dist/                 # Built site (generated, do not edit)
```

## 🛠️ Maintenance

### Adding a New Page
1. Create the HTML template with a placeholder div (e.g., `<div id="new-page-content"></div>`)
2. Add rendering logic to `build.js`
3. Update `data.json` with the content
4. Update `nav.js` to add the page to navigation

### Updating Existing Content
Just edit `data.json` and rebuild. No code changes needed!

### Troubleshooting
- **Medium posts not showing?** The build script has a fallback if the API is unreachable. Posts will show when the API is accessible.
- **Changes not reflected?** Make sure you're running `npm run build` after editing files.
- **Swipe not working?** Check that `nav.js` is being copied to `dist/` correctly.

## 🎨 No Visual Changes

The site looks and behaves **exactly the same** as before. The only difference is that content is now pre-rendered in HTML instead of being fetched and rendered by JavaScript at runtime.

## 📊 SEO Improvements

Before (CSR):
```html
<div id="home-content"></div>
<!-- Search engines see empty divs -->
```

After (SSG):
```html
<div id="home-content">
  <h1>Aswin Pradeep C</h1>
  <p>Software Engineer. I build backends...</p>
  <!-- Full content visible to search engines -->
</div>
```

---

**Note**: The `dist/` folder is in `.gitignore` because it's generated during deployment. Never edit files in `dist/` directly - always edit source files and rebuild.
