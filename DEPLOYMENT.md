# Cloudflare Pages Deployment Guide

## Quick Setup

### 1. Connect Repository
1. Go to Cloudflare Pages dashboard
2. Click "Create a project"
3. Connect your GitHub/GitLab repository
4. Select the repository containing this website

### 2. Build Configuration

```yaml
Framework preset:     None
Build command:        node build.js
Build output:         dist
Root directory:       /
Node.js version:      18 or later (recommended: 20)
```

### 3. Environment Variables
No environment variables needed! The build script uses only built-in Node.js modules.

### 4. Deploy
Click "Save and Deploy" - that's it!

## How Deployment Works

1. **Trigger**: Push to main branch (or your configured branch)
2. **Build**: Cloudflare Pages runs `node build.js`
   - Reads `data.json`
   - Pre-renders all HTML pages with actual content
   - Fetches Medium RSS feed for blog posts
   - Copies all static assets to `dist/`
3. **Deploy**: Serves files from `dist/` folder globally via Cloudflare CDN
4. **Result**: Fast, SEO-friendly static site

## Updating Content

### To update any content:
1. Edit `data.json` on your local machine or directly on GitHub
2. Commit and push changes
3. Cloudflare Pages automatically rebuilds and redeploys
4. Live in ~1 minute

### To add a blog post:
Just publish on Medium! The build script fetches your latest 6 posts automatically.

## Performance Benefits

### Before (Client-Side Rendering)
- HTML: ~15 KB (empty divs)
- JavaScript: Fetches data.json (~8 KB)
- Render: Client-side (slower LCP)
- SEO: Poor (bots see empty page)

### After (Static Site Generation)
- HTML: ~25 KB (full content)
- JavaScript: Only for interactivity (nav, footer)
- Render: Instant (HTML already has content)
- SEO: Perfect (bots see full page)

## Rollback

If something goes wrong:
1. Go to Cloudflare Pages dashboard
2. Navigate to your project
3. Click on "Deployments"
4. Find a previous successful deployment
5. Click "Rollback to this deployment"

## Custom Domains

1. In Cloudflare Pages project settings
2. Go to "Custom domains"
3. Add your domain (e.g., `aswinpradeepc.com`)
4. Follow DNS configuration instructions
5. SSL/TLS is automatic via Cloudflare

## Headers & Redirects

Your `_headers` and `_redirects` files are automatically copied to the `dist/` folder during build, so all Cloudflare Pages configurations work as expected.

## Troubleshooting

### Build fails
- Check build logs in Cloudflare Pages dashboard
- Verify `data.json` is valid JSON (use a JSON validator)
- Ensure all referenced images in `data.json` exist in `images/` folder

### Medium posts not showing
- Check if Medium username is correct in `data.json` (`meta.medium_username`)
- RSS2JSON API might be rate-limiting - posts will show on next successful build
- Fallback message shows automatically if posts can't be fetched

### Site looks different
- Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)
- Check if all CSS files are in `dist/` folder
- Verify build completed successfully in Cloudflare

## Build Logs

Access build logs in Cloudflare Pages:
1. Go to your project
2. Click on latest deployment
3. View "Build logs" tab
4. You should see:
```
🚀 Building static site...
📄 Building index.html...
📄 Building experience.html...
...
✅ Build complete! Output in ./dist/
```

## Advanced: Custom Build Settings

If you need to customize the build:
- Edit `build.js` to change rendering logic
- Update `package.json` to add build dependencies
- Commit and push changes - builds automatically

---

**Questions?** Check [BUILD.md](BUILD.md) for technical details about the build system.
