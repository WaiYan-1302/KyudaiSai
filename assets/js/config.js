export const APP_CONFIG = {
  // Shared cloud storage for Ideas, Mindmaps, and Timeline.
  firebase: {
    enabled: true,
    roomId: "harmoq-cb4486680fc9479faae2eac8497318bf",
    apiKey: "AIzaSyDAwJIzrCZBg-Lwv58C-P9LU3Z_YJrhaa0",
    authDomain: "pr-platform-harmoq.firebaseapp.com",
    projectId: "pr-platform-harmoq",
    storageBucket: "pr-platform-harmoq.firebasestorage.app",
    messagingSenderId: "338350060682",
    appId: "1:338350060682:web:f82216c0a4a58ea1dae973"
  },

  // Convenience-only lock for admin.html. This does NOT provide real security.
  // Leave empty to disable. To set one, put a SHA-256 hex hash here.
  adminPinHash: ""
};
