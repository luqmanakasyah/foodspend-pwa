import React, { useState } from 'react';
import { getAuthModule } from '../lib/firebase-lite';

export function AuthScreen() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [redirectErr, setRedirectErr] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);

  const signIn = async () => {
    setErr(null);
    setLoading(true);
    try {
      const ua = navigator.userAgent;
      const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(ua));
      const safari = /Safari/.test(ua) && !/Chrome/.test(ua);
      const env = { ua, ios, safari, attempt: attempts + 1 };
      console.info('[auth] signIn start', env);
      sessionStorage.setItem('fs_auth_attempt', String(Date.now()));
      const canUseStorage = (() => {
        try { const k='__fs_test__'; localStorage.setItem(k,'1'); localStorage.removeItem(k); return true; }
        catch { try { sessionStorage.setItem('__fs_test__','1'); sessionStorage.removeItem('__fs_test__'); return true; } catch { return false; } }
      })();
      console.info('[auth] storage capability', { canUseStorage });
  const authMod = await getAuthModule();
  const provider = new authMod.GoogleAuthProvider();
      if (!provider || provider.providerId !== 'google.com') { setErr('Provider initialization failure'); return; }
      try {
  await authMod.signInWithPopup(authMod.auth, provider);
        return;
      } catch (popupErr: any) {
        const pCode = popupErr?.code || popupErr?.message;
        if (!canUseStorage) { setErr('Popup blocked & no durable storage; enable cookies or open in external Safari/Chrome.'); return; }
  await authMod.signInWithRedirect(authMod.auth, provider);
        return;
      }
    } catch(e:any) {
      const code = e?.code || e?.message; let msg = code || 'Sign-in failed';
      if (code === 'auth/configuration-not-found') msg += ' (Google provider not fully configured)';
      if (code === 'auth/operation-not-allowed') msg += ' (Provider disabled)';
      if (code === 'auth/argument-error') msg += ' (Bad parameter)';
      setErr(msg);
    } finally {
      setLoading(false);
      setAttempts(a=>a+1);
    }
  };

  return (
    <div style={{ maxWidth: 420, margin: '20vh auto', textAlign: 'center' }}>
  <h1>SpendTrackX</h1>
  <p>Track food spending anywhere. Works offline.</p>
      <button onClick={signIn} className="btn" disabled={loading}>{loading ? 'Opening…' : 'Sign in with Google'}</button>
      {(attempts > 0 && (err || redirectErr)) && (
        <div style={{ marginTop: 12, color: '#b91c1c', fontSize: 12 }}>
          {(err || redirectErr)} – Ensure:
          <ul style={{ textAlign: 'left', margin: '4px 0 0 16px', padding: 0 }}>
            <li>Popup blocker disabled</li>
            <li>Current domain is in Firebase Auth authorized domains</li>
            <li>Google provider enabled in Firebase Console</li>
            <li>Cookies not disabled (iOS: Settings &gt; Safari &gt; Block All Cookies OFF)</li>
          </ul>
        </div>
      )}
    </div>
  );
}
