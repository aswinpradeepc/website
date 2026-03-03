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
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
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
  
  const { meta, now, about } = data;
  const indexContent = `
    <div class="fade-up">
      <h1 class="home-name">${meta.name}</h1>
      <p class="home-tagline">${meta.tagline}</p>
      <div class="home-nav-links">
        <a href="mailto:${meta.email}">${meta.email}</a>
        <a href="${meta.links.github}" target="_blank" rel="noopener">GitHub</a>
        <a href="${meta.links.linkedin}" target="_blank" rel="noopener">LinkedIn</a>
        <a href="${meta.links.x}" target="_blank" rel="noopener">X</a>
        <a href="${meta.links.devbio}" target="_blank" rel="noopener">devb.io</a>
      </div>
    </div>

    <section class="fade-up">
      <span class="section-label">Now</span>
      <div class="now-block">
        <p>${now}</p>
      </div>
    </section>

    <section class="fade-up">
      <span class="section-label">About</span>
      <div class="about-block">
        <p>${about}</p>
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

  fs.writeFileSync(path.join(distDir, 'index.html'), indexHtml);

  // ═══════════════════════════════════════════════════════════
  // 2. EXPERIENCE
  // ═══════════════════════════════════════════════════════════

  console.log('📄 Building experience.html...');
  let expHtml = fs.readFileSync('./experience.html', 'utf8');

  const { experience, skills, education } = data;

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
      <span class="section-label">Experience</span>
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
        <div class="edu-meta">${education.period} · CGPA ${education.cgpa}</div>
      </div>
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

  fs.writeFileSync(path.join(distDir, 'experience.html'), expHtml);

  // ═══════════════════════════════════════════════════════════
  // 3. PROJECTS
  // ═══════════════════════════════════════════════════════════

  console.log('📄 Building projects.html...');
  let projHtml = fs.readFileSync('./projects.html', 'utf8');

  const { projects, opensource } = data;

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
      <p style="margin-top:1.5rem;font-size:.8rem;color:var(--muted);">
        More on <a class="subtle" href="${meta.links.github}" target="_blank" rel="noopener">GitHub ↗</a>
      </p>
    </section>

    <hr class="divider">

    <section>
      <span class="section-label">Open Source</span>
      ${ossItems}
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

  fs.writeFileSync(path.join(distDir, 'projects.html'), projHtml);

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

      return `
        <div class="event-item fade-up">
          <div class="event-header">
            <span class="event-title">${e.title}</span>
            <span class="event-date">${e.date}</span>
          </div>
          <div class="event-subtitle">${e.subtitle}</div>
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
    <div class="fade-up">
      <span class="page-label">Aswin Pradeep C</span>
      <h1 class="page-title">Activities</h1>
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

  fs.writeFileSync(path.join(distDir, 'activities.html'), actHtml);

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
        <p>Questions, opportunities, collaborations, or just want to say hi — email is the best way to reach me.</p>
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
  // 6. WRITING (Fetch Medium RSS)
  // ═══════════════════════════════════════════════════════════

  console.log('📄 Building writing.html...');
  let writingHtml = fs.readFileSync('./writing.html', 'utf8');

  const username = data.meta.medium_username || 'aswinpradeepc';
  let blogHTML = '';

  try {
    const feedUrl = encodeURIComponent(`https://medium.com/feed/@${username}`);
    const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${feedUrl}`;
    const response = await fetch(apiUrl);
    const json = JSON.parse(response);

    if (json.status === 'ok' && json.items && json.items.length > 0) {
      blogHTML = json.items.slice(0, 6).map(post => {
        const date = new Date(post.pubDate).toLocaleDateString('en-GB', {
          year: 'numeric', month: 'short', day: 'numeric'
        });
        return `
        <div class="blog-item fade-up">
          <a class="blog-title" href="${post.link}" target="_blank" rel="noopener">${post.title}</a>
          <div class="blog-date">${date}</div>
        </div>
      `;
      }).join('');
    } else {
      throw new Error('No posts found');
    }
  } catch (err) {
    console.log('⚠️  Could not fetch Medium posts, using fallback');
    blogHTML = `
      <div class="rick-zone">
        <p>Nothing published yet. Probably drafting something profound.</p>
        <a class="rick-btn" href="https://www.youtube.com/watch?v=dQw4w9WgXcQ" target="_blank" rel="noopener">view secret drafts</a>
      </div>
    `;
  }

  // Replace the blog-list div content (skeleton) with actual content or fallback
  writingHtml = writingHtml.replace(
    /<div id="blog-list">[\s\S]*?<\/div>\s*\n\s*<!-- Rick roll — hidden until no posts found -->\s*\n\s*<div class="rick-zone"[\s\S]*?<\/div>/,
    `<div id="blog-list">${blogHTML}</div>`
  );

  writingHtml = writingHtml.replace(
    /<script>\s*\(async \(\) => \{[\s\S]*?\}\)\(\);\s*<\/script>\s*<\/body>/,
    '</body>'
  );

  fs.writeFileSync(path.join(distDir, 'writing.html'), writingHtml);

  // ═══════════════════════════════════════════════════════════
  // 7. Copy Static Assets
  // ═══════════════════════════════════════════════════════════

  console.log('\n📦 Copying static assets...');

  const staticFiles = [
    'style.css',
    'nav.js',
    'footer.js',
    'data.json',
    'robots.txt',
    'humans.txt',
    'sitemap.xml',
    '_headers',
    '_redirects',
    '404.html'
  ];

  staticFiles.forEach(file => {
    if (fs.existsSync(file)) {
      copyFile(file, path.join(distDir, file));
      console.log(`   ✓ ${file}`);
    }
  });

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
