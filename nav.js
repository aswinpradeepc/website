// nav.js — inject shared navigation
(function () {
  const pages = [
    { href: '/',    label: 'Home'     },
    { href: '/experience',     label: 'Experience'     },
    { href: '/projects', label: 'Projects' },
    { href: '/activities',   label: 'Activities'   },
    { href: '/writing',  label: 'Writing'  },
    { href: '/contact',  label: 'Contact'  },
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
  nav.appendChild(inner);

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
