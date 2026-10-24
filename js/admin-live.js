import {initContactInbox,clearContactInbox} from '../assets/contact-inbox.js';
import {initWebsiteDesk,clearWebsiteDesk} from '../assets/website-desk.js';
import { initOwnerAuth } from '../assets/admin-auth.js';
import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import { db } from './firebase.js';
import {initContentCalendar,clearContentCalendar} from '../assets/content-calendar.js';
import {initPublishingDesk as initJourneyStudio,clearPublishingDesk as clearJourneyStudio} from '../assets/publishing-desk.js';
import {initPostcardDesk,clearPostcardDesk} from '../assets/postcard-desk.js';
import {setReviewCount,failReviewCount,resetReviewCounts} from '../assets/admin-review-badges.js';

const pendingList = document.getElementById('pending-list');
const pendingStatus = document.getElementById('pending-status');
const publishedList = document.getElementById('published-list');
const publishedStatus = document.getElementById('published-status');
const fieldNotesList = document.getElementById('field-notes-admin-list');
const fieldNotesStatus = document.getElementById('field-notes-admin-status');
const communityPendingList = document.getElementById('community-pending-list');
const communityPendingStatus = document.getElementById('community-pending-status');
const communityRepliesList = document.getElementById('community-replies-list');
const communityRepliesStatus = document.getElementById('community-replies-status');
const communityPublishedList = document.getElementById('community-published-list');
const communityPublishedStatus = document.getElementById('community-published-status');
const locationForm = document.getElementById('admin-location-form');
const locationCity = document.getElementById('admin-location-city');
const locationCountry = document.getElementById('admin-location-country');
const locationPlace = document.getElementById('admin-location-place');
const locationUpdated = document.getElementById('admin-location-updated');
const locationStatus = document.getElementById('admin-location-status');
const locationClearButton = document.getElementById('admin-location-clear');
const locationDeviceButton = document.getElementById('admin-location-device');
const locationDocument = doc(db, 'siteStatus', 'current');

const communityTopicNames = new Map([
  ['thailand', 'Thailand'],
  ['bali', 'Bali'],
  ['philippines', 'The Philippines'],
  ['solo-travel', 'Solo travel'],
  ['budget', 'Budget & planning'],
  ['culture', 'Culture & experiences'],
  ['video-gear', 'Video, camera & gear'],
  ['general', 'General travel']
]);

let stopPendingListener;
let stopPublishedListener;
let stopFieldNotesListener;
let stopCommunityPendingListener;
let stopCommunityPublishedListener;
let stopCommunityRepliesListener;
let stopLocationListener;
let deviceLocationAttempted = false;
let reviewSession = 0;

function setStatus(element, message, isError = false) {
  element.hidden = false;
  element.dataset.state = isError ? 'error' : 'success';
  element.textContent = message;
}

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
  meta.textContent = 'Field Notes · interest saved · email not verified';
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

function communityMeta(data) {
  const topic = communityTopicNames.get(data.topic) || 'Travel conversation';
  return `Community · ${topic} · ${data.displayName}`;
}

function createCommunityHeader(threadDocument) {
  const data = threadDocument.data();
  const meta = document.createElement('p');
  meta.className = 'question-meta';
  meta.textContent = communityMeta(data);
  const question = document.createElement('p');
  question.className = 'pending-question';
  question.textContent = data.question;
  return { data, meta, question };
}

function makeCommunityPendingCard(threadDocument) {
  const { meta, question } = createCommunityHeader(threadDocument);
  const card = document.createElement('article');
  card.className = 'pending-card';

  const actions = document.createElement('div');
  actions.className = 'pending-actions';

  const publishButton = document.createElement('button');
  publishButton.type = 'button';
  publishButton.className = 'primary-button';
  publishButton.textContent = 'Publish discussion';
  publishButton.addEventListener('click', async () => {
    publishButton.disabled = true;
    try {
      await updateDoc(threadDocument.ref, {
        status: 'published',
        publishedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setStatus(communityPendingStatus, 'Community discussion published. Visitors can now send replies for review.');
    } catch {
      setStatus(communityPendingStatus, 'That community discussion could not be published. Please try again.', true);
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
      await updateDoc(threadDocument.ref, {
        status: 'rejected',
        updatedAt: serverTimestamp()
      });
      setStatus(communityPendingStatus, 'Dismissed. This community question will remain private.');
    } catch {
      setStatus(communityPendingStatus, 'That community question could not be dismissed. Please try again.', true);
      dismissButton.disabled = false;
    }
  });

  actions.append(publishButton, dismissButton);
  card.append(meta, question, actions);
  return card;
}

function makeCommunityPublishedCard(threadDocument) {
  const { meta, question } = createCommunityHeader(threadDocument);
  const card = document.createElement('article');
  card.className = 'pending-card answered-card';
  const actions = document.createElement('div');
  actions.className = 'pending-actions';

  const hideButton = document.createElement('button');
  hideButton.type = 'button';
  hideButton.className = 'danger-button';
  hideButton.textContent = 'Hide discussion';
  hideButton.addEventListener('click', async () => {
    if (!window.confirm('Hide this discussion and all of its public replies from visitors?')) return;
    hideButton.disabled = true;
    try {
      await updateDoc(threadDocument.ref, {
        status: 'rejected',
        updatedAt: serverTimestamp()
      });
      setStatus(communityPublishedStatus, 'Community discussion hidden from visitors.');
    } catch {
      setStatus(communityPublishedStatus, 'That community discussion could not be hidden. Please try again.', true);
      hideButton.disabled = false;
    }
  });

  actions.append(hideButton);
  card.append(meta, question, actions);
  return card;
}

async function makeCommunityReplyCard(replyDocument) {
  const data = replyDocument.data();
  const card = document.createElement('article');
  card.className = 'pending-card';

  const threadReference = replyDocument.ref.parent.parent;
  let threadData;
  try {
    const threadSnapshot = threadReference ? await getDoc(threadReference) : null;
    threadData = threadSnapshot?.exists() ? threadSnapshot.data() : null;
  } catch {
    threadData = null;
  }

  const meta = document.createElement('p');
  meta.className = 'question-meta';
  const topic = threadData ? (communityTopicNames.get(threadData.topic) || 'Travel conversation') : 'Community conversation';
  meta.textContent = `${topic} · ${data.displayName} · reply to a community question`;

  const context = document.createElement('p');
  context.className = 'pending-question';
  context.textContent = data.message;

  if (threadData) {
    const question = document.createElement('p');
    question.className = 'question-meta';
    question.textContent = `Question: ${threadData.question}`;
    card.append(meta, question, context);
  } else {
    card.append(meta, context);
  }

  const actions = document.createElement('div');
  actions.className = 'pending-actions';

  const publishButton = document.createElement('button');
  publishButton.type = 'button';
  publishButton.className = 'primary-button';
  publishButton.textContent = 'Publish reply';
  publishButton.addEventListener('click', async () => {
    publishButton.disabled = true;
    try {
      await updateDoc(replyDocument.ref, {
        status: 'published',
        publishedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setStatus(communityRepliesStatus, 'Community reply published.');
    } catch {
      setStatus(communityRepliesStatus, 'That community reply could not be published. Please try again.', true);
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
      await updateDoc(replyDocument.ref, {
        status: 'rejected',
        updatedAt: serverTimestamp()
      });
      setStatus(communityRepliesStatus, 'Dismissed. This reply will remain private.');
    } catch {
      setStatus(communityRepliesStatus, 'That community reply could not be dismissed. Please try again.', true);
      dismissButton.disabled = false;
    }
  });

  actions.append(publishButton, dismissButton);
  card.append(actions);
  return card;
}

function formatLocationUpdated(timestamp) {
  if (!timestamp?.toDate) return 'Updated just now';
  return `Updated ${timestamp.toDate().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}`;
}

function renderAdminLocation(data) {
  if (!data) {
    locationPlace.textContent = 'No current location is shared.';
    locationUpdated.textContent = 'Visitors will see a neutral message until you save a city and country.';
    locationClearButton.hidden = true;
    return;
  }
  locationPlace.textContent = `${data.city}, ${data.country}`;
  locationUpdated.textContent = formatLocationUpdated(data.updatedAt);
  locationClearButton.hidden = false;
}

function subscribeToLocation() {
  stopLocationListener?.();
  stopLocationListener = onSnapshot(locationDocument, snapshot => {
    renderAdminLocation(snapshot.exists() ? snapshot.data() : null);
  }, () => {
    locationPlace.textContent = 'Current location could not load.';
    locationUpdated.textContent = 'Refresh and try again.';
  });
}

async function saveLocation(city, country, successMessage) {
  try {
    await setDoc(locationDocument, { city, country, updatedAt: serverTimestamp() });
    setStatus(locationStatus, successMessage);
  } catch {
    setStatus(locationStatus, 'The location could not be saved. Please try again.', true);
  }
}

locationForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (!locationForm.reportValidity()) return;
  const city = locationCity.value.trim();
  const country = locationCountry.value.trim();
  if (!city || !country) return;
  const button = locationForm.querySelector('[type="submit"]');
  button.disabled = true;
  await saveLocation(city, country, 'Current location saved. It is now shown on the public website.');
  locationForm.reset();
  button.disabled = false;
});

function getDeviceCoordinates() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('unsupported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 15000,
      maximumAge: 300000
    });
  });
}

async function checkInFromDevice({ automatic = false } = {}) {
  if (!navigator.geolocation) {
    setStatus(locationStatus, 'This browser cannot provide a device location. Enter the city and country manually.', true);
    return;
  }
  locationDeviceButton.disabled = true;
  setStatus(locationStatus, automatic ? 'Checking your device location…' : 'Checking your device location…');
  try {
    const position = await getDeviceCoordinates();
    // Coordinates are reduced to about one kilometre before the lookup and are
    // never persisted. Firestore receives city and country only.
    const latitude = Number(position.coords.latitude.toFixed(2));
    const longitude = Number(position.coords.longitude.toFixed(2));
    const lookup = new URL('https://nominatim.openstreetmap.org/reverse');
    lookup.search = new URLSearchParams({
      lat: String(latitude), lon: String(longitude), format: 'jsonv2',
      zoom: '10', addressdetails: '1', 'accept-language': 'en'
    }).toString();
    const response = await fetch(lookup, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('lookup-failed');
    const address = (await response.json()).address || {};
    const city = address.city || address.town || address.village || address.municipality || address.county || address.state_district;
    const country = address.country;
    if (typeof city !== 'string' || typeof country !== 'string' || !city || !country) {
      throw new Error('place-not-found');
    }
    locationCity.value = city;
    locationCountry.value = country;
    setStatus(locationStatus, 'City and country filled in. Review them, then choose Save to share.');
  } catch (error) {
    if (error?.code === 1) {
      setStatus(locationStatus, 'Location permission was not granted. You can still enter a city and country manually.', true);
    } else if (error?.message === 'unsupported') {
      setStatus(locationStatus, 'This browser cannot provide a device location. Enter the city and country manually.', true);
    } else {
      setStatus(locationStatus, 'Your device location could not be turned into a city and country. Enter it manually or try again.', true);
    }
  } finally {
    locationDeviceButton.disabled = false;
  }
}

locationDeviceButton.addEventListener('click', () => checkInFromDevice());

locationClearButton.addEventListener('click', async () => {
  if (!window.confirm('Clear the current public location?')) return;
  locationClearButton.disabled = true;
  try {
    await deleteDoc(locationDocument);
    setStatus(locationStatus, 'Current location cleared.');
  } catch {
    setStatus(locationStatus, 'The location could not be cleared. Please try again.', true);
    locationClearButton.disabled = false;
  }
});

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

function subscribeToCommunity(session) {
  let repliesRender = 0;
  const pendingThreads = query(
    collection(db, 'communityThreads'),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'asc')
  );
  const publishedThreads = query(
    collection(db, 'communityThreads'),
    where('status', '==', 'published'),
    orderBy('createdAt', 'desc')
  );
  const pendingReplies = query(
    collectionGroup(db, 'replies'),
    where('status', '==', 'pending')
  );

  stopCommunityPendingListener = onSnapshot(pendingThreads, snapshot => {
    if (session !== reviewSession) return;
    setReviewCount('communityThreads', snapshot.size);
    communityPendingList.replaceChildren();
    if (snapshot.empty) {
      setStatus(communityPendingStatus, 'No community questions are waiting for review.');
      return;
    }
    communityPendingStatus.hidden = true;
    snapshot.forEach(threadDocument => communityPendingList.append(makeCommunityPendingCard(threadDocument)));
  }, () => {
    if (session !== reviewSession) return;
    failReviewCount('communityThreads');
    setStatus(communityPendingStatus, 'I could not load community questions. Please refresh and try again.', true);
  });

  stopCommunityPublishedListener = onSnapshot(publishedThreads, snapshot => {
    communityPublishedList.replaceChildren();
    if (snapshot.empty) {
      setStatus(communityPublishedStatus, 'No community discussions are published yet.');
      return;
    }
    communityPublishedStatus.hidden = true;
    snapshot.forEach(threadDocument => communityPublishedList.append(makeCommunityPublishedCard(threadDocument)));
  }, () => setStatus(communityPublishedStatus, 'I could not load public community discussions. Please refresh and try again.', true));

  stopCommunityRepliesListener = onSnapshot(pendingReplies, async snapshot => {
    if (session !== reviewSession) return;
    const rendering = ++repliesRender;
    setReviewCount('replies', snapshot.size);
    communityRepliesList.replaceChildren();
    if (snapshot.empty) {
      setStatus(communityRepliesStatus, 'No community replies are waiting for review.');
      return;
    }
    communityRepliesStatus.hidden = true;
    const documents = [...snapshot.docs].sort((left, right) => {
      const leftTime = left.data().createdAt?.toMillis?.() || 0;
      const rightTime = right.data().createdAt?.toMillis?.() || 0;
      return leftTime - rightTime;
    });
    const cards = await Promise.all(documents.map(makeCommunityReplyCard));
    if (session !== reviewSession || rendering !== repliesRender) return;
    communityRepliesList.replaceChildren(...cards);
  }, () => {
    if (session !== reviewSession) return;
    repliesRender++;
    failReviewCount('replies');
    setStatus(communityRepliesStatus, 'I could not load community replies. Please refresh and try again.', true);
  });
}

function clearListeners() {
  reviewSession++;
  resetReviewCounts();
  [
    stopPendingListener,
    stopPublishedListener,
    stopFieldNotesListener,
    stopCommunityPendingListener,
    stopCommunityPublishedListener,
    stopCommunityRepliesListener,
    stopLocationListener
  ].forEach(listener => listener?.());
  stopPendingListener = undefined;
  stopPublishedListener = undefined;
  stopFieldNotesListener = undefined;
  stopCommunityPendingListener = undefined;
  stopCommunityPublishedListener = undefined;
  stopCommunityRepliesListener = undefined;
  stopLocationListener = undefined;
}

function subscribeToQuestions() {
  clearListeners();
  const session = reviewSession;

  const pendingQuestions = query(collection(db, 'questions'), where('status', '==', 'pending'), orderBy('createdAt', 'asc'));
  const publishedQuestions = query(collection(db, 'questions'), where('status', '==', 'published'), orderBy('createdAt', 'desc'));

  stopPendingListener = onSnapshot(pendingQuestions, snapshot => {
    if (session !== reviewSession) return;
    setReviewCount('questions', snapshot.size);
    pendingList.replaceChildren();
    if (snapshot.empty) {
      setStatus(pendingStatus, 'You’re all caught up. New questions will appear here for review.');
      return;
    }
    pendingStatus.hidden = true;
    snapshot.forEach(questionDocument => pendingList.append(makePendingCard(questionDocument)));
  }, () => {
    if (session !== reviewSession) return;
    failReviewCount('questions');
    setStatus(pendingStatus, 'I could not load the review queue. Check that the owner account is verified and try again.', true);
  });

  stopPublishedListener = onSnapshot(publishedQuestions, snapshot => {
    publishedList.replaceChildren();
    if (snapshot.empty) {
      setStatus(publishedStatus, 'No answers are published yet.');
      return;
    }
    publishedStatus.hidden = true;
    snapshot.forEach(questionDocument => publishedList.append(makePublishedCard(questionDocument)));
  }, () => setStatus(publishedStatus, 'I could not load the published answers. Please refresh and try again.', true));

  subscribeToLocation();
  subscribeToFieldNotes();
  subscribeToCommunity(session);
}

initOwnerAuth({
  onUnlock(user) {
    subscribeToQuestions();
    initContactInbox();
    initWebsiteDesk().catch(()=>{});
    initJourneyStudio(user).catch(()=>{});
    initPostcardDesk(user).catch(()=>{});
    initContentCalendar(db);
  },
  onLock() {
    clearContactInbox();
    clearWebsiteDesk();
    clearContentCalendar();
    clearJourneyStudio();
    clearPostcardDesk();
    clearListeners();
    for (const list of [pendingList, publishedList, fieldNotesList, communityPendingList,
      communityRepliesList, communityPublishedList]) list.replaceChildren();
  }
});
