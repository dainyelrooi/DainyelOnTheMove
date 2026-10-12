import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
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

// App Check verifies that requests originate from this website before Firebase
// Authentication or Firestore processes them. The Enterprise site key is public
// by design; the provider secret remains stored in Firebase.
export const appCheck = initializeAppCheck(app, {
  provider: new ReCaptchaEnterpriseProvider('6LcxOuwtAAAAAEnMXtF0hGIcnOIT8hUPWqDRWea9'),
  isTokenAutoRefreshEnabled: true
});

export const auth = getAuth(app);
export const db = getFirestore(app, 'dainyel-content');
