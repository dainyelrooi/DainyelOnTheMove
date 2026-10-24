// Sign-in belongs to the private owner desk. Public realtime readers still use
// the same App Check protected database without starting the Auth iframe.
import { getAuth } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import { app } from './firebase.js';

export const auth = getAuth(app);
