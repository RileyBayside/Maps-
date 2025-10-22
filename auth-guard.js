// auth-guard.js
(function () {
  const PUBLIC = new Set(['login.html']); // add '404.html' here if you like

  function currentPage() {
    const p = location.pathname.split('/').pop();
    return p || 'index.html';
  }
  function currentFullPath() {
    return location.pathname + location.search + location.hash;
  }
  function redirectToLogin() {
    try {
      sessionStorage.setItem('bayside_next', currentFullPath());
      localStorage.setItem('bayside_next', currentFullPath());
    } catch (_) {}
    const base = location.pathname.replace(/[^/]+$/, '');
    const url = new URL(base + 'login.html', location.origin);
    url.searchParams.set('next', currentFullPath());
    location.replace(url.toString());
  }

  function firebaseReady() {
    return new Promise((resolve) => {
      let tries = 0;
      (function check() {
        if (window.firebase && firebase.apps && firebase.apps.length) return resolve();
        if (++tries > 200) return resolve();
        setTimeout(check, 10);
      })();
    });
  }

  firebaseReady().then(() => {
    const page = currentPage();
    const openToPublic = PUBLIC.has(page);
    const auth = firebase.auth();

    auth.onAuthStateChanged((user) => {
      if (!user && !openToPublic) redirectToLogin();
      if (user && page === 'login.html') {
        // bounce from login if already signed in
        let next = new URLSearchParams(location.search).get('next');
        try {
          next = next || sessionStorage.getItem('bayside_next') || localStorage.getItem('bayside_next');
        } catch (_) {}
        if (next && !/login\.html$/i.test(next)) return location.replace(next);
        location.replace('index.html');
      }
    });
  });
})();
