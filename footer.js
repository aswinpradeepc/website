// footer.js — inject shared footer with social links
(function () {
  const footer = document.getElementById('footer');
  if (!footer) return;

  fetch('./data.json')
    .then(r => r.json())
    .then(data => {
      const { meta } = data;
      const year = new Date().getFullYear();

      footer.innerHTML = `
        <div class="footer-inner">
          <div class="footer-links">
            <a href="mailto:${meta.email}">Email</a>
            <a href="${meta.links.github}" target="_blank" rel="noopener">GitHub</a>
            <a href="${meta.links.linkedin}" target="_blank" rel="noopener">LinkedIn</a>
            <a href="${meta.links.devbio}" target="_blank" rel="noopener">devb.io</a>
          </div>
          <span class="footer-copy">© ${meta.name} ${year}</span>
        </div>
      `;
    })
    .catch(() => {
      footer.innerHTML = `<div class="footer-inner"><span class="footer-copy">Aswin Pradeep C</span></div>`;
    });
})();
