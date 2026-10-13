import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import { auth, db } from './firebase.js';

const ownerEmail = 'dainyelr@gmail.com';
const authPanel = document.getElementById('auth-panel');
const dashboard = document.getElementById('dashboard');
const authStatus = document.getElementById('auth-status');
const loginForm = document.getElementById('login-form');
const createForm = document.getElementById('create-form');
const pendingList = document.getElementById('pending-list');
const pendingStatus = document.getElementById('pending-status');
const publishedList = document.getElementById('published-list');
const publishedStatus = document.getElementById('published-status');
const signOutButton = document.getElementById('sign-out');
const setupToggle = document.getElementById('setup-toggle');
const fieldNotesList = document.getElementById('field-notes-admin-list');
const fieldNotesStatus = document.getElementById('field-notes-admin-status');
let stopPendingListener;
let stopPublishedListener;
let stopFieldNotesListener;

function showAuthMessage(message, isError = false) {
  authStatus.hidden = !message;
  authStatus.dataset.state = isError ? 'error' : 'success';
  authStatus.textContent = message;
}

function setStatus(element, message, isError = false) {
  element.hidden = false;
  element.dataset.state = isError ? 'error' : 'success';
  element.textContent = message;
}

function firebaseErrorMessage(error) {
  const messages = {
    'auth/invalid-credential': 'The password did not match this account.',
    'auth/user-not-found': 'No owner account exists yet. Use “Create owner account” first.',
    'auth/too-many-requests': 'There have been too many attempts. Wait a little and try again.',
    'auth/email-already-in-use': 'The owner account already exists. Sign in instead.',
    'auth/weak-password': 'Choose a stronger password with at least six characters.',
    'auth/operation-not-allowed': 'Email and password sign-in is not enabled in Firebase yet.',
    'auth/app-check-token-is-invalid': 'Firebase App Check is currently blocking sign-in. The site owner needs to update this security setting.',
    'auth/internal-error': 'Firebase App Check is currently blocking sign-in. The site owner needs to update this security setting.'
  };
  console.error('Firebase owner sign-in error:', error);
  return messages[error.code] || 'Firebase could not complete the sign-in request. Please try again shortly.';
}

loginForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (!loginForm.reportValidity()) return;
  const password = new FormData(loginForm).get('password');
  try {
    await signInWithEmailAndPassword(auth, ownerEmail, String(password));
    showAuthMessage('Signed in.');
  } catch (error) {
    showAuthMessage(firebaseErrorMessage(error), true);
  }
});

createForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (!createForm.reportValidity()) return;
  const password = String(new FormData(createForm).get('password'));
  try {
    const credential = await createUserWithEmailAndPassword(auth, ownerEmail, password);
    await sendEmailVerification(credential.user);
    showAuthMessage(`A verification link has been sent to ${ownerEmail}. Verify the address, then return here and sign in.`);
    await signOut(auth);
  } catch (error) {
    showAuthMessage(firebaseErrorMessage(error), true);
  }
});

setupToggle.addEventListener('click', () => {
  const creating = createForm.hidden;
  createForm.hidden = !creating;
  loginForm.hidden = creating;
  setupToggle.textContent = creating ? 'Back to sign in' : 'First time? Create owner account';
  showAuthMessage('');
});

signOutButton.addEventListener('click', async () => {
  await signOut(auth);
  showAuthMessage('');
});

function questionMeta(data) {
  return `${data.topic.replaceAll('-', ' ')}${data.displayName ? ` · ${data.displayName}` : ''}`;
}

function createQuestionHeader(questionDocument) {
  const data = questionDocument.data();
  const meta = document.createElement('p');
  meta.className = 'question-meta';
  meta.textContent = questionMeta(data);
  const question = document.createElement('p');
  question.className = 'pending-question';
  question.textContent = data.question;
  return { data, meta, question };
}

async function deleteQuestion(questionDocument, button, statusElement) {
  if (!window.confirm('Delete this question permanently? This cannot be undone.')) return;
  button.disabled = true;
  try {
    await deleteDoc(doc(db, 'questions', questionDocument.id));
    setStatus(statusElement, 'Question deleted permanently.');
  } catch {
    setStatus(statusElement, 'That question could not be deleted. Please try again.', true);
    button.disabled = false;
  }
}

function createDeleteButton(questionDocument, statusElement) {
  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.className = 'danger-button';
  deleteButton.textContent = 'Delete question';
  deleteButton.addEventListener('click', () => deleteQuestion(questionDocument, deleteButton, statusElement));
  return deleteButton;
}

function makePendingCard(questionDocument) {
  const { meta, question } = createQuestionHeader(questionDocument);
  const card = document.createElement('article');
  card.className = 'pending-card';

  const answerLabel = document.createElement('label');
  answerLabel.className = 'field-label';
  answerLabel.htmlFor = `answer-${questionDocument.id}`;
  answerLabel.textContent = 'Your answer';

  const answerInput = document.createElement('textarea');
  answerInput.id = `answer-${questionDocument.id}`;
  answerInput.className = 'answer-input';
  answerInput.maxLength = 3000;
  answerInput.required = true;
  answerInput.placeholder = 'Write the reply you want to share publicly…';

  const actions = document.createElement('div');
  actions.className = 'pending-actions';
  const publishButton = document.createElement('button');
  publishButton.type = 'button';
  publishButton.className = 'primary-button';
  publishButton.textContent = 'Publish answer';
  publishButton.addEventListener('click', async () => {
    const answer = answerInput.value.trim();
    if (answer.length < 2) {
      answerInput.setCustomValidity('Please write an answer before publishing.');
      answerInput.reportValidity();
      answerInput.addEventListener('input', () => answerInput.setCustomValidity(''), { once: true });
      return;
    }
    publishButton.disabled = true;
    try {
      await updateDoc(doc(db, 'questions', questionDocument.id), {
        status: 'published', answer, answeredAt: serverTimestamp(), updatedAt: serverTimestamp()
      });
      setStatus(pendingStatus, 'Published. The answer is now visible on the Q&A page.');
    } catch {
      setStatus(pendingStatus, 'That answer could not be published. Check the connection and try again.', true);
      publishButton.disabled = false;
    }
  });

  const dismissButton = document.createElement('button');
  dismissButton.type = 'button';
  dismissButton.className = 'secondary-button';
  dismissButton.textContent = 'Dismiss';
  dismissButton.addEventListener('click', async () => {
    dismissButton.disabled = true;
    try {
      await updateDoc(doc(db, 'questions', questionDocument.id), {
        status: 'rejected', updatedAt: serverTimestamp()
      });
      setStatus(pendingStatus, 'Dismissed. This question will remain private.');
    } catch {
      setStatus(pendingStatus, 'That question could not be dismissed. Please try again.', true);
      dismissButton.disabled = false;
    }
  });

  actions.append(publishButton, dismissButton, createDeleteButton(questionDocument, pendingStatus));
  card.append(meta, question, answerLabel, answerInput, actions);
  return card;
}

function makePublishedCard(questionDocument) {
  const { data, meta, question } = createQuestionHeader(questionDocument);
  const card = document.createElement('article');
  card.className = 'pending-card answered-card';

  const answerLabel = document.createElement('label');
  answerLabel.className = 'field-label';
  answerLabel.htmlFor = `published-answer-${questionDocument.id}`;
  answerLabel.textContent = 'Public answer';

  const answerInput = document.createElement('textarea');
  answerInput.id = `published-answer-${questionDocument.id}`;
  answerInput.className = 'answer-input';
  answerInput.maxLength = 3000;
  answerInput.value = data.answer || '';

  const actions = document.createElement('div');
  actions.className = 'pending-actions';
  const saveButton = document.createElement('button');
  saveButton.type = 'button';
  saveButton.className = 'primary-button';
  saveButton.textContent = 'Save answer changes';
  saveButton.addEventListener('click', async () => {
    const answer = answerInput.value.trim();
    if (answer.length < 2) {
      answerInput.setCustomValidity('An answer needs at least two characters.');
      answerInput.reportValidity();
      answerInput.addEventListener('input', () => answerInput.setCustomValidity(''), { once: true });
      return;
    }
    saveButton.disabled = true;
    try {
      await updateDoc(doc(db, 'questions', questionDocument.id), {
        answer, answeredAt: serverTimestamp(), updatedAt: serverTimestamp()
      });
      setStatus(publishedStatus, 'Answer updated on the public Q&A page.');
    } catch {
      setStatus(publishedStatus, 'That answer could not be updated. Please try again.', true);
      saveButton.disabled = false;
    }
  });

  actions.append(saveButton, createDeleteButton(questionDocument, publishedStatus));
  card.append(meta, question, answerLabel, answerInput, actions);
  return card;
}

function makeFieldNotesCard(subscriberDocument) {
  const data = subscriberDocument.data();
  const card = document.createElement('article');
  card.className = 'pending-card answered-card';
  const meta = document.createElement('p');
  meta.className = 'question-meta';
  meta.textContent = 'Field Notes · subscribed';
  const email = document.createElement('p');
  email.className = 'pending-question';
  email.textContent = data.email;
  const actions = document.createElement('div');
  actions.className = 'pending-actions';
  const removeButton = document.createElement('button');
  removeButton.type = 'button';
  removeButton.className = 'danger-button';
  removeButton.textContent = 'Remove subscription';
  removeButton.addEventListener('click', async () => {
    if (!window.confirm(`Remove ${data.email} from Field Notes?`)) return;
    removeButton.disabled = true;
    try {
      await deleteDoc(doc(db, 'fieldNotes', subscriberDocument.id));
      setStatus(fieldNotesStatus, 'Subscription removed.');
    } catch {
      setStatus(fieldNotesStatus, 'That subscription could not be removed. Please try again.', true);
      removeButton.disabled = false;
    }
  });
  actions.append(removeButton);
  card.append(meta, email, actions);
  return card;
}

function subscribeToFieldNotes() {
  if (stopFieldNotesListener) stopFieldNotesListener();
  const subscribers = query(collection(db, 'fieldNotes'), orderBy('createdAt', 'desc'));
  stopFieldNotesListener = onSnapshot(subscribers, snapshot => {
    fieldNotesList.replaceChildren();
    if (snapshot.empty) {
      setStatus(fieldNotesStatus, 'No Field Notes subscriptions yet.');
      return;
    }
    fieldNotesStatus.hidden = true;
    snapshot.forEach(subscriberDocument => fieldNotesList.append(makeFieldNotesCard(subscriberDocument)));
  }, () => setStatus(fieldNotesStatus, 'I could not load Field Notes subscriptions. Please refresh and try again.', true));
}

function clearListeners() {
  if (stopPendingListener) stopPendingListener();
  if (stopPublishedListener) stopPublishedListener();
  if (stopFieldNotesListener) stopFieldNotesListener();
  stopPendingListener = undefined;
  stopPublishedListener = undefined;
  stopFieldNotesListener = undefined;
}

function subscribeToQuestions() {
  clearListeners();
  const pendingQuestions = query(collection(db, 'questions'), where('status', '==', 'pending'), orderBy('createdAt', 'asc'));
  const publishedQuestions = query(collection(db, 'questions'), where('status', '==', 'published'), orderBy('createdAt', 'desc'));

  stopPendingListener = onSnapshot(pendingQuestions, snapshot => {
    pendingList.replaceChildren();
    if (snapshot.empty) {
      setStatus(pendingStatus, 'You’re all caught up. New questions will appear here for review.');
      return;
    }
    pendingStatus.hidden = true;
    snapshot.forEach(questionDocument => pendingList.append(makePendingCard(questionDocument)));
  }, () => setStatus(pendingStatus, 'I could not load the review queue. Check that the owner account is verified and try again.', true));

  stopPublishedListener = onSnapshot(publishedQuestions, snapshot => {
    publishedList.replaceChildren();
    if (snapshot.empty) {
      setStatus(publishedStatus, 'No answers are published yet.');
      return;
    }
    publishedStatus.hidden = true;
    snapshot.forEach(questionDocument => publishedList.append(makePublishedCard(questionDocument)));
  }, () => setStatus(publishedStatus, 'I could not load the published answers. Please refresh and try again.', true));
}

onAuthStateChanged(auth, user => {
  const isOwner = user?.email === ownerEmail && user.emailVerified;
  authPanel.hidden = Boolean(user && isOwner);
  dashboard.hidden = !isOwner;

  if (!user) {
    clearListeners();
    return;
  }
  if (user.email !== ownerEmail) {
    signOut(auth);
    showAuthMessage('This sign-in is not the owner account.', true);
    return;
  }
  if (!user.emailVerified) {
    signOut(auth);
    showAuthMessage(`Verify ${ownerEmail} using the link in your inbox, then sign in again.`, true);
    return;
  }
  subscribeToQuestions();
  subscribeToFieldNotes();
});
