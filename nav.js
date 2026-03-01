// nav.js — inject shared navigation
(function () {
  const pages = [
    { href: 'index.html',    label: 'Home'     },
    { href: 'experience.html',     label: 'Experience'     },
    { href: 'projects.html', label: 'Projects' },
    { href: 'activities.html',   label: 'Activities'   },
    { href: 'writing.html',  label: 'Writing'  },
    { href: 'contact.html',  label: 'Contact'  },
  ];

  // Detect active page
  const current = window.location.pathname.split('/').pop() || 'index.html';

  const nav = document.getElementById('nav');
  if (!nav) return;

  const inner = document.createElement('div');
  inner.className = 'nav-inner';

  // Logo
  const logo = document.createElement('a');
  logo.href = 'index.html';
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
    const isActive = current === p.href || (current === '' && p.href === 'index.html');
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
    // Get current page filename
    let pathname = window.location.pathname;
    let filename = pathname.split('/').pop();
    
    // Handle various edge cases
    if (!filename || filename === '' || filename === '/') {
      return 'index.html';
    }
    
    // If no extension, assume it's the root
    if (!filename.includes('.')) {
      return 'index.html';
    }
    
    return filename;
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
