// Duplicate hosts should not be indexed. The production Vercel alias also
// redirects. Preview hosts and workers.dev get noindex; vercel.app redirects.
(function () {
  var host = location.hostname;
  if (host === 'holybiblegpt.com' || host === 'localhost' || host === '127.0.0.1') return;
  var duplicate = host.endsWith('.vercel.app') || host.endsWith('.workers.dev');
  if (!duplicate) return;
  var meta = document.createElement('meta');
  meta.name = 'robots';
  meta.content = 'noindex, nofollow';
  document.head.appendChild(meta);
  if (host.endsWith('.vercel.app')) {
    location.replace('https://holybiblegpt.com' + location.pathname + location.search + location.hash);
  }
})();
