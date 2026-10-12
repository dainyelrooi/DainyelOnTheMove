import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
  limit
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
const topicNames = new Map(Array.from(topic.options, option => [option.value, option.textContent]));
const topicPrompts = {
  'thailand-exchange': 'Ask me about Thailand',
  'thailand-solo': 'Ask me about my solo trip in Thailand',
  bali: 'Ask me about Bali',
  philippines: 'Ask me about the Philippines'
};

const requestedTopic = new URLSearchParams(window.location.search).get('topic');
if (requestedTopic && topicNames.has(requestedTopic)) topic.value = requestedTopic;

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

  submitButton.disabled = true;
  formStatus.hidden = false;
  formStatus.dataset.state = 'success';
  formStatus.textContent = 'Sending your question…';

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
    formStatus.dataset.state = 'success';
    formStatus.textContent = `Thanks! Your question about ${statusLabel} is with me for review. It will appear here only if I publish an answer.`;
  } catch (error) {
    formStatus.dataset.state = 'error';
    formStatus.textContent = error.code === 'permission-denied'
      ? 'The question service is not fully ready yet. Please try again a little later.'
      : 'I could not send that just now. Please try again in a moment.';
  } finally {
    submitButton.disabled = false;
  }
});

const publishedQuestions = query(
  collection(db, 'questions'),
  where('status', '==', 'published'),
  orderBy('createdAt', 'desc'),
  limit(30)
);

function makeQuestionCard(question) {
  const card = document.createElement('article');
  card.className = 'question-card';

  const meta = document.createElement('p');
  meta.className = 'question-meta';
  meta.textContent = topicNames.get(question.topic) || 'Travel question';

  const heading = document.createElement('h3');
  heading.textContent = question.question;

  const answerLabel = document.createElement('p');
  answerLabel.className = 'answer-label';
  answerLabel.textContent = 'Dainyel’s answer';

  const answer = document.createElement('p');
  answer.className = 'question-answer';
  answer.textContent = question.answer;

  card.append(meta, heading, answerLabel, answer);
  return card;
}

let publishedAnswers = [];
let activePage = 0;
let rotationTimer;
let carouselPaused = false;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function answersPerPage() {
  if (window.matchMedia('(max-width: 700px)').matches) return 1;
  if (window.matchMedia('(max-width: 960px)').matches) return 2;
  return 3;
}

function pageCount() {
  return Math.ceil(publishedAnswers.length / answersPerPage());
}

function stopRotation() {
  window.clearInterval(rotationTimer);
  rotationTimer = undefined;
}

function startRotation() {
  stopRotation();
  if (carouselPaused || reducedMotion.matches || pageCount() <= 1) return;
  rotationTimer = window.setInterval(() => {
    activePage = (activePage + 1) % pageCount();
    renderPublishedAnswers();
  }, 7000);
}

function renderPublishedAnswers() {
  const perPage = answersPerPage();
  const totalPages = pageCount();
  activePage = totalPages ? Math.min(activePage, totalPages - 1) : 0;
  const firstAnswer = activePage * perPage;

  questionsList.replaceChildren(...publishedAnswers
    .slice(firstAnswer, firstAnswer + perPage)
    .map(makeQuestionCard));

  const hasMultiplePages = totalPages > 1;
  carouselControls.hidden = !hasMultiplePages;
  if (hasMultiplePages) {
    carouselStatus.textContent = `Showing answers ${firstAnswer + 1}–${Math.min(firstAnswer + perPage, publishedAnswers.length)} of ${publishedAnswers.length}. Page ${activePage + 1} of ${totalPages}.`;
    previousAnswersButton.disabled = false;
    nextAnswersButton.disabled = false;
  }
}

function refreshCarousel() {
  renderPublishedAnswers();
  startRotation();
}

previousAnswersButton.addEventListener('click', () => {
  activePage = (activePage - 1 + pageCount()) % pageCount();
  refreshCarousel();
});

nextAnswersButton.addEventListener('click', () => {
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

onSnapshot(publishedQuestions, snapshot => {
  publishedAnswers = snapshot.docs.map(documentSnapshot => documentSnapshot.data());
  activePage = 0;
  questionsList.replaceChildren();
  questionStatus.hidden = true;
  carouselControls.hidden = true;
  stopRotation();

  if (snapshot.empty) {
    questionStatus.hidden = false;
    questionStatus.textContent = 'No answers have been published yet. Be the first to ask a question.';
    return;
  }

  refreshCarousel();
}, () => {
  stopRotation();
  questionStatus.hidden = false;
  questionStatus.textContent = 'I could not load the answers right now. Please check back soon.';
});
