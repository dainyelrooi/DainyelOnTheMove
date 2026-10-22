/* Native Firebase MFA only. UI state and browser preferences never grant data access. */
import {
  GoogleAuthProvider, EmailAuthProvider, TotpMultiFactorGenerator,
  signInWithPopup, signInWithEmailAndPassword, linkWithPopup,
  reauthenticateWithPopup, reauthenticateWithCredential,
  getMultiFactorResolver, multiFactor, getIdTokenResult, onIdTokenChanged,
  setPersistence, browserLocalPersistence, browserSessionPersistence, signOut
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import { auth } from '../js/firebase.js';

const OWNER_EMAIL = 'dainyelr@gmail.com';
// Owner approved the free Auth configuration and production release on 22 October 2026.
// This enables enrollment only. The strict Rules release follows owner-assisted enrollment.
const ENROLLMENT_ENABLED = true;
const $ = id => document.getElementById(id);

function errorMessage(error) {
  // Never log full Auth errors: they may contain credentials or MFA session metadata.
  const messages = {
    'auth/invalid-credential': 'Those sign-in details did not match. Please try again.',
    'auth/wrong-password': 'That password did not match. Please try again.',
    'auth/user-not-found': 'Please use the existing owner account.',
    'auth/user-disabled': 'This account is disabled. Review it in the Firebase console.',
    'auth/too-many-requests': 'Too many attempts. Please wait before trying again.',
    'auth/network-request-failed': 'The connection was interrupted. Check your internet and try again.',
    'auth/popup-blocked': 'Your browser blocked the Google window. Allow pop-ups for this site, or use your owner password.',
    'auth/popup-closed-by-user': 'Google sign-in was cancelled. You can try again.',
    'auth/cancelled-popup-request': 'Please finish the Google window already open.',
    'auth/unauthorized-domain': 'Google sign-in is not authorised on this address yet. Use the owner password for now.',
    'auth/account-exists-with-different-credential': 'Sign in with your owner password first, then connect Google under Account & security.',
    'auth/credential-already-in-use': 'That Google account belongs to another sign-in. Use your existing owner Google account.',
    'auth/provider-already-linked': 'Google is already connected. Sign out, then continue with Google.',
    'auth/operation-not-allowed': 'Authenticator or this sign-in method has not been activated in Firebase yet.',
    'auth/invalid-verification-code': 'That code did not match. Try the current six-digit code from your Authenticator.',
    'auth/missing-verification-code': 'Enter the six-digit code from your Authenticator.',
    'auth/invalid-multi-factor-session': 'This sign-in has expired. Go back and sign in again.',
    'auth/multi-factor-info-not-found': 'That Authenticator is no longer connected. Start a new sign-in.',
    'auth/code-expired': 'That setup or sign-in has expired. Start again to get a fresh one.',
    'auth/session-expired': 'That setup or sign-in has expired. Please start again.',
    'auth/requires-recent-login': 'Please sign out and sign in again before connecting Authenticator.',
    'auth/user-token-expired': 'Your session has expired. Please sign in again.',
    'auth/unverified-email': 'The owner email must be verified before connecting Authenticator.',
    'auth/unsupported-first-factor': 'Use Google or the owner password for Authenticator setup.',
    'auth/second-factor-already-in-use': 'This Authenticator is already connected. Sign in again with its code.',
    'auth/maximum-second-factor-count-exceeded': 'The account has reached its Authenticator limit. Review its factors in the Firebase console.',
    'auth/app-check-token-is-invalid': 'The security check could not be completed. Refresh this page and try again.',
    'auth/internal-error': 'The secure sign-in could not be completed. Refresh this page and try again.',
    'auth/web-storage-unsupported': 'This browser cannot store a secure sign-in session. Try a regular browser tab.'
  };
  return messages[error?.code] || 'The secure sign-in could not be completed. Please try again.';
}

function message(element, text = '', isError = false) {
  element.hidden = !text;
  element.dataset.state = isError ? 'error' : 'success';
  element.textContent = text;
}

export function initOwnerAuth({ onUnlock, onLock }) {
  const panel = $('auth-panel'), dashboard = $('dashboard');
  const sections = { start: $('auth-start'), challenge: $('auth-challenge'), enrollment: $('auth-enrollment') };
  const status = $('auth-status'), login = $('login-form'), challenge = $('mfa-form');
  const passwordEnrollment = $('enroll-password-form'), confirmation = $('enroll-confirm-form');
  const trust = $('trust-browser');
  let resolver, totpSecret, unlockedUid, busy = false, revision = 0, tokenRevision = 0, secretTimer, enrolling = false;
  $('security-preview-notice').hidden = ENROLLMENT_ENABLED;

  function provider() {
    const google = new GoogleAuthProvider();
    google.setCustomParameters({ prompt: 'select_account', login_hint: OWNER_EMAIL });
    return google;
  }
  function clearSecret() {
    clearTimeout(secretTimer);
    totpSecret = undefined;
    $('enrollment-key').value = '';
    $('enrollment-qr').replaceChildren();
    $('enrollment-qr').hidden = true;
    $('enrollment-secret').hidden = true;
    $('enrollment-manual').open = false;
    confirmation.reset();
    passwordEnrollment.reset();
  }
  function lock() {
    if (unlockedUid) onLock();
    unlockedUid = undefined;
    dashboard.hidden = true;
    panel.hidden = false;
  }
  function screen(name, focus = false) {
    for (const [key, section] of Object.entries(sections)) section.hidden = key !== name;
    $('auth-title').textContent = { start: 'Welcome back.', challenge: 'One more step.', enrollment: 'Secure your workspace.' }[name];
    if (focus) $('auth-title').focus({ preventScroll: true });
  }
  function setBusy(value) {
    busy = value;
    panel.setAttribute('aria-busy', String(value));
    for (const button of panel.querySelectorAll('button')) button.disabled = value;
    for (const field of panel.querySelectorAll('input,select')) field.disabled = value;
    $('sign-out').disabled = value;
    $('link-google').disabled = value;
  }
  async function run(operation, target = status) {
    if (busy) return;
    setBusy(true);
    message(target);
    const attempt = revision;
    try { await operation(); }
    catch (error) {
      if (error?.code === 'auth/multi-factor-auth-required' && attempt === revision) {
        beginChallenge(error);
      } else if (attempt === revision) message(target, errorMessage(error), true);
    } finally { setBusy(false); }
  }
  function beginChallenge(error) {
    resolver = getMultiFactorResolver(auth, error);
    const factors = resolver.hints.filter(hint => hint.factorId === TotpMultiFactorGenerator.FACTOR_ID);
    if (!factors.length) {
      resolver = undefined;
      message(status, 'This account has no supported Authenticator. Review account recovery in the Firebase console.', true);
      return;
    }
    const select = $('mfa-factor');
    select.replaceChildren(...factors.map((factor, index) => {
      const option = document.createElement('option');
      option.value = factor.uid;
      option.textContent = factor.displayName || `Authenticator ${index + 1}`;
      return option;
    }));
    $('mfa-factor-field').hidden = factors.length === 1;
    challenge.reset();
    screen('challenge', true);
    // Focus after the busy form has been enabled again.
    setTimeout(() => $('mfa-code').focus(), 0);
  }
  async function persistence() {
    await setPersistence(auth, trust.checked ? browserLocalPersistence : browserSessionPersistence);
  }
  function owner(user) { return user?.email === OWNER_EMAIL && user.emailVerified; }

  login.addEventListener('submit', event => {
    event.preventDefault();
    if (!login.reportValidity()) return;
    const password = $('login-password').value;
    $('login-password').value = '';
    run(async () => {
      await persistence();
      await signInWithEmailAndPassword(auth, OWNER_EMAIL, password);
    });
  });
  $('google-sign-in').addEventListener('click', () => run(async () => {
    await persistence();
    await signInWithPopup(auth, provider());
  }));
  challenge.addEventListener('submit', event => {
    event.preventDefault();
    if (!challenge.reportValidity() || !resolver) return;
    const activeResolver = resolver;
    const factorId = $('mfa-factor').value;
    const code = $('mfa-code').value;
    $('mfa-code').value = '';
    run(async () => {
      await activeResolver.resolveSignIn(TotpMultiFactorGenerator.assertionForSignIn(factorId, code));
      resolver = undefined;
    });
  });
  async function cancel() {
    if (busy) return;
    revision++;
    resolver = undefined;
    clearSecret();
    lock();
    login.reset();
    challenge.reset();
    screen('start', true);
    message(status);
    // Signing out removes the actual persisted session, not merely a preference flag.
    try { await signOut(auth); }
    catch { message(status, 'Sign-out could not finish. Close this browser and try again.', true); }
  }
  $('mfa-cancel').addEventListener('click', cancel);
  $('enrollment-cancel').addEventListener('click', cancel);
  $('sign-out').addEventListener('click', cancel);

  async function generateSecret(user, attempt) {
    if (!ENROLLMENT_ENABLED || !owner(user) || auth.currentUser !== user) return;
    const session = await multiFactor(user).getSession();
    const generated = await TotpMultiFactorGenerator.generateSecret(session);
    if (attempt !== revision || auth.currentUser !== user) return;
    clearSecret();
    totpSecret = generated;
    $('enrollment-key').value = generated.secretKey;
    // The optional QR encoder is loaded locally; the secret never goes to a QR service.
    const qrContainer = $('enrollment-qr');
    try {
      const { renderAuthenticatorQr } = await import('./auth-qr.js');
      if (attempt !== revision || totpSecret !== generated) return;
      renderAuthenticatorQr(qrContainer, generated.generateQrCodeUrl(OWNER_EMAIL, 'DainyelOnTheMove'));
      qrContainer.hidden = false;
    } catch {
      $('enrollment-manual').open = true;
    }
    if (attempt !== revision || totpSecret !== generated) return;
    $('enrollment-start').hidden = true;
    $('enrollment-secret').hidden = false;
    message(status, 'Add this account in Authenticator, then enter its current code below.');
    secretTimer = setTimeout(() => {
      clearSecret();
      $('enrollment-start').hidden = false;
      message(status, 'This setup has expired. Confirm your identity again to start a fresh setup.', true);
    }, 5 * 60 * 1000);
  }
  passwordEnrollment.addEventListener('submit', event => {
    event.preventDefault();
    if (!passwordEnrollment.reportValidity() || !ENROLLMENT_ENABLED) return;
    const user = auth.currentUser, password = $('enroll-password').value;
    $('enroll-password').value = '';
    run(async () => {
      if (!owner(user)) return;
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(OWNER_EMAIL, password));
      await generateSecret(user, revision);
    });
  });
  $('enroll-google').addEventListener('click', () => {
    const user = auth.currentUser;
    run(async () => {
      if (!owner(user) || !ENROLLMENT_ENABLED) return;
      await reauthenticateWithPopup(user, provider());
      await generateSecret(user, revision);
    });
  });
  confirmation.addEventListener('submit', event => {
    event.preventDefault();
    if (!confirmation.reportValidity() || !totpSecret || !ENROLLMENT_ENABLED) return;
    const user = auth.currentUser, secret = totpSecret, code = $('enroll-code').value;
    $('enroll-code').value = '';
    run(async () => {
      if (!owner(user)) return;
      enrolling = true;
      try {
        await multiFactor(user).enroll(TotpMultiFactorGenerator.assertionForEnrollment(secret, code), 'Google Authenticator');
        clearSecret();
        await signOut(auth);
        message(status, 'Authenticator is connected. Sign in again with Google or your password, then enter your Authenticator code.');
      } finally { enrolling = false; }
    });
  });
  $('link-google').addEventListener('click', () => run(async () => {
    const user = auth.currentUser;
    if (!owner(user) || user.uid !== unlockedUid) return;
    await linkWithPopup(user, provider());
    $('link-google').hidden = true;
    message($('security-status'), 'Google is connected to this owner account. Your Authenticator remains required.');
  }, $('security-status')));

  // This observer is asynchronous: reject stale token results after sign-out or another sign-in.
  setBusy(true);
  function ready() {
    $('auth-loading').hidden = true;
    document.dispatchEvent(new Event('admin:auth-ready'));
    setBusy(false);
  }
  onIdTokenChanged(auth, user => {
    if (!busy || !$('auth-loading').hidden) ready();
    const attempt = ++tokenRevision;
    if (!owner(user)) {
      clearSecret();
      lock();
      screen('start');
      if (user) {
        signOut(auth).catch(() => {});
        message(status, 'Use the verified owner account to open this workspace.', true);
      }
      return;
    }
    getIdTokenResult(user).then(token => {
      if (attempt !== tokenRevision || auth.currentUser !== user) return;
      if (enrolling) { lock(); return; }
      const verifiedTotp = token.claims.firebase?.sign_in_second_factor === 'totp';
      if (!verifiedTotp) {
        lock();
        const hasTotp = multiFactor(user).enrolledFactors.some(factor => factor.factorId === TotpMultiFactorGenerator.FACTOR_ID);
        if (hasTotp) {
          signOut(auth).then(() => message(status, 'Sign in again and enter your Authenticator code to open the workspace.')).catch(() => {});
          return;
        }
        screen('enrollment');
        $('enrollment-availability').hidden = ENROLLMENT_ENABLED;
        $('enrollment-start').hidden = !ENROLLMENT_ENABLED || Boolean(totpSecret);
        const providers = user.providerData.map(item => item.providerId);
        $('enroll-google').hidden = !providers.includes('google.com');
        passwordEnrollment.hidden = !providers.includes('password');
        return;
      }
      clearSecret();
      resolver = undefined;
      panel.hidden = true;
      dashboard.hidden = false;
      $('security-summary').textContent = 'Your sign-in was verified with an Authenticator code.';
      $('security-browser').textContent = 'A trusted browser retains only its Firebase sign-in session. Signing out, clearing browser data or revoking the session requires a new sign-in and code.';
      $('link-google').hidden = user.providerData.some(item => item.providerId === 'google.com');
      if (unlockedUid !== user.uid) {
        unlockedUid = user.uid;
        onUnlock(user);
      }
    }).catch(() => {
      if (attempt !== tokenRevision) return;
      lock();
      message(status, 'Your secure session could not be checked. Sign out and try again.', true);
    });
  }, () => { ready(); lock(); message(status, 'Sign-in could not start. Refresh the page and try again.', true); });
  window.addEventListener('pagehide', () => {
    clearSecret();
    $('enrollment-start').hidden = !ENROLLMENT_ENABLED;
  });
}
