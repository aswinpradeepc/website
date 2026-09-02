// nav.js — inject shared navigation
(function () {
  // Order here drives both the nav bar and the mobile swipe sequence.
  const pages = [
    { href: '/',           label: 'Home'       },
    { href: '/blog',       label: 'Blog'       },
    { href: '/experience', label: 'Experience' },
    { href: '/projects',   label: 'Projects'   },
    { href: '/activities', label: 'Activities' },
    { href: '/contact',    label: 'Contact'    },
  ];

  // Detect active page - normalize to remove .html extension
  let currentPath = window.location.pathname;
  // Remove .html extension if present
  if (currentPath.endsWith('.html')) {
    currentPath = currentPath.slice(0, -5);
  }
  // Ensure root path is '/'
  if (currentPath === '' || currentPath === '/index') {
    currentPath = '/';
  }
  // Ensure path doesn't end with / unless it's root
  if (currentPath !== '/' && currentPath.endsWith('/')) {
    currentPath = currentPath.slice(0, -1);
  }
  const current = currentPath;

  const nav = document.getElementById('nav');
  if (!nav) return;

  const inner = document.createElement('div');
  inner.className = 'nav-inner';

  // Logo
  const logo = document.createElement('a');
  logo.href = '/';
  logo.className = 'nav-logo';
  logo.textContent = 'apc';
  inner.appendChild(logo);

  // Links
  const ul = document.createElement('ul');
  ul.className = 'nav-links';

  pages.forEach(p => {
    const li = document.createElement('li');
    const a  = document.createElement('a');
    a.href = p.href;
    a.textContent = p.label;
    const isActive = current === p.href;
    if (isActive) a.classList.add('active');
    li.appendChild(a);
    ul.appendChild(li);
  });

  inner.appendChild(ul);

  // ── Theme toggle ──
  // The head script has already stamped data-theme; this only flips it.
  const THEME_KEY = 'theme';
  const themeBtn = document.createElement('button');
  themeBtn.type = 'button';
  themeBtn.className = 'theme-toggle';
  themeBtn.innerHTML = `
    <svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
    <svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4.2"/>
      <path d="M12 1.8v2.2M12 20v2.2M4.4 4.4l1.6 1.6M18 18l1.6 1.6M1.8 12h2.2M20 12h2.2M4.4 19.6l1.6-1.6M18 6l1.6-1.6"/>
    </svg>
  `;

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light');
    // Read the colour back out of the cascade rather than repeating a hex here,
    // so style.css stays the only place the palette is written down.
    const meta = document.querySelector('meta[name="theme-color"]');
    const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
    if (meta && bg) meta.setAttribute('content', bg);
    const label = theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
    themeBtn.setAttribute('aria-label', label);
    themeBtn.setAttribute('title', label);
  }

  // Light unless the head script found a stored dark choice — the OS setting is
  // deliberately not consulted.
  applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');

  themeBtn.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(THEME_KEY, next); } catch {}
    applyTheme(next);
  });

  inner.appendChild(themeBtn);
  nav.appendChild(inner);

  nav.setAttribute('aria-label', 'Site');

  // ── Prev / next links at the foot of the page ──
  // Built from the same `pages` array as the swipe gesture below, so the two
  // always agree — and the links double as the visible hint that swiping works.
  const pageIndex = pages.findIndex(p => p.href === current);

  if (pageIndex !== -1) {
    const main = document.querySelector('main');
    if (main) {
      const prev = pages[pageIndex - 1];
      const next = pages[pageIndex + 1];

      const pageNav = document.createElement('nav');
      pageNav.className = 'page-nav';
      pageNav.setAttribute('aria-label', 'Previous and next page');

      if (prev) {
        const a = document.createElement('a');
        a.className = 'page-nav-prev';
        a.href = prev.href;
        a.rel = 'prev';
        a.textContent = `\u2190 ${prev.label}`;
        pageNav.appendChild(a);
      }

      if (next) {
        const a = document.createElement('a');
        a.className = 'page-nav-next';
        a.href = next.href;
        a.rel = 'next';
        a.textContent = `${next.label} \u2192`;
        pageNav.appendChild(a);
      }

      if (pageNav.childElementCount) main.appendChild(pageNav);
    }
  }

  // ── Swipe Navigation (Mobile) ──
  let touchStartX = 0;
  let touchEndX = 0;
  let touchStartY = 0;
  let touchEndY = 0;
  const swipeThreshold = 75; // minimum distance for swipe

  function getCurrentPage() {
    // Normalize current path
    let pathname = window.location.pathname;
    
    // Remove .html extension if present
    if (pathname.endsWith('.html')) {
      pathname = pathname.slice(0, -5);
    }
    
    // Handle root/index cases
    if (pathname === '' || pathname === '/index' || pathname === '/index.html') {
      return '/';
    }
    
    // Ensure path doesn't end with / unless it's root
    if (pathname !== '/' && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }
    
    return pathname;
  }

  function handleSwipe() {
    const swipeDistanceX = touchEndX - touchStartX;
    const swipeDistanceY = Math.abs(touchEndY - touchStartY);
    
    // Ignore if swipe is too small or too vertical
    if (Math.abs(swipeDistanceX) < swipeThreshold) return;
    if (swipeDistanceY > Math.abs(swipeDistanceX) * 0.5) return; // Prevent diagonal swipes
    
    const currentPage = getCurrentPage();
    const currentIndex = pages.findIndex(p => p.href === currentPage);
    
    if (currentIndex === -1) return;

    let nextIndex;
    if (swipeDistanceX > 0) {
      // Swipe right → previous page
      nextIndex = currentIndex - 1;
    } else {
      // Swipe left → next page
      nextIndex = currentIndex + 1;
    }

    if (nextIndex >= 0 && nextIndex < pages.length) {
      window.location.href = pages[nextIndex].href;
    }
  }

  document.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    touchEndY = e.changedTouches[0].screenY;
    handleSwipe();
  }, { passive: true });
})();
