import { useEffect, useState } from "react";
import { Button, Container, Typography } from "@mui/material";

export default function App() {
  const [items, setItems] = useState<any[]>([]);
  async function load() {
    const token = localStorage.getItem("idToken") || "";
    const res = await fetch(import.meta.env.VITE_API_URL + "/v1/transactions", {
      headers: { Authorization: token ? `Bearer ${token}` : "" },
    });
    const data = await res.json();
    setItems(data.items || []);
  }
  useEffect(() => {
    void load();
  }, []);
  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        דשבורד הוצאות
      </Typography>
      <Button variant="contained" onClick={() => void load()}>
        רענון
      </Button>
      <pre>{JSON.stringify(items.slice(0, 5), null, 2)}</pre>
    </Container>
  );
}
