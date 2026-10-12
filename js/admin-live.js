import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import {
  collection,
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
const signOutButton = document.getElementById('sign-out');
const setupToggle = document.getElementById('setup-toggle');
let stopPendingListener;

function showAuthMessage(message, isError = false) {
  authStatus.hidden = !message;
  authStatus.dataset.state = isError ? 'error' : 'success';
  authStatus.textContent = message;
}

function firebaseErrorMessage(error) {
  const messages = {
    'auth/invalid-credential': 'The password did not match this account.',
    'auth/user-not-found': 'No owner account exists yet. Use “Create owner account” first.',
    'auth/too-many-requests': 'There have been too many attempts. Wait a little and try again.',
    'auth/email-already-in-use': 'The owner account already exists. Sign in instead.',
    'auth/weak-password': 'Choose a stronger password with at least six characters.',
    'auth/operation-not-allowed': 'Email and password sign-in is not enabled in Firebase yet.'
  };
  return messages[error.code] || 'I could not complete that request. Please try again.';
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

function makePendingCard(questionDocument) {
  const data = questionDocument.data();
  const card = document.createElement('article');
  card.className = 'pending-card';

  const meta = document.createElement('p');
  meta.className = 'question-meta';
  meta.textContent = `${data.topic.replaceAll('-', ' ')}${data.displayName ? ` · ${data.displayName}` : ''}`;

  const question = document.createElement('p');
  question.className = 'pending-question';
  question.textContent = data.question;

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
        status: 'published',
        answer,
        answeredAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      pendingStatus.hidden = false;
      pendingStatus.dataset.state = 'success';
      pendingStatus.textContent = 'Published. The answer is now visible on the Q&A page.';
    } catch {
      pendingStatus.hidden = false;
      pendingStatus.dataset.state = 'error';
      pendingStatus.textContent = 'That answer could not be published. Check the connection and try again.';
    } finally {
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
        status: 'rejected',
        updatedAt: serverTimestamp()
      });
      pendingStatus.hidden = false;
      pendingStatus.dataset.state = 'success';
      pendingStatus.textContent = 'Dismissed. This question will remain private.';
    } catch {
      pendingStatus.hidden = false;
      pendingStatus.dataset.state = 'error';
      pendingStatus.textContent = 'That question could not be dismissed. Please try again.';
    } finally {
      dismissButton.disabled = false;
    }
  });

  actions.append(publishButton, dismissButton);
  card.append(meta, question, answerLabel, answerInput, actions);
  return card;
}

onAuthStateChanged(auth, user => {
  const isOwner = user?.email === ownerEmail && user.emailVerified;
  authPanel.hidden = Boolean(user && isOwner);
  dashboard.hidden = !isOwner;

  if (!user) {
    if (stopPendingListener) stopPendingListener();
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

  const pendingQuestions = query(
    collection(db, 'questions'),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'asc')
  );
  if (stopPendingListener) stopPendingListener();
  stopPendingListener = onSnapshot(pendingQuestions, snapshot => {
    pendingList.replaceChildren();
    pendingStatus.hidden = true;
    if (snapshot.empty) {
      pendingStatus.hidden = false;
      pendingStatus.dataset.state = 'success';
      pendingStatus.textContent = 'You’re all caught up. New questions will appear here for review.';
      return;
    }
    snapshot.forEach(questionDocument => pendingList.append(makePendingCard(questionDocument)));
  }, () => {
    pendingStatus.hidden = false;
    pendingStatus.dataset.state = 'error';
    pendingStatus.textContent = 'I could not load the review queue. Check that the owner account is verified and try again.';
  });
});
