import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
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
export const auth = getAuth(app);
export const db = getFirestore(app, 'dainyel-content');
