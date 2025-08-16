'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type Row = {
  id: string;
  data: Record<string, any>;
  created_at?: string;
  updated_at?: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

export default function Home() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState<string>(
    'select id, data, created_at, updated_at from rows order by created_at desc limit 50'
  );
  const [queryResults, setQueryResults] = useState<any[] | null>(null);

  const columns = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => {
      Object.keys(r.data ?? {}).forEach((k) => s.add(k));
    });
    return Array.from(s).sort();
  }, [rows]);

  async function refresh() {
    if (!API_URL) {
      setError('Set NEXT_PUBLIC_API_URL to your API (e.g., https://abc.execute-api.us-east-1.amazonaws.com/dev)');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}rows`, { cache: 'no-store' });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as Row[];
      setRows(data);
    } catch (e: any) {
      setError(e?.message || 'Failed to load rows');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function addRow() {
    setSaving('new');
    setError(null);
    try {
      const res = await fetch(`${API_URL}rows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error(await res.text());
      const created = (await res.json()) as Row;
      setRows((prev) => [created, ...prev]);
    } catch (e: any) {
      setError(e?.message || 'Failed to add row');
    } finally {
      setSaving(null);
    }
  }

  async function updateRow(id: string, nextData: Record<string, any>) {
    setSaving(id);
    setError(null);
    try {
      const res = await fetch(`${API_URL}rows/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextData),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated = (await res.json()) as Row;
      setRows((prev) => prev.map((r) => (r.id === id ? updated : r)));
    } catch (e: any) {
      setError(e?.message || 'Failed to update row');
    } finally {
      setSaving(null);
    }
  }

  async function deleteRow(id: string) {
    setSaving(id);
    setError(null);
    try {
      const res = await fetch(`${API_URL}rows/${id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) throw new Error(await res.text());
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (e: any) {
      setError(e?.message || 'Failed to delete row');
    } finally {
      setSaving(null);
    }
  }

  async function runQuery() {
    setError(null);
    setQueryResults(null);
    try {
      const res = await fetch(`${API_URL}query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: query }),
      });
      if (!res.ok) throw new Error(await res.text());
      const results = (await res.json()) as any[];
      setQueryResults(results);
    } catch (e: any) {
      setError(e?.message || 'Failed to run query');
    }
  }

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Sheet-like Rows</h1>
        <div className="flex items-center gap-2">
          <Button onClick={refresh} disabled={loading}>
            Refresh
          </Button>
          <Button onClick={addRow} disabled={!!saving}>
            {saving === 'new' ? 'Adding…' : 'Add row'}
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[160px]">id</TableHead>
              {columns.map((c) => (
                <TableHead key={c}>{c}</TableHead>
              ))}
              <TableHead className="w-[100px]">actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="text-xs text-muted-foreground">{row.id}</TableCell>
                {columns.map((c) => {
                  const value = row.data?.[c] ?? '';
                  const isNumber = typeof value === 'number';
                  const str = typeof value === 'string' ? value : isNumber ? String(value) : '';
                  return (
                    <TableCell key={c}>
                      <Input
                        defaultValue={str}
                        onBlur={(e) => {
                          const v = e.currentTarget.value;
                          const next = { ...(row.data || {}) };
                          if (v === '') {
                            delete next[c];
                          } else {
                            next[c] = isNumber && !Number.isNaN(Number(v)) ? Number(v) : v;
                          }
                          if (JSON.stringify(next) !== JSON.stringify(row.data || {})) {
                            updateRow(row.id, next);
                          }
                        }}
                      />
                    </TableCell>
                  );
                })}
                <TableCell>
                  <Button
                    variant="secondary"
                    onClick={() => deleteRow(row.id)}
                    disabled={saving === row.id}
                  >
                    {saving === row.id ? 'Deleting…' : 'Delete'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + 2} className="text-center text-sm text-muted-foreground">
                  {loading ? 'Loading…' : 'No rows yet'}
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Query</h2>
          <Button onClick={runQuery}>Run</Button>
        </div>
        <Textarea value={query} onChange={(e) => setQuery(e.target.value)} rows={4} />
        {queryResults && (
          <div className="rounded-md border">
            <Table>
              <TableCaption>Query results</TableCaption>
              <TableHeader>
                <TableRow>
                  {Object.keys(
                    queryResults.reduce((acc, row) => {
                      Object.keys(row || {}).forEach((k) => (acc[k] = true));
                      return acc;
                    }, {} as Record<string, true>)
                  ).map((k) => (
                    <TableHead key={k}>{k}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {queryResults.map((r, i) => {
                  const keys = Object.keys(r || {});
                  return (
                    <TableRow key={i}>
                      {keys.map((k) => (
                        <TableCell key={k}>
                          {typeof r[k] === 'object' ? JSON.stringify(r[k]) : String(r[k])}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}
                {queryResults.length === 0 ? (
                  <TableRow>
                    <TableCell className="text-center text-sm text-muted-foreground">
                      No results
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}