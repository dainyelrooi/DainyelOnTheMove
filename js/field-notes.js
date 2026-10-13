import { addDoc, collection, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import { db } from './firebase.js';

const form = document.getElementById('field-notes-form');
const status = document.getElementById('field-notes-status');

if (form && status) {
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const data = new FormData(form);
    if (String(data.get('company') || '').trim()) return;

    const button = form.querySelector('button[type="submit"]');
    const email = String(data.get('email') || '').trim().toLowerCase();
    button.disabled = true;
    status.hidden = false;
    status.dataset.state = 'success';
    status.textContent = 'Saving your place…';

    try {
      await addDoc(collection(db, 'fieldNotes'), {
        email,
        subscriptionConsent: true,
        status: 'subscribed',
        createdAt: serverTimestamp()
      });
      form.reset();
      status.dataset.state = 'success';
      status.textContent = 'You are on the Field Notes list. The first update will come when a new story or film is ready.';
    } catch (error) {
      status.dataset.state = 'error';
      status.textContent = error.code === 'permission-denied'
        ? 'The Field Notes list is not ready yet. Please try again soon.'
        : 'That did not go through. Please try again in a moment.';
    } finally {
      button.disabled = false;
    }
  });
}
