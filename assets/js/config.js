export const APP_CONFIG = {
  // Local mode works immediately after upload to GitHub Pages.
  // For real shared Ideas + Mindmaps, set enabled:true and paste your Firebase web config.
  firebase: {
    enabled: false,
    roomId: "replace-with-a-long-random-room-id",
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: ""
  },

  // Convenience-only lock for admin.html. This does NOT provide real security.
  // Leave empty to disable. To set one, put a SHA-256 hex hash here.
  adminPinHash: ""
};
