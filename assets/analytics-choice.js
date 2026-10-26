// A separate, explicit phase: Analytics can work before advertising is launched.
// This preference is never consent for AdSense or Google's later CMP.
export const ANALYTICS_CHOICE_KEY = 'dotm-analytics-only-choice-v2';
export const CHOICE_LIFETIME = 180 * 86400000;
export function readAnalyticsChoice(raw, now = Date.now()) {
  try {
    const value = JSON.parse(raw);
    if (value?.version !== 1 || value.scope !== 'analytics-only' ||
        !['accepted', 'rejected'].includes(value.choice) ||
        !Number.isFinite(value.decidedAt) || value.decidedAt <= 0 ||
        value.decidedAt > now || now - value.decidedAt >= CHOICE_LIFETIME) return null;
    return value;
  } catch (_) { return null; }
}

export function initAnalyticsChoice({production, onChoice, onPending, status}) {
  let choice = null, saved = false, dialog, before, decisionClose = false;
  try { choice = readAnalyticsChoice(localStorage.getItem(ANALYTICS_CHOICE_KEY)); } catch (_) {}
  const node = (tag, text, className) => {
    const element = document.createElement(tag);
    if (text) element.textContent = text;
    if (className) element.className = className;
    return element;
  };
  const button = (text, action, secondary = false) => {
    const element = node('button', text, 'privacy-choice-button' + (secondary ? ' privacy-choice-secondary' : ''));
    element.type = 'button'; element.addEventListener('click', action); return element;
  };
  const banner = node('section', '', 'privacy-choice');
  banner.setAttribute('aria-label', 'Your privacy choices');
  const logo = () => {
    const image = node('img', '', 'privacy-choice-logo'); image.src = '/assets/consent-logo.png';
    image.alt = 'Dainyel on the Move'; image.width = 180; image.height = 60; return image;
  };
  const copy = node('div', '', 'privacy-choice-copy');
  copy.append(node('strong', 'Your privacy, your call.'), node('p',
    'May I use Google Analytics to understand visits and improve the website? Advertising is off for now. You can keep reading either way.'));
  if (!production) copy.append(node('p', 'Test website: no Analytics or advertising runs here.', 'privacy-choice-test'));
  const actions = node('div', '', 'privacy-choice-actions');
  actions.append(button('Consent', () => decide('accepted')),
    button('Do not consent', () => decide('rejected')),
    button('Manage options', openSettings, true));
  banner.append(logo(), copy, actions); banner.hidden = true; document.body.append(banner);

  function decide(value) {
    const previous = choice?.choice;
    choice = {version:1, scope:'analytics-only', choice:value, decidedAt:Date.now()};
    saved = false;
    try { localStorage.setItem(ANALYTICS_CHOICE_KEY, JSON.stringify(choice)); saved = true; } catch (_) {}
    banner.hidden = true;
    if (dialog?.open) { decisionClose = true; dialog.close(); }
    onChoice(value === 'accepted', {revoked:previous === 'accepted' && value === 'rejected'});
    status(saved ? (value === 'accepted' ? 'Analytics allowed. Advertising remains off.' : 'Analytics declined. Advertising remains off.') :
      'Your choice applies on this page. Your browser did not allow it to be saved. Advertising remains off.');
  }
  function openSettings() {
    onPending();
    if (!dialog) {
      dialog = node('dialog', '', 'privacy-options');
      dialog.setAttribute('aria-labelledby', 'analytics-options-title');
      const title = node('h2', 'Your privacy choices'); title.id = 'analytics-options-title';
      const intro = node('p', 'Only optional Analytics is offered right now. Advertising is off. Essential website security continues to work.');
      const label = node('label', '', 'privacy-options-toggle'), checkbox = node('input');
      checkbox.type = 'checkbox'; checkbox.name = 'analytics';
      label.append(checkbox, node('span', 'Allow Google Analytics'));
      const details = node('p', 'Analytics helps me understand page visits. Google may process device details and cookie identifiers. Your choice is kept for up to six months. You can change it at any time.');
      const policy = node('a', 'Read the privacy notice'); policy.href = '/privacy';
      const controls = node('div', '', 'privacy-choice-actions');
      controls.append(button('Save choices', () => decide(checkbox.checked ? 'accepted' : 'rejected')),
        button('Do not consent', () => decide('rejected')), button('Cancel', () => dialog.close(), true));
      dialog.append(logo(), title, intro, label, details, policy, controls);
      dialog.addEventListener('close', () => {
        if (decisionClose) decisionClose = false;
        else if (choice) { banner.hidden = true; onChoice(choice.choice === 'accepted', {revoked:false}); }
        else { banner.hidden = false; onPending(); }
        if (before?.isConnected) before.focus({preventScroll:true});
      });
      document.body.append(dialog);
    }
    dialog.querySelector('input').checked = choice?.choice === 'accepted';
    before = document.activeElement;
    if (!dialog.open) dialog.showModal();
  }
  if (choice) { saved = true; onChoice(choice.choice === 'accepted', {revoked:false}); }
  else { onPending(); banner.hidden = false; }
  window.addEventListener('storage', event => {
    if (event.key !== ANALYTICS_CHOICE_KEY && event.key !== null) return;
    const previous = choice?.choice;
    choice = readAnalyticsChoice(event.newValue);
    banner.hidden = Boolean(choice);
    if (choice) onChoice(choice.choice === 'accepted', {revoked:previous === 'accepted' && choice.choice === 'rejected'});
    else onPending();
  });
  return {openSettings};
}
