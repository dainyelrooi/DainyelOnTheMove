import { doc, onSnapshot } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import { db } from './firebase.js';

const statusDocument = doc(db, 'siteStatus', 'current');
const places = [...document.querySelectorAll('[data-location-place]')];
const updatedLabels = [...document.querySelectorAll('[data-location-updated]')];

const legacyPlace = document.getElementById('location-place');
const legacyUpdated = document.getElementById('location-updated');
if (legacyPlace && !places.includes(legacyPlace)) places.push(legacyPlace);
if (legacyUpdated && !updatedLabels.includes(legacyUpdated)) updatedLabels.push(legacyUpdated);

function setText(nodes, text) {
  nodes.forEach(node => { node.textContent = text; });
}

function formatUpdated(timestamp) {
  if (!timestamp || typeof timestamp.toDate !== 'function') return 'Updated just now';
  return 'Updated ' + timestamp.toDate().toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}

if (places.length || updatedLabels.length) {
  onSnapshot(statusDocument, snapshot => {
    if (!snapshot.exists()) {
      document.querySelectorAll('[data-location-card]').forEach(card => { card.hidden = true; });
      setText(places, 'Currently exploring somewhere new');
      setText(updatedLabels, 'No current location shared');
      return;
    }

    const currentLocation = snapshot.data();
    const city = String(currentLocation.city || '').trim();
    const country = String(currentLocation.country || '').trim();
    if (!city || !country) {
      document.querySelectorAll('[data-location-card]').forEach(card => { card.hidden = true; });
      setText(places, 'Currently exploring somewhere new');
      setText(updatedLabels, 'No current location shared');
      return;
    }

    document.querySelectorAll('[data-location-card]').forEach(card => { card.hidden = false; });
    setText(places, city + ', ' + country);
    setText(updatedLabels, formatUpdated(currentLocation.updatedAt));
    document.dispatchEvent(new CustomEvent('site:check-in',{detail:{city,country,updatedAt:currentLocation.updatedAt?.toDate?.().toISOString()}}));
  }, () => {
    setText(updatedLabels, 'Location update is temporarily unavailable');
  });
}
