self.addEventListener('install', function (event) {
    // Service worker installed. PWA requires an install listener minimum.
});

self.addEventListener('fetch', function (event) {
    // Pass-through fetch listener to satisfy PWA requirements.
});
