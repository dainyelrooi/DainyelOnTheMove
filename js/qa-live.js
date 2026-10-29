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
import {readPublicSnapshot,snapshotDocs} from '../assets/public-snapshot.js';
import {space} from '../assets/site-environment.js';

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
const PUBLIC_COPY_MAX_AGE=24*60*60*1000;
export function retryPublicFeed(name) {
  publicFeedRetries.get(name)?.();
}

async function qaSnapshotCopy(group, threadId) {
  const copy=await readPublicSnapshot('qa',{space});
  if(!copy)return null;
  let records;
  if(group==='answers')records=copy.questions;
  else if(group==='community')records=copy.threads;
  else {
    const thread=copy.threads.find(row=>row.id===threadId);
    // An absent thread is not evidence that it has no replies.
    if(!thread)return null;
    records=thread.replies;
  }
  const docs=snapshotDocs(records);
  return {generatedAt:copy.generatedAt,snapshot:{docs,size:docs.length,empty:!docs.length,metadata:{fromCache:true}}};
}

function watchPublicFeed(name, status, loadingMessage, listen, receive, unavailable, fallback, discardCopy) {
  const retryButton = document.querySelector(`[data-retry-qa="${name}"]`);
  const copyNotice=document.createElement('p');
  copyNotice.className='public-snapshot-note';copyNotice.hidden=true;
  copyNotice.setAttribute('role','status');status.after(copyNotice);
  // A server result, including an empty collection, always wins for this page.
  // Keep this sticky across Retry so an older public copy cannot restore a
  // withdrawn question. An initial SDK-cache result is not server confirmation.
  let unsubscribe, loadingTimer, copyTimer, copyUntil=0, copyExpired=false, attempt = 0, render = 0, authoritative = false, renderedKey=null, pendingKey=null;
  function contentKey(snapshot){
    // Compare the visible record fields and ordering, not SDK metadata or a
    // thread's separately loaded replies. A server acknowledgement can then
    // establish authority without resetting pagination, focus or disclosures.
    const names=name==='answers'?['status','topic','question','answer','createdAt','answeredAt']:
      name==='community'?['status','topic','question','displayName','createdAt']:['status','displayName','message','createdAt'];
    try{return JSON.stringify(snapshot.docs.map(row=>{const data=row.data();return[row.id,...names.map(key=>{
      const value=data[key];return typeof value?.toMillis==='function'?value.toMillis():value??null;
    })];}));}catch{return null;}
  }
  function checkCopyExpiry(){
    clearTimeout(copyTimer);
    if(authoritative||!copyUntil)return;
    const remaining=copyUntil-Date.now();
    if(remaining>0){copyTimer=setTimeout(checkCopyExpiry,remaining);return;}
    ++render;renderedKey=pendingKey=null;copyUntil=0;copyExpired=true;copyNotice.hidden=true;
    discardCopy?.();unavailable();if(retryButton)retryButton.hidden=false;
  }
  document.addEventListener('visibilitychange',checkCopyExpiry);
  window.addEventListener('pageshow',checkCopyExpiry);
  function retry() {
    const current = ++attempt;
    unsubscribe?.();
    pendingKey=null;
    clearTimeout(loadingTimer);
    status.hidden = false;
    status.textContent = loadingMessage;
    if (retryButton) retryButton.hidden = true;
    const failed = async () => {
      if (current !== attempt) return;
      clearTimeout(loadingTimer);
      unavailable();
      if (retryButton) retryButton.hidden = false;
      if(authoritative||!fallback)return;
      const rendering=++render;
      pendingKey=null;
      const isCurrent=()=>current===attempt&&rendering===render&&!authoritative;
      try{
        const saved=await fallback();
        if(!saved||!isCurrent())return;
        const expires=Date.parse(saved.generatedAt)+PUBLIC_COPY_MAX_AGE;
        if(!Number.isFinite(expires)||expires<=Date.now())return;
        await receive(saved.snapshot,isCurrent,{lastPublishedCopy:true});
        if(!isCurrent())return;
        renderedKey=contentKey(saved.snapshot);
        const savedAt=new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/Amsterdam'}).format(new Date(saved.generatedAt));
        copyNotice.textContent='Showing the last published copy, saved '+savedAt+' (Netherlands time). Live updates are temporarily unavailable.';
        copyNotice.hidden=false;copyUntil=expires;checkCopyExpiry();
      }catch{/* A missing or invalid public copy is never an empty live feed. */}
    };
    loadingTimer = setTimeout(failed, 12000);
    unsubscribe = listen(snapshot => {
      if (current !== attempt) return;
      if(snapshot.metadata?.fromCache!==true){authoritative=true;copyUntil=0;clearTimeout(loadingTimer);clearTimeout(copyTimer);copyNotice.hidden=true;}
      else if(authoritative||copyUntil||copyExpired)return;
      const key=contentKey(snapshot);
      if(key!==null&&(key===renderedKey||key===pendingKey)){
        if(authoritative)clearTimeout(loadingTimer);if(retryButton)retryButton.hidden=true;return;
      }
      const rendering = ++render;
      pendingKey=key;
      const isCurrent = () => current === attempt && rendering === render;
      Promise.resolve().then(() => { if (isCurrent()) return receive(snapshot, isCurrent); }).then(() => {
        if (!isCurrent()) return;
        renderedKey=key;pendingKey=null;
        if(authoritative)clearTimeout(loadingTimer);
        if (retryButton) retryButton.hidden = true;
      }).catch(failed);
    }, failed);
  }
  publicFeedRetries.set(name, retry);
  retry();
  return () => {
    ++attempt;unsubscribe?.();clearTimeout(loadingTimer);clearTimeout(copyTimer);copyNotice.remove();
    document.removeEventListener('visibilitychange',checkCopyExpiry);window.removeEventListener('pageshow',checkCopyExpiry);
    if(publicFeedRetries.get(name)===retry)publicFeedRetries.delete(name);
  };
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

  const answerDetails = document.createElement('details'); answerDetails.className='postcard-answer'; answerDetails.open=new URL(location.href).searchParams.get('question')===question.id;
  answerDetails.append(answerLabel,answer);
  const permalink=document.createElement('a');permalink.href='/qa?question='+encodeURIComponent(question.id)+'#answer-'+question.id;permalink.textContent='Link to this answer →';
  card.append(meta, heading, answerDetails,permalink);
  return card;
}

let publishedAnswers = [];
let answersLoaded = false;
let activePage = 0;
let activeAnswerTopic = 'all';

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
    questionStatus.textContent = 'No published answers match this topic yet. Open Ask Dainyel below to send a question.';
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
  if (answersLoaded) renderPublishedAnswers();
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
  if (!pageCount()) return;
  activePage = (activePage - 1 + pageCount()) % pageCount();
  refreshCarousel();
});

nextAnswersButton.addEventListener('click', () => {
  if (!pageCount()) return;
  activePage = (activePage + 1) % pageCount();
  refreshCarousel();
});

window.addEventListener('resize', () => {
  activePage = 0;
  refreshCarousel();
});

async function receivePublishedAnswers(snapshot, isCurrent, {lastPublishedCopy=false}={}) {
  const answers = snapshot.docs.map(documentSnapshot => ({...documentSnapshot.data(), id:documentSnapshot.id}));
  const requested=new URL(location.href).searchParams.get('question');
  if(!lastPublishedCopy&&requested&&/^[a-zA-Z0-9-]{1,80}$/.test(requested)&&!answers.some(q=>q.id===requested)){
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
  answersLoaded = true;
  publishedAnswers = answers;
  publishedAnswers.sort((left, right) => (right.answeredAt?.toMillis?.() || right.createdAt?.toMillis?.() || 0) - (left.answeredAt?.toMillis?.() || left.createdAt?.toMillis?.() || 0));
  activePage = 0;
  questionsList.replaceChildren();
  questionStatus.hidden = true;
  carouselControls.hidden = true;

  if (!publishedAnswers.length) {
    questionStatus.hidden = false;
    questionStatus.textContent = 'No answers have been published yet. Be the first to ask a question.';
    return;
  }

  refreshCarousel();
  if(requested)requestAnimationFrame(()=>document.getElementById('answer-'+requested)?.scrollIntoView({block:'start'}));
}
function showAnswersUnavailable() {
  questionStatus.hidden = false;
  questionStatus.textContent = 'I could not load the answers right now. Please check back soon.';
}
watchPublicFeed('answers', questionStatus, 'Loading published answers…', (receive, failed) => {
  let active = true;
  let stop = onSnapshot(publishedQuestions, {includeMetadataChanges:true}, receive, error => {
    // Retain the indexed fallback until the answeredAt index is deployed.
    if (active && error.code === 'failed-precondition') {
      const legacyQuery = query(collection(db, 'questions'), where('status', '==', 'published'), orderBy('createdAt', 'desc'), limit(100));
      stop = onSnapshot(legacyQuery, {includeMetadataChanges:true}, receive, failed);
    } else if (active) failed();
  });
  return () => { active = false; stop(); };
}, receivePublishedAnswers, showAnswersUnavailable,()=>qaSnapshotCopy('answers'),()=>{
  answersLoaded=false;publishedAnswers=[];activePage=0;questionsList.replaceChildren();carouselControls.hidden=true;
});

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

  const unsubscribe = watchPublicFeed('replies-'+encodeURIComponent(threadId),replyStatus,'Loading replies…',
    (receive,failed)=>onSnapshot(publishedReplies,{includeMetadataChanges:true},receive,failed),snapshot => {
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
  },()=>qaSnapshotCopy('replies',threadId),()=>replies.replaceChildren());

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

  const conversation = document.createElement('details'); conversation.className = 'conversation-details';
  const summary = document.createElement('summary'); summary.textContent = 'Open conversation & replies';
  const body = document.createElement('div'); body.className = 'conversation-body';
  conversation.append(summary, body); let loaded = false;
  conversation.addEventListener('toggle', () => {
    if (!conversation.open || loaded) return; loaded = true;
    attachReplies(threadDocument.id, body); body.append(makeReplyForm(threadDocument.id));
  });
  card.append(meta, heading, byline, conversation);
  return card;
}

const publishedCommunityThreads = query(
  collection(db, 'communityThreads'),
  where('status', '==', 'published'),
  orderBy('createdAt', 'desc'),
  limit(30)
);

watchPublicFeed('community', communityStatus, 'Loading community conversations…',
  (receive, failed) => onSnapshot(publishedCommunityThreads, {includeMetadataChanges:true}, receive, failed), snapshot => {
  clearCommunityReplyListeners();
  communityThreads.replaceChildren();

  if (snapshot.empty) {
    communityStatus.hidden = false;
    communityStatus.textContent = 'The first community conversation is still on its way. Open Ask the community below to start one.';
    return;
  }

  communityStatus.hidden = true;
  const rows = snapshot.docs; let shown = 0;
  const more = document.createElement('button'); more.type = 'button'; more.className = 'community-more';
  function appendNext() {
    more.remove();
    for (const row of rows.slice(shown, shown + 3)) communityThreads.append(makeCommunityThread(row));
    shown = Math.min(shown + 3, rows.length);
    if (shown < rows.length) { more.textContent = 'More conversations (' + (rows.length - shown) + ') ↓'; communityThreads.append(more); }
  }
  more.addEventListener('click', appendNext); appendNext();
}, () => {
  clearCommunityReplyListeners();
  communityStatus.hidden = false;
  communityStatus.textContent = 'Community conversations could not load right now. Please check back soon.';
},()=>qaSnapshotCopy('community'),()=>communityThreads.replaceChildren());

import {initChallenges} from "../assets/challenges.js";
initChallenges();
