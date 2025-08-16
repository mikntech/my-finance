import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';
import { Client } from 'pg';

const secrets = new SecretsManagerClient({});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
};

async function getDbClient(): Promise<Client> {
  const secretArn = process.env['DB_SECRET_ARN']!;
  const host = process.env['DB_HOST']!;
  const port = Number(process.env['DB_PORT'] || '5432');
  const database = process.env['DB_NAME']!;

  const secret = await secrets.send(
    new GetSecretValueCommand({ SecretId: secretArn })
  );
  const creds = JSON.parse(secret.SecretString ?? '{}') as {
    username: string;
    password: string;
  };

  const client = new Client({
    host,
    port,
    database,
    user: creds.username,
    password: creds.password,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  // Ensure uuid generation function exists, then ensure table exists
  await client.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
  await client.query(
    'CREATE TABLE IF NOT EXISTS rows (id uuid default gen_random_uuid() primary key, data jsonb not null, created_at timestamptz default now(), updated_at timestamptz default now())'
  );
  return client;
}

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  if (event.requestContext.http.method === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  let client: Client | undefined;
  try {
    client = await getDbClient();
    const method = event.requestContext.http.method;
    const path = event.rawPath || '';

    if (method === 'GET' && /\/rows\/?$/.test(path)) {
      const res = await client.query(
        'SELECT * FROM rows ORDER BY created_at DESC LIMIT 500'
      );
      return { statusCode: 200, headers: corsHeaders, body: JSON.stringify(res.rows) };
    }

    if (method === 'POST' && /\/rows\/?$/.test(path)) {
      const body = JSON.parse(event.body ?? '{}');
      const res = await client.query(
        'INSERT INTO rows (data) VALUES ($1) RETURNING *',
        [body]
      );
      return { statusCode: 201, headers: corsHeaders, body: JSON.stringify(res.rows[0]) };
    }

    const idMatch = path.match(/\/rows\/([0-9a-fA-F-]{36})$/);
    if (idMatch && method === 'PATCH') {
      const id = idMatch[1];
      const body = JSON.parse(event.body ?? '{}');
      const res = await client.query(
        'UPDATE rows SET data = $1, updated_at = now() WHERE id = $2 RETURNING *',
        [body, id]
      );
      if (res.rowCount === 0) return { statusCode: 404, headers: corsHeaders, body: 'Not found' };
      return { statusCode: 200, headers: corsHeaders, body: JSON.stringify(res.rows[0]) };
    }

    if (idMatch && method === 'DELETE') {
      const id = idMatch[1];
      const res = await client.query('DELETE FROM rows WHERE id = $1', [id]);
      if (res.rowCount === 0) return { statusCode: 404, headers: corsHeaders, body: 'Not found' };
      return { statusCode: 204, headers: corsHeaders, body: '' };
    }

    return { statusCode: 400, headers: corsHeaders, body: 'Unsupported route' };
  } catch (err) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'Server error', err }),
    };
  } finally {
    if (client) {
      try {
        await client.end();
      } catch {}
    }
  }
};