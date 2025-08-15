import { useEffect, useState } from 'react';
import { Settings, ListChecks, ChartPie } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const region = 'eu-central-1';
const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID;
const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID;
const domain = import.meta.env.VITE_COGNITO_DOMAIN; // e.g., your-prefix.auth.eu-central-1.amazoncognito.com
const redirect = typeof window !== 'undefined' ? window.location.origin + '/callback' : '';

function LoginButtons() {
  const loggedIn = !!localStorage.getItem('idToken');
  const loginUrl = domain
    ? `https://${domain}/login?response_type=token&client_id=${clientId}&redirect_uri=${encodeURIComponent(
        redirect
      )}`
    : '';
  return (
    <div className="flex gap-2 mb-4">
      {!loggedIn && (
        <button
          className="border px-3 py-1 rounded-md hover:bg-gray-50"
          onClick={() => (window.location.href = loginUrl)}
          disabled={!loginUrl}
        >
          התחברות
        </button>
      )}
      {loggedIn && (
        <button
          className="border px-3 py-1 rounded-md hover:bg-gray-50"
          onClick={() => {
            localStorage.removeItem('idToken');
            location.reload();
          }}
        >
          התנתקות
        </button>
      )}
    </div>
  );
}

function SettingsPage() {
  const { t } = useTranslation();
  async function startConnect() {
    const token = localStorage.getItem('idToken') || '';
    const res = await fetch(import.meta.env.VITE_API_URL + '/v1/connect/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : '',
      },
      body: JSON.stringify({ country_code: 'IL' }),
    });
    const data = await res.json();
    if (data?.connect_url) window.location.href = data.connect_url;
    else alert('Connect failed: ' + (data?.error || res.status));
  }
  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-2">{t('settings')}</h1>
      <LoginButtons />
      <p className="mb-3">{t('connectDesc')}</p>
      <button
        className="bg-blue-600 text-white px-4 py-2 rounded-md"
        onClick={() => void startConnect()}
      >
        {t('connectCta')}
      </button>
    </div>
  );
}

function TransactionsPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<any[]>([]);
  async function load() {
    const token = localStorage.getItem('idToken') || '';
    const res = await fetch(import.meta.env.VITE_API_URL + '/v1/transactions', {
      headers: { Authorization: token ? `Bearer ${token}` : '' },
    });
    const data = await res.json();
    setItems(data.items || []);
  }
  useEffect(() => {
    void load();
  }, []);
  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-2">{t('transactions')}</h1>
      <button className="bg-blue-600 text-white px-3 py-1 rounded-md" onClick={() => void load()}>
        {t('refresh')}
      </button>
      <pre className="text-xs mt-3">{JSON.stringify(items.slice(0, 10), null, 2)}</pre>
    </div>
  );
}

function StatsPage() {
  const { t } = useTranslation();
  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-2">{t('stats')}</h1>
      <p>דוחות חודשיים, פילוח לפי קטגוריה ומשלם — בקרוב.</p>
    </div>
  );
}

export default function App() {
  const { t } = useTranslation();
  const [tab, setTab] = useState(1); // 0: settings, 1: txs, 2: stats
  return (
    <div className="pb-16">
      <header className="h-12 flex items-center px-4 border-b bg-white">
        <div className="font-semibold">{t('appTitle')}</div>
      </header>

      {tab === 0 && <SettingsPage />}
      {tab === 1 && <TransactionsPage />}
      {tab === 2 && <StatsPage />}

      <nav className="fixed bottom-0 left-0 right-0 border-t bg-white">
        <div className="grid grid-cols-3 h-14">
          <button
            className={`flex items-center justify-center gap-1 text-sm ${tab === 0 ? 'text-blue-600' : 'text-gray-600'}`}
            onClick={() => setTab(0)}
          >
            <Settings size={18} />
            <span>{t('settings')}</span>
          </button>
          <button
            className={`flex items-center justify-center gap-1 text-sm ${tab === 1 ? 'text-blue-600' : 'text-gray-600'}`}
            onClick={() => setTab(1)}
          >
            <ListChecks size={18} />
            <span>{t('transactions')}</span>
          </button>
          <button
            className={`flex items-center justify-center gap-1 text-sm ${tab === 2 ? 'text-blue-600' : 'text-gray-600'}`}
            onClick={() => setTab(2)}
          >
            <ChartPie size={18} />
            <span>{t('stats')}</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
