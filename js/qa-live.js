import {
  addDoc,
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import { db } from './firebase.js';

const form = document.getElementById('question-form');
const topic = document.getElementById('topic');
const formTitle = document.getElementById('form-title');
const topicContext = document.getElementById('topic-context');
const formStatus = document.getElementById('form-status');
const questionsList = document.getElementById('questions-list');
const questionStatus = document.getElementById('questions-status');
const carouselControls = document.getElementById('carousel-controls');
const previousAnswersButton = document.getElementById('previous-answers');
const nextAnswersButton = document.getElementById('next-answers');
const carouselStatus = document.getElementById('carousel-status');
const rotationButton = document.getElementById('toggle-answer-rotation');
const topicFilter = document.getElementById('answer-topic-filter');
const answerSearch = document.getElementById('answer-search');

const communityForm = document.getElementById('community-question-form');
const communityTopic = document.getElementById('community-topic');
const communityFormStatus = document.getElementById('community-form-status');
const communityThreads = document.getElementById('community-threads');
const communityStatus = document.getElementById('community-status');

// Keep real-time moderation updates, with a bounded initial loading state and
// explicit retries. A delayed connection can still recover without reloading.
const publicFeedRetries = new Map();
export function retryPublicFeed(name) {
  publicFeedRetries.get(name)?.();
}

function watchPublicFeed(name, status, loadingMessage, listen, receive, unavailable) {
  const retryButton = document.querySelector(`[data-retry-qa="${name}"]`);
  let unsubscribe, loadingTimer, attempt = 0, render = 0;
  function retry() {
    const current = ++attempt;
    unsubscribe?.();
    clearTimeout(loadingTimer);
    status.hidden = false;
    status.textContent = loadingMessage;
    if (retryButton) retryButton.hidden = true;
    const failed = () => {
      if (current !== attempt) return;
      clearTimeout(loadingTimer);
      unavailable();
      if (retryButton) retryButton.hidden = false;
    };
    loadingTimer = setTimeout(failed, 12000);
    unsubscribe = listen(snapshot => {
      if (current !== attempt) return;
      const rendering = ++render;
      const isCurrent = () => current === attempt && rendering === render;
      Promise.resolve().then(() => { if (isCurrent()) return receive(snapshot, isCurrent); }).then(() => {
        if (!isCurrent()) return;
        clearTimeout(loadingTimer);
        if (retryButton) retryButton.hidden = true;
      }).catch(failed);
    }, failed);
  }
  publicFeedRetries.set(name, retry);
  retry();
}

const topicNames = new Map(Array.from(topic.options, option => [option.value, option.textContent]));
const communityTopicNames = new Map(Array.from(communityTopic.options, option => [option.value, option.textContent]));
const topicPrompts = {
  'thailand-exchange': 'Ask me about Thailand',
  'thailand-solo': 'Ask me about my solo trip in Thailand',
  bali: 'Ask me about Bali',
  philippines: 'Ask me about the Philippines'
};

const requestedTopic = new URLSearchParams(window.location.search).get('topic');
if (requestedTopic && topicNames.has(requestedTopic)) topic.value = requestedTopic;

function setStatus(element, message, isError = false) {
  element.hidden = false;
  element.dataset.state = isError ? 'error' : 'success';
  element.textContent = message;
}

function updateTopicPrompt() {
  const selected = topic.selectedOptions[0];
  formTitle.textContent = topicPrompts[topic.value] || 'What would you like to know?';
  topicContext.hidden = !topic.value;
  if (topic.value) topicContext.textContent = `Selected topic: ${selected.textContent}. You can change it here.`;
}

topic.addEventListener('change', updateTopicPrompt);
updateTopicPrompt();

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!form.reportValidity()) return;

  const submitButton = form.querySelector('[type="submit"]');
  const formData = new FormData(form);
  const displayName = String(formData.get('displayName') || '').trim();
  const question = String(formData.get('question') || '').trim();
  const statusLabel = topicNames.get(String(formData.get('topic'))) || 'your chosen topic';

  if (String(formData.get('website') || '').trim()) {
    form.reset();
    setStatus(formStatus, 'The submission could not be accepted. Please check the form.',true);
    return;
  }

  submitButton.disabled = true;
  setStatus(formStatus, 'Sending your question…');

  try {
    const submission = {
      topic: String(formData.get('topic')),
      question,
      publicationConsent: formData.get('publicationConsent') === 'on',
      status: 'pending',
      createdAt: serverTimestamp()
    };
    if (displayName) submission.displayName = displayName;

    await addDoc(collection(db, 'questions'), submission);
    form.reset();
    updateTopicPrompt();
    setStatus(formStatus, `Thanks! Your question about ${statusLabel} is with me for review. It will appear here only if I publish an answer.`);
  } catch (error) {
    setStatus(formStatus, error.code === 'permission-denied'
      ? 'The question service is not fully ready yet. Please try again a little later.'
      : 'I could not send that just now. Please try again in a moment.', true);
  } finally {
    submitButton.disabled = false;
  }
});

const publishedQuestions = query(
  collection(db, 'questions'),
  where('status', '==', 'published'),
  orderBy('answeredAt', 'desc'),
  limit(100)
);

function makePostcardHeader(topicValue, label) {
  const header = document.createElement('div');
  header.className = 'postcard-header';
  const photos = {
    'thailand-exchange':['thailand-banner-temple-640.webp','Thailand'],
    'thailand-solo':['thailand-monks-temple-640.webp','Thailand'],
    thailand:['thailand-banner-temple-640.webp','Thailand'],
    bali:['bali-wow-640.webp','Bali'],
    philippines:['philippines-drone-coast-640.webp','Philippines']
  };
  const picture = Object.prototype.hasOwnProperty.call(photos,topicValue) ? photos[topicValue] : null;
  const mark = document.createElement('span'); mark.className='postcard-stamp'; mark.setAttribute('aria-hidden','true');
  mark.textContent = picture?.[1] || 'On the road';
  const meta = document.createElement('p'); meta.className='question-meta'; meta.textContent=label;
  header.append(meta,mark);
  if (picture) {
    const image=document.createElement('img'); image.src='assets/optimized/responsive/'+picture[0]; image.alt=''; image.width=76; image.height=64; image.loading='lazy'; image.decoding='async'; image.className='postcard-photo';
    header.prepend(image);
  }
  return header;
}

function makeQuestionCard(question) {
  const card = document.createElement('article');
  card.className = 'question-card'; card.id = 'answer-' + question.id;

  const meta = makePostcardHeader(question.topic, topicNames.get(question.topic) || 'Travel question');

  const heading = document.createElement('h3');
  heading.textContent = question.question;

  const answerLabel = document.createElement('summary');
  answerLabel.className = 'answer-label';
  answerLabel.textContent = 'Dainyel’s answer';

  const answer = document.createElement('p');
  answer.className = 'question-answer';
  answer.textContent = question.answer;

  const answerDetails = document.createElement('details'); answerDetails.className='postcard-answer'; answerDetails.open=true;
  answerDetails.append(answerLabel,answer);
  const permalink=document.createElement('a');permalink.href='/qa?question='+encodeURIComponent(question.id)+'#answer-'+question.id;permalink.textContent='Link to this answer →';
  card.append(meta, heading, answerDetails,permalink);
  return card;
}

let publishedAnswers = [];
let activePage = 0;
let rotationTimer;
let carouselPaused = false;
let userPaused = false;
let resumeFromControl = false;
let answersInView = false;
let activeAnswerTopic = 'all';
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function visibleAnswers() {
  const selectedQuestion=new URL(location.href).searchParams.get('question');
  if(selectedQuestion)return publishedAnswers.filter(a=>a.id===selectedQuestion);
  const byTopic = activeAnswerTopic === 'all'
    ? publishedAnswers
    : publishedAnswers.filter(answer => answer.topic === activeAnswerTopic);
  const term = answerSearch?.value.trim().toLocaleLowerCase() || '';
  if (!term) return byTopic;
  return byTopic.filter(answer => [answer.question, answer.answer, topicNames.get(answer.topic)]
    .filter(Boolean).join(' ').toLocaleLowerCase().includes(term));
}

function answersPerPage() {
  if (window.matchMedia('(max-width: 700px)').matches) return 1;
  if (window.matchMedia('(max-width: 960px)').matches) return 2;
  return 3;
}

function pageCount() {
  return Math.ceil(visibleAnswers().length / answersPerPage());
}

function stopRotation() {
  window.clearInterval(rotationTimer);
  rotationTimer = undefined;
}

function startRotation() {
  stopRotation();
  if (rotationButton) {
    rotationButton.hidden=reducedMotion.matches;
    rotationButton.textContent=userPaused?'Resume slideshow':'Pause slideshow';
    rotationButton.setAttribute('aria-pressed',String(userPaused));
  }
  questionsList.setAttribute('aria-live','polite');
  carouselStatus.setAttribute('aria-live','polite');
  const focused = questionsList.contains(document.activeElement) || (carouselControls.contains(document.activeElement) && !resumeFromControl);
  const hovered = questionsList.matches(':hover') || (carouselControls.matches(':hover') && !resumeFromControl);
  if (carouselPaused || userPaused || !answersInView || document.hidden || reducedMotion.matches || pageCount() <= 1 || focused || hovered || !(questionsList.closest('.site-panel')?.classList.contains('is-open') || document.body.dataset.publicPage === 'qa')) return;
  // Automatic changes are quiet; manual navigation keeps its status announcement.
  questionsList.setAttribute('aria-live','off');
  carouselStatus.setAttribute('aria-live','off');
  rotationTimer = window.setInterval(() => {
    activePage = (activePage + 1) % pageCount();
    renderPublishedAnswers();
  }, 7000);
}
rotationButton?.addEventListener('click',() => { userPaused=!userPaused; resumeFromControl=!userPaused; carouselPaused=false; startRotation(); });
if ('IntersectionObserver' in window) {
  new IntersectionObserver(entries => { answersInView=entries.some(entry=>entry.isIntersecting); startRotation(); },{threshold:.05}).observe(questionsList);
}
document.addEventListener('visibilitychange',startRotation);
carouselControls.addEventListener('focusin',() => { resumeFromControl=false; carouselPaused=true; stopRotation(); });
carouselControls.addEventListener('focusout',() => { setTimeout(()=>{carouselPaused=false;startRotation();},0); });

function renderPublishedAnswers() {
  const answers = visibleAnswers();
  const perPage = answersPerPage();
  const totalPages = pageCount();
  activePage = totalPages ? Math.min(activePage, totalPages - 1) : 0;
  const firstAnswer = activePage * perPage;

  questionsList.replaceChildren(...answers
    .slice(firstAnswer, firstAnswer + perPage)
    .map(makeQuestionCard));

  if (!answers.length) {
    questionStatus.hidden = false;
    questionStatus.textContent = 'No published answers match this topic yet. Ask the first question.';
    carouselControls.hidden = true;
    return;
  }

  questionStatus.hidden = true;
  const hasMultiplePages = totalPages > 1;
  carouselControls.hidden = !hasMultiplePages;
  if (hasMultiplePages) {
    carouselStatus.textContent = `Showing answers ${firstAnswer + 1}–${Math.min(firstAnswer + perPage, answers.length)} of ${answers.length}. Page ${activePage + 1} of ${totalPages}.`;
    previousAnswersButton.disabled = false;
    nextAnswersButton.disabled = false;
  }
}

function refreshCarousel() {
  renderPublishedAnswers();
  startRotation();
}

function clearAnswerLink(){const url=new URL(location.href);if(url.searchParams.has('question')){url.searchParams.delete('question');url.hash='ask';history.replaceState(null,'',url);}}
topicFilter?.addEventListener('click', event => {
  const button = event.target.closest('button[data-topic]');
  if (!button) return;
  clearAnswerLink();
  activeAnswerTopic = button.dataset.topic || 'all';
  topicFilter.querySelectorAll('button[data-topic]').forEach(item => {
    const active = item === button;
    item.classList.toggle('is-active', active);
    item.setAttribute('aria-pressed', String(active));
  });
  activePage = 0;
  refreshCarousel();
});

answerSearch?.addEventListener('input', () => {
  clearAnswerLink();
  activePage = 0;
  refreshCarousel();
});

previousAnswersButton.addEventListener('click', () => {
  resumeFromControl=false;
  activePage = (activePage - 1 + pageCount()) % pageCount();
  refreshCarousel();
});

nextAnswersButton.addEventListener('click', () => {
  resumeFromControl=false;
  activePage = (activePage + 1) % pageCount();
  refreshCarousel();
});

carouselControls.addEventListener('mouseenter', () => {
  carouselPaused = true;
  stopRotation();
});
carouselControls.addEventListener('mouseleave', () => {
  carouselPaused = false;
  startRotation();
});
questionsList.addEventListener('mouseenter', () => {
  carouselPaused = true;
  stopRotation();
});
questionsList.addEventListener('mouseleave', () => {
  carouselPaused = false;
  startRotation();
});
questionsList.addEventListener('focusin', () => {
  carouselPaused = true;
  stopRotation();
});
questionsList.addEventListener('focusout', () => {
  window.setTimeout(() => {
    if (!questionsList.contains(document.activeElement)) {
      carouselPaused = false;
      startRotation();
    }
  }, 0);
});
reducedMotion.addEventListener?.('change', startRotation);
window.addEventListener('resize', () => {
  activePage = 0;
  refreshCarousel();
});

async function receivePublishedAnswers(snapshot, isCurrent) {
  const answers = snapshot.docs.map(documentSnapshot => ({...documentSnapshot.data(), id:documentSnapshot.id}));
  const requested=new URL(location.href).searchParams.get('question');
  if(requested&&/^[a-zA-Z0-9-]{1,80}$/.test(requested)&&!answers.some(q=>q.id===requested)){
    let directTimer;
    try {
      const direct = await Promise.race([
        getDoc(doc(db, 'questions', requested)),
        new Promise((_, reject) => { directTimer = setTimeout(() => reject(new Error('Answer lookup delayed')), 3000); })
      ]);
      if(direct.exists()&&direct.data().status==='published')answers.unshift({...direct.data(),id:direct.id});
    } catch {} finally { clearTimeout(directTimer); }
  }
  if (!isCurrent()) return;
  publishedAnswers = answers;
  publishedAnswers.sort((left, right) => (right.answeredAt?.toMillis?.() || right.createdAt?.toMillis?.() || 0) - (left.answeredAt?.toMillis?.() || left.createdAt?.toMillis?.() || 0));
  activePage = 0;
  questionsList.replaceChildren();
  questionStatus.hidden = true;
  carouselControls.hidden = true;
  stopRotation();

  if (!publishedAnswers.length) {
    questionStatus.hidden = false;
    questionStatus.textContent = 'No answers have been published yet. Be the first to ask a question.';
    return;
  }

  refreshCarousel();
  if(requested)requestAnimationFrame(()=>document.getElementById('answer-'+requested)?.scrollIntoView({block:'start'}));
}
function showAnswersUnavailable() {
  stopRotation();
  questionStatus.hidden = false;
  questionStatus.textContent = 'I could not load the answers right now. Please check back soon.';
}
watchPublicFeed('answers', questionStatus, 'Loading published answers…', (receive, failed) => {
  let active = true;
  let stop = onSnapshot(publishedQuestions, receive, error => {
    // Retain the indexed fallback until the answeredAt index is deployed.
    if (active && error.code === 'failed-precondition') {
      const legacyQuery = query(collection(db, 'questions'), where('status', '==', 'published'), orderBy('createdAt', 'desc'), limit(100));
      stop = onSnapshot(legacyQuery, receive, failed);
    } else if (active) failed();
  });
  return () => { active = false; stop(); };
}, receivePublishedAnswers, showAnswersUnavailable);

communityForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (!communityForm.reportValidity()) return;

  const submitButton = communityForm.querySelector('[type="submit"]');
  const formData = new FormData(communityForm);
  if (String(formData.get('website') || '').trim()) {
    setStatus(communityFormStatus, 'Thanks — your question is with the moderation queue.');
    communityForm.reset();
    return;
  }

  submitButton.disabled = true;
  setStatus(communityFormStatus, 'Sending your community question…');

  try {
    await addDoc(collection(db, 'communityThreads'), {
      displayName: String(formData.get('displayName') || '').trim(),
      topic: String(formData.get('topic')),
      question: String(formData.get('question') || '').trim(),
      publicationConsent: formData.get('publicationConsent') === 'on',
      status: 'pending',
      createdAt: serverTimestamp()
    });
    communityForm.reset();
    setStatus(communityFormStatus, 'Thanks! Your question is with Dainyel for review. It will appear publicly once it is approved.');
  } catch (error) {
    setStatus(communityFormStatus, error.code === 'permission-denied'
      ? 'The community service is not fully ready yet. Please try again a little later.'
      : 'I could not send that just now. Please try again in a moment.', true);
  } finally {
    submitButton.disabled = false;
  }
});

let communityReplyUnsubscribers = [];

function clearCommunityReplyListeners() {
  communityReplyUnsubscribers.forEach(unsubscribe => unsubscribe());
  communityReplyUnsubscribers = [];
}

function makeReplyForm(threadId) {
  const details = document.createElement('details');
  details.className = 'reply-details';

  const summary = document.createElement('summary');
  summary.textContent = 'Share your experience';

  const form = document.createElement('form');
  form.className = 'reply-form';

  const nameField = document.createElement('div');
  nameField.className = 'field';
  const nameLabel = document.createElement('label');
  const nameId = `reply-name-${threadId}`;
  nameLabel.htmlFor = nameId;
  nameLabel.textContent = 'Your nickname';
  const nameInput = document.createElement('input');
  nameInput.id = nameId;
  nameInput.name = 'displayName';
  nameInput.type = 'text';
  nameInput.required = true;
  nameInput.minLength = 2;
  nameInput.maxLength = 40;
  nameInput.autocomplete = 'nickname';
  nameInput.placeholder = 'How should others know you?';
  nameField.append(nameLabel, nameInput);

  const messageField = document.createElement('div');
  messageField.className = 'field';
  const messageLabel = document.createElement('label');
  const messageId = `reply-message-${threadId}`;
  messageLabel.htmlFor = messageId;
  messageLabel.textContent = 'Your experience';
  const messageInput = document.createElement('textarea');
  messageInput.id = messageId;
  messageInput.name = 'message';
  messageInput.required = true;
  messageInput.minLength = 10;
  messageInput.maxLength = 1000;
  messageInput.placeholder = 'Share a useful tip or what happened on your own trip.';
  messageField.append(messageLabel, messageInput);

  const honeypot = document.createElement('div');
  honeypot.className = 'honeypot';
  honeypot.setAttribute('aria-hidden', 'true');
  const honeypotInput = document.createElement('input');
  honeypotInput.name = 'website';
  honeypotInput.type = 'text';
  honeypotInput.tabIndex = -1;
  honeypotInput.autocomplete = 'off';
  honeypot.append(honeypotInput);

  const consent = document.createElement('label');
  consent.className = 'consent';
  const consentInput = document.createElement('input');
  consentInput.name = 'publicationConsent';
  consentInput.type = 'checkbox';
  consentInput.required = true;
  const consentText = document.createElement('span');
  consentText.textContent = 'I understand that, if approved, my nickname and reply may be shown publicly.';
  consent.append(consentInput, consentText);

  const submitButton = document.createElement('button');
  submitButton.className = 'submit-btn';
  submitButton.type = 'submit';
  submitButton.textContent = 'Send reply for review';

  const status = document.createElement('p');
  status.className = 'reply-status';
  status.setAttribute('aria-live', 'polite');

  form.append(nameField, messageField, honeypot, consent, submitButton, status);
  details.append(summary, form);

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const formData = new FormData(form);
    if (String(formData.get('website') || '').trim()) {
      status.dataset.state = 'success';
      status.textContent = 'Thanks — your reply is with the moderation queue.';
      form.reset();
      return;
    }

    submitButton.disabled = true;
    status.dataset.state = 'success';
    status.textContent = 'Sending your reply…';
    try {
      await addDoc(collection(db, 'communityThreads', threadId, 'replies'), {
        displayName: String(formData.get('displayName') || '').trim(),
        message: String(formData.get('message') || '').trim(),
        publicationConsent: formData.get('publicationConsent') === 'on',
        status: 'pending',
        createdAt: serverTimestamp()
      });
      form.reset();
      status.dataset.state = 'success';
      status.textContent = 'Thanks! Your reply is with Dainyel for review.';
    } catch (error) {
      status.dataset.state = 'error';
      status.textContent = error.code === 'permission-denied'
        ? 'The reply service is not fully ready yet. Please try again later.'
        : 'I could not send that just now. Please try again in a moment.';
    } finally {
      submitButton.disabled = false;
    }
  });

  return details;
}

function makeCommunityReply(reply) {
  const replyElement = document.createElement('article');
  replyElement.className = 'community-reply';

  const meta = document.createElement('p');
  meta.className = 'question-meta';
  meta.textContent = `${reply.displayName} · community reply`;

  const message = document.createElement('p');
  message.textContent = reply.message;

  replyElement.append(meta, message);
  return replyElement;
}

function attachReplies(threadId, container) {
  const replyStatus = document.createElement('p');
  replyStatus.className = 'community-reply-status';
  replyStatus.textContent = 'Loading replies…';
  const replies = document.createElement('div');
  replies.className = 'community-replies';
  container.append(replyStatus, replies);

  const publishedReplies = query(
    collection(db, 'communityThreads', threadId, 'replies'),
    where('status', '==', 'published'),
    limit(50)
  );

  const unsubscribe = onSnapshot(publishedReplies, snapshot => {
    const items = snapshot.docs
      .map(documentSnapshot => documentSnapshot.data())
      .sort((left, right) => (left.createdAt?.toMillis?.() || 0) - (right.createdAt?.toMillis?.() || 0));

    replies.replaceChildren(...items.map(makeCommunityReply));
    if (items.length) {
      replyStatus.hidden = true;
    } else {
      replyStatus.hidden = false;
      replyStatus.textContent = 'No replies yet. Share an experience that could help someone.';
    }
  }, () => {
    replyStatus.hidden = false;
    replyStatus.textContent = 'Replies could not load right now. Please check back soon.';
  });

  communityReplyUnsubscribers.push(unsubscribe);
}

function makeCommunityThread(threadDocument) {
  const thread = threadDocument.data();
  const card = document.createElement('article');
  card.className = 'community-thread';

  const meta = makePostcardHeader(thread.topic, communityTopicNames.get(thread.topic) || 'Travel conversation');

  const heading = document.createElement('h4');
  heading.textContent = thread.question;

  const byline = document.createElement('p');
  byline.className = 'community-byline';
  byline.textContent = `Asked by ${thread.displayName}`;

  card.append(meta, heading, byline);
  attachReplies(threadDocument.id, card);
  card.append(makeReplyForm(threadDocument.id));
  return card;
}

const publishedCommunityThreads = query(
  collection(db, 'communityThreads'),
  where('status', '==', 'published'),
  orderBy('createdAt', 'desc'),
  limit(30)
);

watchPublicFeed('community', communityStatus, 'Loading community conversations…',
  (receive, failed) => onSnapshot(publishedCommunityThreads, receive, failed), snapshot => {
  clearCommunityReplyListeners();
  communityThreads.replaceChildren();

  if (snapshot.empty) {
    communityStatus.hidden = false;
    communityStatus.textContent = 'The first community conversation is still on its way. Start one above.';
    return;
  }

  communityStatus.hidden = true;
  snapshot.forEach(threadDocument => communityThreads.append(makeCommunityThread(threadDocument)));
}, () => {
  clearCommunityReplyListeners();
  communityStatus.hidden = false;
  communityStatus.textContent = 'Community conversations could not load right now. Please check back soon.';
});

import {initChallenges} from "../assets/challenges.js";
initChallenges();
