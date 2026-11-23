import { useEffect, useState } from 'react';

type Connection = { configured: boolean; connected: boolean; enabled: boolean; mailbox: string; connectedAt?: string; reconnectRequired?: boolean };

export function MicrosoftEmailSettings() {
  const [connection, setConnection] = useState<Connection | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function refresh() {
    setError('');
    try {
      const response = await fetch('/api/admin/email/microsoft', { cache: 'no-store' });
      if (!response.ok) throw new Error('Could not check the Microsoft connection. Please sign in again or retry.');
      setConnection(await response.json());
    } catch (err) { setError(err instanceof Error ? err.message : 'Connection unavailable.'); }
  }
  useEffect(() => { void refresh(); }, []);
  async function connect() {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/admin/email/microsoft/connect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not start Microsoft sign-in.');
      const destination = new URL(result.url);
      if (destination.origin !== 'https://login.microsoftonline.com') throw new Error('Unexpected sign-in address.');
      window.location.assign(destination.href);
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not connect.'); setBusy(false); }
  }
  const result = new URLSearchParams(window.location.search).get('email');
  const messages: Record<string, string> = {
    connected: 'Microsoft authorisation completed. Check the connection status below.',
    cancelled: 'Microsoft sign-in was cancelled. No new connection was saved.',
    'wrong-account': 'Please sign in using sales@exceptionalrealestate.com.au. The other account was not connected.',
    failed: 'Microsoft could not be connected. Please check the app setup or ask the Microsoft 365 administrator.',
  };
  return <section className="max-w-3xl space-y-6" aria-labelledby="microsoft-email-title">
    <div><p className="text-xs text-white/60 uppercase tracking-widest mb-3">Website enquiry notifications</p>
      <h2 id="microsoft-email-title" className="text-3xl font-bold">Microsoft 365 email</h2>
      <p className="text-sm text-white/70 mt-4 leading-relaxed">Send website enquiries to sales@exceptionalrealestate.com.au using the existing sales mailbox. Replies go to the person who enquired.</p></div>
    {result && messages[result] && <p role="status" className="text-sm border border-white/25 p-4">{messages[result]}</p>}
    {error && <p role="alert" className="text-sm border border-white/40 p-4">{error}</p>}
    <div className="border border-white/20 p-6 space-y-4">
      <p className="font-medium">{connection ? connection.connected ? 'Sales mailbox connected' : connection.reconnectRequired ? 'Please reconnect Microsoft 365' : connection.configured ? 'Ready to connect sales@' : 'Microsoft app setup needed' : 'Checking connection…'}</p>
      {connection?.connected && <p className="text-sm text-white/70">{connection.enabled ? 'Automatic enquiry notifications are enabled.' : 'Authorised, but automatic sending is switched off. Local and preview forms never send real emails.'}</p>}
      {connection && !connection.configured && <p className="text-sm text-white/70 leading-relaxed">The client’s Microsoft 365 administrator needs to register the website application and configure its connection details before sign-in can begin. No mailbox is connected yet.</p>}
      <p className="text-sm text-white/65 leading-relaxed">Microsoft will ask for permission to send mail, identify the account and keep the connection active. This connection does not request permission to read inbox messages.</p>
      <div className="flex flex-wrap gap-3">
        <button type="button" disabled={!connection?.configured || busy} onClick={() => void connect()} className="zenu-button-outline-light disabled:opacity-40">{busy ? 'Opening Microsoft…' : connection?.connected ? 'Reconnect Microsoft 365' : 'Connect Microsoft 365'}</button>
        <button type="button" onClick={() => void refresh()} className="text-sm underline px-3 py-2">Refresh status</button>
      </div>
    </div>
    <p className="text-sm text-white/60">Connecting does not send a test email. We’ll check delivery separately once the account is authorised.</p>
  </section>;
}
