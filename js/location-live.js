import { doc, onSnapshot } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import { db } from './firebase.js';

const statusDocument = doc(db, 'siteStatus', 'current');
const place = document.getElementById('location-place');
const updated = document.getElementById('location-updated');

function formatUpdated(timestamp) {
  if (!timestamp?.toDate) return 'Updated just now';
  return `Updated ${timestamp.toDate().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}`;
}

onSnapshot(statusDocument, snapshot => {
  if (!snapshot.exists()) {
    place.textContent = 'Currently exploring somewhere new';
    updated.textContent = 'No current location shared';
    return;
  }
  const currentLocation = snapshot.data();
  place.textContent = `${currentLocation.city}, ${currentLocation.country}`;
  updated.textContent = formatUpdated(currentLocation.updatedAt);
}, () => {
  updated.textContent = 'Location update is temporarily unavailable';
});