import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app-check.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';

// Firebase web configuration is public by design. Firestore access is protected
// by firestore.rules; never place service-account credentials in this file.
const firebaseConfig = {
  apiKey: 'AIzaSyDY2ZPgMrNNopoBJIDjTqta98szns5kRzs',
  authDomain: 'dainyelonthemove.firebaseapp.com',
  projectId: 'dainyelonthemove',
  appId: '1:910148159808:web:4078e7683c1891647b52a5',
  messagingSenderId: '910148159808'
};

export const app = initializeApp(firebaseConfig);

// Public readers and direct page services share this boundary. Give the static
// document its first paint before verification starts; dependants still wait
// for App Check before receiving the database or owner authentication instance.
if (typeof document !== 'undefined' && !document.hidden && typeof requestAnimationFrame === 'function') {
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

// App Check verifies that requests originate from this website before Firebase
// Authentication or Firestore processes them. The Enterprise site key is public
// by design; the provider secret remains stored in Firebase.
export const appCheck = initializeAppCheck(app, {
  provider: new ReCaptchaEnterpriseProvider('6LcxOuwtAAAAAMqs4D5acP36QnFqzMhUj4zhqcWs'),
  isTokenAutoRefreshEnabled: true
});

export const db = getFirestore(app, 'dainyel-content');
