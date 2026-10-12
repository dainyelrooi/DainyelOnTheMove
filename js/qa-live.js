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

onSnapshot(publishedQuestions, snapshot => {
  questionsList.replaceChildren();
  questionStatus.hidden = true;

  if (snapshot.empty) {
    questionStatus.hidden = false;
    questionStatus.textContent = 'No answers have been published yet. Be the first to ask a question.';
    return;
  }

  snapshot.forEach(documentSnapshot => {
    questionsList.append(makeQuestionCard(documentSnapshot.data()));
  });
}, () => {
  questionStatus.hidden = false;
  questionStatus.textContent = 'I could not load the answers right now. Please check back soon.';
});
