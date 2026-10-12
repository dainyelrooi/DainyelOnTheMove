import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import {
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import { auth, db } from './firebase.js';

const ownerEmail = 'dainyelr@gmail.com';
const statusDocument = doc(db, 'siteStatus', 'current');
const form = document.getElementById('checkin-form');
const actions = document.getElementById('location-actions');
const openButton = document.getElementById('checkin-open');
const clearButton = document.getElementById('checkin-clear');
const place = document.getElementById('location-place');
const updated = document.getElementById('location-updated');
const error = document.getElementById('checkin-error');
const ownerHint = document.getElementById('location-owner-hint');

let isOwner = false;
let currentLocation = null;

function formatUpdated(timestamp) {
  if (!timestamp?.toDate) return 'Updated just now';
  return `Updated ${timestamp.toDate().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}`;
}

function renderLocation() {
  place.textContent = currentLocation ? `${currentLocation.city}, ${currentLocation.country}` : 'Currently exploring somewhere new';
  updated.textContent = currentLocation ? formatUpdated(currentLocation.updatedAt) : 'No current location shared';
  clearButton.hidden = !isOwner || !currentLocation;
}

onSnapshot(statusDocument, snapshot => {
  currentLocation = snapshot.exists() ? snapshot.data() : null;
  renderLocation();
}, () => {
  updated.textContent = 'Location update is temporarily unavailable';
});

onAuthStateChanged(auth, user => {
  isOwner = Boolean(user && user.email === ownerEmail && user.emailVerified);
  actions.hidden = !isOwner;
  ownerHint.hidden = isOwner;
  if (!isOwner) {
    form.hidden = true;
    openButton.setAttribute('aria-expanded', 'false');
  }
  renderLocation();
});

openButton.addEventListener('click', () => {
  form.hidden = !form.hidden;
  openButton.setAttribute('aria-expanded', String(!form.hidden));
  error.hidden = true;
  if (!form.hidden) document.getElementById('checkin-city').focus();
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!isOwner) return;
  const city = document.getElementById('checkin-city').value.trim();
  const country = document.getElementById('checkin-country').value.trim();
  if (!city || !country) {
    error.textContent = 'Add both a city and a country.';
    error.hidden = false;
    return;
  }
  const submit = form.querySelector('[type="submit"]');
  submit.disabled = true;
  try {
    await setDoc(statusDocument, { city, country, updatedAt: serverTimestamp() });
    form.reset();
    form.hidden = true;
    openButton.setAttribute('aria-expanded', 'false');
    error.hidden = true;
  } catch {
    error.textContent = 'The location could not be saved. Please try again.';
    error.hidden = false;
  } finally {
    submit.disabled = false;
  }
});

clearButton.addEventListener('click', async () => {
  if (!isOwner) return;
  clearButton.disabled = true;
  try {
    await deleteDoc(statusDocument);
  } catch {
    error.textContent = 'The location could not be cleared. Please try again.';
    error.hidden = false;
  } finally {
    clearButton.disabled = false;
  }
});
