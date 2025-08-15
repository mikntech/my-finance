import { useEffect, useState } from 'react';
import {
  AppBar,
  BottomNavigation,
  BottomNavigationAction,
  Box,
  Button,
  Container,
  CssBaseline,
  Paper,
  Toolbar,
  Typography,
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import ListAltIcon from '@mui/icons-material/ListAlt';
import InsightsIcon from '@mui/icons-material/Insights';

function SettingsPage() {
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
    <Container sx={{ py: 2 }}>
      <Typography variant="h5" gutterBottom>
        הגדרות
      </Typography>
      <Typography sx={{ mb: 2 }}>התחבר לבנקים וחברות אשראי כדי למשוך תנועות אוטומטית.</Typography>
      <Button variant="contained" onClick={() => void startConnect()}>
        חיבור בנק/כרטיס
      </Button>
    </Container>
  );
}

function TransactionsPage() {
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
    <Container sx={{ py: 2 }}>
      <Typography variant="h5" gutterBottom>
        תנועות
      </Typography>
      <Button variant="contained" onClick={() => void load()}>
        רענון
      </Button>
      <pre style={{ fontSize: 12 }}>{JSON.stringify(items.slice(0, 10), null, 2)}</pre>
    </Container>
  );
}

function StatsPage() {
  return (
    <Container sx={{ py: 2 }}>
      <Typography variant="h5" gutterBottom>
        סטטיסטיקות
      </Typography>
      <Typography>דוחות חודשיים, פילוח לפי קטגוריה ומשלם — בקרוב.</Typography>
    </Container>
  );
}

export default function App() {
  const [tab, setTab] = useState(1); // 0: settings, 1: txs, 2: stats
  return (
    <Box sx={{ pb: 7 }}>
      <CssBaseline />
      <AppBar position="static" color="primary">
        <Toolbar>
          <Typography variant="h6" component="div">
            הכסף שלי
          </Typography>
        </Toolbar>
      </AppBar>

      {tab === 0 && <SettingsPage />}
      {tab === 1 && <TransactionsPage />}
      {tab === 2 && <StatsPage />}

      <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0 }} elevation={3}>
        <BottomNavigation value={tab} onChange={(_, v) => setTab(v)} showLabels>
          <BottomNavigationAction label="הגדרות" icon={<SettingsIcon />} />
          <BottomNavigationAction label="תנועות" icon={<ListAltIcon />} />
          <BottomNavigationAction label="סטטיסטיקות" icon={<InsightsIcon />} />
        </BottomNavigation>
      </Paper>
    </Box>
  );
}
