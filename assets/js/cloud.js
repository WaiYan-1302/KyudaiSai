import { APP_CONFIG } from './config.js';

let firebase = null;
let db = null;
let auth = null;
let ready = false;

export async function initCloud() {
  if (!APP_CONFIG.firebase.enabled) return { enabled: false };
  try {
    const appMod = await import('https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js');
    const authMod = await import('https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js');
    const storeMod = await import('https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js');
    const app = appMod.initializeApp({
      apiKey: APP_CONFIG.firebase.apiKey,
      authDomain: APP_CONFIG.firebase.authDomain,
      projectId: APP_CONFIG.firebase.projectId,
      storageBucket: APP_CONFIG.firebase.storageBucket,
      messagingSenderId: APP_CONFIG.firebase.messagingSenderId,
      appId: APP_CONFIG.firebase.appId
    });
    auth = authMod.getAuth(app);
    await authMod.signInAnonymously(auth);
    db = storeMod.getFirestore(app);
    firebase = { authMod, storeMod };
    ready = true;
    return { enabled: true };
  } catch (error) {
    console.error('Cloud initialization failed', error);
    return { enabled: false, error };
  }
}

function roomDoc(collection, id) {
  return firebase.storeMod.doc(db, 'rooms', APP_CONFIG.firebase.roomId, collection, id);
}
function roomCollection(collection) {
  return firebase.storeMod.collection(db, 'rooms', APP_CONFIG.firebase.roomId, collection);
}

export async function getIdeas() {
  if (!ready) return null;
  const snap = await firebase.storeMod.getDocs(roomCollection('ideas'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addIdea(idea) {
  if (!ready) return null;
  const ref = await firebase.storeMod.addDoc(roomCollection('ideas'), idea);
  return { id: ref.id, ...idea };
}

export async function getMindmap(mapId = 'main') {
  if (!ready) return null;
  const ref = roomDoc('mindmaps', mapId);
  const snap = await firebase.storeMod.getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function saveMindmap(map) {
  if (!ready) return false;
  const ref = roomDoc('mindmaps', map.id || 'main');
  const { id, ...payload } = map;
  await firebase.storeMod.setDoc(ref, payload, { merge: true });
  return true;
}

export async function getTimeline(timelineId = 'main') {
  if (!ready) return null;
  const ref = roomDoc('timelines', timelineId);
  const snap = await firebase.storeMod.getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function saveTimeline(timeline) {
  if (!ready) return false;
  const ref = roomDoc('timelines', timeline.id || 'main');
  const { id, ...payload } = timeline;
  await firebase.storeMod.setDoc(ref, payload, { merge: true });
  return true;
}

export function cloudEnabled() { return ready; }
