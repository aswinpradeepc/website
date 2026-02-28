// nav.js — inject shared navigation
(function () {
  const pages = [
    { href: 'index.html',    label: 'Home'     },
    { href: 'work.html',     label: 'Work'     },
    { href: 'projects.html', label: 'Projects' },
    { href: 'events.html',   label: 'Events'   },
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
})();
