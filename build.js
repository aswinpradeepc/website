#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');

// ── Helpers ──

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      copyFile(srcPath, destPath);
    }
  }
}

function fetch(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 10000 }, (res) => {
      // Reject non-200 up front, otherwise an error page or a 429 body gets
      // handed to JSON.parse and surfaces as a confusing parse error.
      if (res.statusCode !== 200) {
        res.resume();
        reject(new Error(`HTTP ${res.statusCode} from ${url}`));
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('timeout', () => req.destroy(new Error(`timed out after 10s: ${url}`)));
    req.on('error', reject);
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// rss2json's free tier is rate-limited and intermittently flaky. A single blip
// used to bake the "nothing published yet" fallback into a live deploy, so
// retry a few times before believing it.
async function fetchWithRetry(url, attempts = 3) {
  let lastErr;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fetch(url);
    } catch (err) {
      lastErr = err;
      if (i < attempts) {
        const backoff = 1000 * i;
        console.log(`   ⚠️  attempt ${i}/${attempts} failed (${err.message}) — retrying in ${backoff}ms`);
        await sleep(backoff);
      }
    }
  }
  throw lastErr;
}

// Medium appends an RSS tracking suffix (?source=rss-…) to every link.
function cleanPostUrl(link) {
  try {
    const u = new URL(link);
    u.search = '';
    u.hash = '';
    return u.toString();
  } catch {
    return link;
  }
}

// Pre-render the footer that footer.js builds at runtime, so dist/ needs no
// fetch to render a complete page. Keep in sync with footer.js.
function renderFooter(meta) {
  const year = new Date().getFullYear();
  return `
        <div class="footer-inner">
          <div class="footer-links">
            <a href="mailto:${meta.email}">Email</a>
            <a href="${meta.links.github}" target="_blank" rel="noopener">GitHub</a>
            <a href="${meta.links.linkedin}" target="_blank" rel="noopener">LinkedIn</a>
            <a href="${meta.links.medium}" target="_blank" rel="noopener">Medium</a>
            <a href="${meta.links.x}" target="_blank" rel="noopener">X</a>
            <a href="${meta.links.devbio}" target="_blank" rel="noopener">devb.io</a>
          </div>
          <span class="footer-copy">© ${meta.name} ${year}</span>
        </div>
  `;
}

// Inline the footer markup and drop the now-redundant footer.js script tag.
function bakeFooter(html, meta) {
  return html
    .replace(
      '<footer id="footer"></footer>',
      `<footer id="footer">${renderFooter(meta)}</footer>`
    )
    .replace(/\s*<script src="\/?footer\.js"><\/script>/, '');
}

// Build the _redirects file: the hand-written rules, plus one short link per
// entry in data.json's "blog" array (/blog/<slug> → the post itself).
// 302 rather than 301 so a slug can be repointed later without fighting
// browsers that have cached a permanent redirect.
function buildRedirects(blog) {
  const base = fs.readFileSync('./_redirects', 'utf8').trimEnd();
  const posts = blog || [];
  const seen = new Set();

  const lines = posts.map(({ slug, url }) => {
    if (!slug || !url) {
      throw new Error(`blog entry needs both "slug" and "url": ${JSON.stringify({ slug, url })}`);
    }
    if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
      throw new Error(`blog slug "${slug}" must be lowercase letters, numbers and hyphens`);
    }
    if (seen.has(slug)) {
      throw new Error(`duplicate blog slug "${slug}"`);
    }
    seen.add(slug);
    return `/blog/${slug}`.padEnd(20) + url + '  302';
  });

  return `${base}\n${lines.join('\n')}\n`;
}

// ── Main Build ──

(async () => {
  console.log('🚀 Building static site...\n');

  const data = JSON.parse(fs.readFileSync('./data.json', 'utf8'));
  const distDir = './dist';

  // Clean and create dist directory
  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true });
  }
  fs.mkdirSync(distDir);

  // ═══════════════════════════════════════════════════════════
  // 1. INDEX
  // ═══════════════════════════════════════════════════════════

  console.log('📄 Building index.html...');
  let indexHtml = fs.readFileSync('./index.html', 'utf8');
  
  const { meta, about } = data;
  const indexContent = `
    <div class="fade-up">
      <h1 class="home-name">${meta.name}</h1>
      <p class="home-tagline">${meta.tagline}</p>
    </div>

    <section class="fade-up">
      <div class="intro-block">
        <figure class="profile-photo">
          <img src="/images/aswin-pradeep-c-profile-pic.jpg" alt="Aswin Pradeep C" width="148" height="148" loading="lazy" decoding="async" />
          <figcaption>Aswin Pradeep C in 2026</figcaption>
        </figure>
        <div class="about-block">
          ${about.slice(0, 2).map(p => `<p>${p}</p>`).join('')}
        </div>
      </div>
      <div class="about-block">
        ${about.slice(2).map(p => `<p>${p}</p>`).join('')}
      </div>
    </section>
  `;

  indexHtml = indexHtml.replace(
    '<div id="home-content"></div>',
    `<div id="home-content">${indexContent}</div>`
  );

  // Remove the content-loading script, keep nav.js and footer.js
  indexHtml = indexHtml.replace(
    /<script>\s*\(async \(\) => \{[\s\S]*?\}\)\(\);\s*<\/script>\s*<\/body>/,
    '</body>'
  );

  fs.writeFileSync(path.join(distDir, 'index.html'), bakeFooter(indexHtml, meta));

  // ═══════════════════════════════════════════════════════════
  // 2. EXPERIENCE
  // ═══════════════════════════════════════════════════════════

  console.log('📄 Building experience.html...');
  let expHtml = fs.readFileSync('./experience.html', 'utf8');

  const { experience, skills, education, sideQuests } = data;

  const questItems = sideQuests.map(q => `
      <div class="edu-block">
        <div class="edu-inst"><a href="${q.link}" target="_blank" rel="noopener">${q.name}</a></div>
        <div class="edu-degree">${q.detail}</div>
        ${q.meta ? `<div class="edu-meta">${q.meta}</div>` : ''}
      </div>
  `).join('');

  const timelineItems = experience.map((w, i) => {
    const isOpen = i === 0;
    const bullets = w.bullets.map(b => `<li>${b}</li>`).join('');
    const tags = w.tech.map(t => `<span class="tag">${t}</span>`).join('');
    return `
      <div class="timeline-item fade-up">
        <div class="timeline-dot ${isOpen ? 'open' : ''}"></div>
        <div class="timeline-header">
          <span class="timeline-company">${w.company}</span>
          <span class="timeline-period">${w.period}</span>
        </div>
        <div class="timeline-role">${w.role} · ${w.location}</div>
        <ul class="timeline-bullets">${bullets}</ul>
        <div class="tags">${tags}</div>
      </div>
    `;
  }).join('');

  const skillRows = Object.entries(skills).map(([cat, vals]) => `
    <tr>
      <td>${cat}</td>
      <td>${vals.join(', ')}</td>
    </tr>
  `).join('');

  const expContent = `
    <div class="fade-up">
      <span class="page-label">Aswin Pradeep C</span>
      <h1 class="page-title">Experience</h1>
    </div>

    <section>
      <div class="section-head">
        <span class="section-label">Experience</span>
        <a class="resume-link" href="/cv" target="_blank" rel="noopener">Résumé (PDF) ↓</a>
      </div>
      <div class="timeline">
        ${timelineItems}
      </div>
    </section>

    <hr class="divider">

    <section class="fade-up">
      <span class="section-label">Education</span>
      <div class="edu-block">
        <div class="edu-inst">${education.institution}</div>
        <div class="edu-degree">${education.degree}</div>
        <div class="edu-meta">${education.period} · ${education.grade}</div>
      </div>
    </section>

    <hr class="divider">

    <section class="fade-up">
      <span class="section-label">Curious Side Quests</span>
      ${questItems}
    </section>

    <hr class="divider">

    <section class="fade-up">
      <span class="section-label">Skills</span>
      <table class="skills-table">
        <tbody>${skillRows}</tbody>
      </table>
    </section>
  `;

  expHtml = expHtml.replace(
    '<div id="experience-content"></div>',
    `<div id="experience-content">${expContent}</div>`
  );

  expHtml = expHtml.replace(
    /<script>\s*\(async \(\) => \{[\s\S]*?\}\)\(\);\s*<\/script>\s*<\/body>/,
    '</body>'
  );

  fs.writeFileSync(path.join(distDir, 'experience.html'), bakeFooter(expHtml, meta));

  // ═══════════════════════════════════════════════════════════
  // 3. PROJECTS
  // ═══════════════════════════════════════════════════════════

  console.log('📄 Building projects.html...');
  let projHtml = fs.readFileSync('./projects.html', 'utf8');

  const { projects, moreProjects, opensource } = data;

  const projectItems = projects.map(p => {
    const links = [
      p.github ? `<a class="subtle" href="${p.github}" target="_blank" rel="noopener">GitHub ↗</a>` : '',
      p.live   ? `<a class="subtle" href="${p.live}"   target="_blank" rel="noopener">Live ↗</a>`   : '',
    ].filter(Boolean).join('');
    const tags = p.tech.map(t => `<span class="tag">${t}</span>`).join('');
    return `
      <div class="project-item fade-up">
        <div class="project-name-row">
          <span class="project-name">${p.name}</span>
          ${links}
        </div>
        <p class="project-desc">${p.desc}</p>
        <div class="tags">${tags}</div>
      </div>
    `;
  }).join('');

  const moreItems = (moreProjects || []).map(p => {
    const tags = p.tech.map(t => `<span class="tag">${t}</span>`).join('');
    return `
      <a class="project-card fade-up" href="${p.github}" target="_blank" rel="noopener">
        <div class="project-name-row">
          <span class="project-name">${p.name}</span>
          <span class="card-arrow">GitHub ↗</span>
        </div>
        <p class="project-desc">${p.desc}</p>
        <div class="tags">${tags}</div>
      </a>
    `;
  }).join('');

  const ossItems = opensource.map(o => {
    let imageHtml = '';
    if (o.image) {
      const altText = o.alt || `${o.project} - ${o.desc}`;
      imageHtml = `
        <div class="event-image">
          <img src="${o.image}" alt="${altText}" loading="lazy" />
        </div>
      `;
    }

    return `
      <div class="oss-item fade-up">
        <div class="oss-name">${o.project}</div>
        <p class="oss-desc">${o.desc}</p>
        <div class="oss-links">
          <a class="subtle" href="${o.url}"     target="_blank" rel="noopener">Repository ↗</a>
          <a class="subtle" href="${o.profile}" target="_blank" rel="noopener">My profile ↗</a>
        </div>
        ${imageHtml}
      </div>
    `;
  }).join('');

  const projContent = `
    <div class="fade-up">
      <span class="page-label">Aswin Pradeep C</span>
      <h1 class="page-title">Projects</h1>
    </div>

    <section>
      <span class="section-label">Selected work</span>
      ${projectItems}
    </section>

    <hr class="divider">

    <section>
      <span class="section-label">Open Source</span>
      ${ossItems}
    </section>

    <hr class="divider">

    <section>
      <span class="section-label">More projects</span>
      <div class="project-grid">${moreItems}</div>
      <p style="margin-top:1.5rem;font-size:.8rem;color:var(--muted);">
        More on <a class="subtle" href="${meta.links.github}" target="_blank" rel="noopener">GitHub ↗</a>
      </p>
    </section>
  `;

  projHtml = projHtml.replace(
    '<div id="projects-content"></div>',
    `<div id="projects-content">${projContent}</div>`
  );

  projHtml = projHtml.replace(
    /<script>\s*\(async \(\) => \{[\s\S]*?\}\)\(\);\s*<\/script>\s*<\/body>/,
    '</body>'
  );

  fs.writeFileSync(path.join(distDir, 'projects.html'), bakeFooter(projHtml, meta));

  // ═══════════════════════════════════════════════════════════
  // 4. ACTIVITIES
  // ═══════════════════════════════════════════════════════════

  console.log('📄 Building activities.html...');
  let actHtml = fs.readFileSync('./activities.html', 'utf8');

  const { activities } = data;

  const renderItems = (items) => {
    return items.map(e => {
      const tags = e.tags.map(t => `<span class="tag">${t}</span>`).join('');

      let imageHtml = '';
      if (e.image) {
        const altText = e.alt || `Aswin Pradeep C - ${e.title} ${e.subtitle}`;
        imageHtml = `
          <div class="event-image">
            <img src="${e.image}" alt="${altText}" loading="lazy" />
          </div>
        `;
      }

      let linkHtml = '';
      if (e.link) {
        linkHtml = `
          <div style="margin-top: 0.5rem;">
            <a class="subtle" href="${e.link}" target="_blank" rel="noopener">View details ↗</a>
          </div>
        `;
      }

      // Optional, like image and link — without this a missing subtitle
      // renders the literal string "undefined".
      const subtitleHtml = e.subtitle
        ? `<div class="event-subtitle">${e.subtitle}</div>`
        : '';

      return `
        <div class="event-item fade-up">
          <div class="event-header">
            <span class="event-title">${e.title}</span>
            <span class="event-date">${e.date}</span>
          </div>
          ${subtitleHtml}
          <p class="event-desc">${e.description}</p>
          <div class="tags">${tags}</div>
          ${imageHtml}
          ${linkHtml}
        </div>
      `;
    }).join('');
  };

  const communityItems = renderItems(activities.community);
  const achievementItems = renderItems(activities.achievements);

  const actContent = `
    <div class="page-head fade-up">
      <div>
        <span class="page-label">Aswin Pradeep C</span>
        <h1 class="page-title">Activities</h1>
      </div>
      <a class="worth-link" href="/worth-your-time">some stuff worth your time &#8594;</a>
    </div>

    <section>
      <span class="section-label">Community</span>
      ${communityItems}
    </section>

    <hr class="divider">

    <section>
      <span class="section-label">Achievements</span>
      ${achievementItems}
    </section>
  `;

  actHtml = actHtml.replace(
    '<div id="activities-content"></div>',
    `<div id="activities-content">${actContent}</div>`
  );

  actHtml = actHtml.replace(
    /<script>\s*\(async \(\) => \{[\s\S]*?\}\)\(\);\s*<\/script>\s*<\/body>/,
    '</body>'
  );

  fs.writeFileSync(path.join(distDir, 'activities.html'), bakeFooter(actHtml, meta));

  // ═══════════════════════════════════════════════════════════
  // 5. CONTACT
  // ═══════════════════════════════════════════════════════════

  console.log('📄 Building contact.html...');
  let contactHtml = fs.readFileSync('./contact.html', 'utf8');

  const contactContent = `
    <div class="fade-up">
      <span class="page-label">Aswin Pradeep C</span>
      <h1 class="page-title">Contact</h1>
    </div>

    <section class="fade-up">
      <div class="contact-block">
        <p>Questions, opportunities, collaborations, or if you just want to say hi — email is the best way to reach me.</p>
        <a class="contact-email" href="mailto:${meta.email}">${meta.email}</a>
      </div>

      <div class="contact-socials">
        <div class="contact-social-row">
          <span class="platform">github</span>
          <a href="${meta.links.github}" target="_blank" rel="noopener">github.com/aswinpradeepc</a>
        </div>
        <div class="contact-social-row">
          <span class="platform">linkedin</span>
          <a href="${meta.links.linkedin}" target="_blank" rel="noopener">linkedin.com/in/aswinpradeepc</a>
        </div>
        <div class="contact-social-row">
          <span class="platform">x</span>
          <a href="${meta.links.x}" target="_blank" rel="noopener">x.com/aswinpradeepc</a>
        </div>
        <div class="contact-social-row">
          <span class="platform">devb.io</span>
          <a href="${meta.links.devbio}" target="_blank" rel="noopener">devb.io/aswinpradeepc</a>
        </div>
      </div>

      <p style="margin-top:1.5rem;font-size:.8rem;color:var(--muted);">
        Based in ${meta.location}
      </p>
    </section>
  `;

  contactHtml = contactHtml.replace(
    '<div id="contact-content"></div>',
    `<div id="contact-content">${contactContent}</div>`
  );

  contactHtml = contactHtml.replace(
    /<script>\s*\(async \(\) => \{[\s\S]*?\}\)\(\);\s*<\/script>\s*<\/body>/,
    '</body>'
  );

  fs.writeFileSync(path.join(distDir, 'contact.html'), contactHtml);

  // ═══════════════════════════════════════════════════════════
  // 6. BLOG (Fetch Medium RSS)
  // ═══════════════════════════════════════════════════════════

  // ═══════════════════════════════════════════════════════════
  // 5b. WORTH YOUR TIME (unlisted — linked only from Activities)
  // ═══════════════════════════════════════════════════════════

  console.log('📄 Building worth-your-time.html...');
  let worthHtml = fs.readFileSync('./worth-your-time.html', 'utf8');

  const { worthYourTime } = data;

  const worthItems = worthYourTime.map(w => {
    const title = w.link
      ? `<a class="blog-title" href="${w.link}" target="_blank" rel="noopener">${w.name} &#8599;</a>`
      : `<span class="blog-title">${w.name}</span>`;
    return `
        <div class="blog-item fade-up">
          ${title}
          <div class="blog-date">${w.note}</div>
        </div>`;
  }).join('');

  const worthContent = `
    <div class="fade-up">
      <span class="page-label">Aswin Pradeep C</span>
      <h1 class="page-title">Worth Your Time</h1>
    </div>

    <section class="fade-up">
      ${worthItems}
    </section>
  `;

  worthHtml = worthHtml.replace(
    '<div id="worth-content"></div>',
    `<div id="worth-content">${worthContent}</div>`
  );

  worthHtml = worthHtml.replace(
    /<script>\s*\(async \(\) => \{[\s\S]*?\}\)\(\);\s*<\/script>\s*<\/body>/,
    '</body>'
  );

  fs.writeFileSync(path.join(distDir, 'worth-your-time.html'), bakeFooter(worthHtml, meta));

  console.log('📄 Building blog.html...');
  let blogPageHtml = fs.readFileSync('./blog.html', 'utf8');

  const username = data.meta.medium_username || 'aswinpradeepc';
  let blogHTML = '';

  let posts;
  try {
    const feedUrl = encodeURIComponent(`https://medium.com/feed/@${username}`);
    const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${feedUrl}`;
    const json = JSON.parse(await fetchWithRetry(apiUrl));

    if (json.status !== 'ok') {
      throw new Error(`feed returned status "${json.status}": ${json.message || 'no message'}`);
    }
    posts = json.items || [];
  } catch (err) {
    // Reaching here means the feed is genuinely unreachable, not just empty.
    // Publishing the "nothing published yet" fallback over real posts would be
    // worse than not deploying at all, so stop and leave the last build live.
    console.error(`\n❌ Could not fetch Medium posts: ${err.message}`);
    console.error('   Refusing to build a blog page that hides existing posts.');
    process.exit(1);
  }

  if (posts.length > 0) {
    // Category and topics come from data.json, matched to the feed by URL.
    // A post we hold no entry for still renders — just with title and date.
    const entryByUrl = new Map((data.blog || []).map(p => [cleanPostUrl(p.url), p]));

    blogHTML = posts.slice(0, 6).map(post => {
      const link = cleanPostUrl(post.link);
      const entry = entryByUrl.get(link);
      const date = new Date(post.pubDate).toLocaleDateString('en-GB', {
        year: 'numeric', month: 'short', day: 'numeric'
      });
      const kicker = entry && entry.category
        ? `<span class="blog-kicker">${entry.category}</span>\n          `
        : '';
      const topics = entry && entry.tags && entry.tags.length
        ? ` &middot; ${entry.tags.slice(0, 3).join(', ')}`
        : '';
      return `
        <div class="blog-item fade-up">
          ${kicker}<a class="blog-title" href="${link}" target="_blank" rel="noopener">${post.title}</a>
          <div class="blog-date">${date}${topics}</div>
        </div>
      `;
    }).join('');
    console.log(`   ✓ ${posts.length} post${posts.length === 1 ? '' : 's'} from Medium`);
  } else {
    // The feed answered and really is empty — the rickroll is the intended page.
    console.log('   ℹ️  Feed is empty, using the placeholder');
    blogHTML = `
      <div class="rick-zone">
        <p>Nothing published yet. Probably drafting something profound.</p>
        <a class="rick-btn" href="https://www.youtube.com/watch?v=dQw4w9WgXcQ" target="_blank" rel="noopener">view secret drafts</a>
      </div>
    `;
  }

  // Replace the blog-list div content (skeleton) with actual content or fallback
  blogPageHtml = blogPageHtml.replace(
    /<div id="blog-list">[\s\S]*?<\/div>\s*\n\s*<!-- Rick roll — hidden until no posts found -->\s*\n\s*<div class="rick-zone"[\s\S]*?<\/div>/,
    `<div id="blog-list">${blogHTML}</div>`
  );

  blogPageHtml = blogPageHtml.replace(
    /<script>\s*\(async \(\) => \{[\s\S]*?\}\)\(\);\s*<\/script>\s*<\/body>/,
    '</body>'
  );

  // ── Per-post structured data ──
  // The posts live on Medium, whose robots.txt blocks every major AI crawler
  // (ClaudeBot, GPTBot, Amazonbot, Applebot-Extended, meta-externalagent …), so
  // nothing written there is reachable by an AI index. This block is the only
  // description of them served from a domain that allows crawlers. Each
  // BlogPosting points at the Medium URL as its canonical location — the short
  // links under /blog/<slug> stay plain redirects.
  const SITE = 'https://aswinpradeepc.com';
  const authorNode = {
    '@type': 'Person',
    '@id': SITE + '#person',
    name: meta.name,
    url: SITE,
    jobTitle: 'Backend Engineer',
    sameAs: [meta.links.github, meta.links.linkedin, meta.links.x, meta.links.medium]
  };

  const described = (data.blog || []).filter(p => p.summary);

  const blogJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    '@id': `${SITE}/blog#blog`,
    name: `${meta.name} — Blog`,
    url: `${SITE}/blog`,
    inLanguage: 'en',
    author: authorNode,
    publisher: authorNode,
    blogPost: [...described]
      .sort((x, y) => y.date.localeCompare(x.date))
      .map(p => ({
        '@type': 'BlogPosting',
        headline: p.title,
        name: p.title,
        description: p.description,
        // The summary a crawler reads instead of the Medium body it can't fetch.
        abstract: p.summary,
        url: p.url,
        mainEntityOfPage: { '@type': 'WebPage', '@id': p.url },
        datePublished: p.date,
        inLanguage: 'en',
        timeRequired: p.readingTime,
        keywords: (p.tags || []).join(', '),
        about: (p.tags || []).map(t => ({ '@type': 'Thing', name: t })),
        author: { '@id': SITE + '#person' }
      }))
  };

  // The marker comment carries its own explanation and is matched whole, so
  // the build note never reaches the shipped page.
  const marker = /<!-- BLOG_JSONLD[\s\S]*?-->/;
  if (!marker.test(blogPageHtml)) {
    console.error('\n❌ blog.html is missing the BLOG_JSONLD marker.');
    console.error('   Refusing to ship a blog page with no structured data.');
    process.exit(1);
  }
  blogPageHtml = blogPageHtml.replace(
    marker,
    `<script type="application/ld+json">\n${JSON.stringify(blogJsonLd, null, 2)}\n  </script>`
  );
  console.log(`   ✓ structured data for ${described.length} post${described.length === 1 ? '' : 's'}`);

  fs.writeFileSync(path.join(distDir, 'blog.html'), bakeFooter(blogPageHtml, meta));

  // ── llms.txt ──
  // Plain-text site map for language models: an emerging convention, and the
  // one place the post summaries are served as prose rather than as markup.
  const plain = s => String(s).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

  const llms = `# ${meta.name}

> ${plain(meta.tagline)} Backend engineer in ${meta.location}, working in Python (Django, FastAPI) with Postgres and Redis, alongside LLM systems and self-hosting.

${(data.about || []).map(plain).join('\n\n')}

## Writing

Posts are published on Medium; the summaries below are written for this file.

${[...described].sort((x, y) => y.date.localeCompare(x.date)).map(p => `### ${p.title}
Published ${p.date}${p.publication ? ` in ${p.publication}` : ''} · ${p.url}
Topics: ${(p.tags || []).join(', ')}

${p.summary}

Takeaways:
${(p.takeaways || []).map(t => `- ${plain(t)}`).join('\n')}`).join('\n\n')}

## Pages
- Home: ${SITE}/
- Blog: ${SITE}/blog
- Experience: ${SITE}/experience
- Projects: ${SITE}/projects
- Activities: ${SITE}/activities
- Worth your time: ${SITE}/worth-your-time
- Contact: ${SITE}/contact
- Résumé (PDF): ${SITE}/cv

## Contact
- Email: ${meta.email}
- GitHub: ${meta.links.github}
- LinkedIn: ${meta.links.linkedin}
`;
  fs.writeFileSync(path.join(distDir, 'llms.txt'), llms);
  console.log('   ✓ llms.txt');

  // ═══════════════════════════════════════════════════════════
  // 7. Copy Static Assets
  // ═══════════════════════════════════════════════════════════

  // 404 gets the same baked footer as every other page
  const notFoundHtml = fs.readFileSync('./404.html', 'utf8');
  fs.writeFileSync(path.join(distDir, '404.html'), bakeFooter(notFoundHtml, meta));

  console.log('\n📦 Copying static assets...');

  const staticFiles = [
    'style.css',
    'nav.js',
    'data.json',
    'robots.txt',
    'humans.txt',
    'sitemap.xml',
    '_headers',
    'AswinPradeep_BackendEngineer.pdf'
  ];

  staticFiles.forEach(file => {
    if (fs.existsSync(file)) {
      copyFile(file, path.join(distDir, file));
      console.log(`   ✓ ${file}`);
    }
  });

  // _redirects is generated, not copied — it picks up the per-post short links
  fs.writeFileSync(path.join(distDir, '_redirects'), buildRedirects(data.blog));
  console.log(`   ✓ _redirects (+${(data.blog || []).length} post short links)`);

  // Copy favicon
  const faviconFiles = fs.readdirSync('.').filter(f => f.startsWith('favicon'));
  faviconFiles.forEach(file => {
    copyFile(file, path.join(distDir, file));
    console.log(`   ✓ ${file}`);
  });

  // Copy directories
  const dirs = ['images'];
  dirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      copyDir(dir, path.join(distDir, dir));
      console.log(`   ✓ ${dir}/`);
    }
  });

  console.log('\n✅ Build complete! Output in ./dist/\n');
})();
