import { APIGatewayProxyHandler } from 'aws-lambda';
import {
  DynamoDBClient,
  QueryCommand,
  PutItemCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { randomUUID } from 'crypto';

const ddb = new DynamoDBClient({});
const TABLE = process.env.TABLE_NAME!;

function userIdFromAuth(event: any): string | undefined {
  return event.requestContext?.authorizer?.claims?.sub;
}

function basicAuthOk(event: any): boolean {
  const user = process.env.SALTEDGE_WEBHOOK_USER || '';
  const pass = process.env.SALTEDGE_WEBHOOK_PASS || '';
  if (!user && !pass) return true; // disabled
  const header = event.headers?.authorization || event.headers?.Authorization;
  if (!header?.startsWith('Basic ')) return false;
  try {
    const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
    const [u, p] = decoded.split(':');
    return u === user && p === pass;
  } catch {
    return false;
  }
}

async function saltedgeRequest(path: string, body: any) {
  const appId = process.env.SALTEDGE_ID!;
  const secret = process.env.SALTEDGE_KEY!;
  const resp = await fetch(`https://www.saltedge.com/api/v5${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'App-id': appId,
      Secret: secret,
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`SaltEdge ${path} failed: ${resp.status} ${text}`);
  }
  return resp.json();
}

async function saltedgeGet(path: string) {
  const appId = process.env.SALTEDGE_ID!;
  const secret = process.env.SALTEDGE_KEY!;
  const resp = await fetch(`https://www.saltedge.com/api/v5${path}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'App-id': appId,
      Secret: secret,
    },
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`SaltEdge GET ${path} failed: ${resp.status} ${text}`);
  }
  return resp.json();
}

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function findCustomerIdByIdentifier(identifier: string): Promise<number | undefined> {
  // 1) Direct search
  try {
    const res = await saltedgeGet(
      `/customers?search[identifier]=${encodeURIComponent(identifier)}&per_page=100`
    );
    const id = res?.data?.[0]?.id;
    if (typeof id === 'number') return id;
  } catch {}
  // 2) Paginate list (handles accounts with multiple customers)
  let nextPath: string | undefined = '/customers?per_page=100';
  for (let i = 0; i < 10 && nextPath; i++) {
    const res = await saltedgeGet(nextPath);
    const list = Array.isArray(res?.data) ? res.data : [];
    const match = list.find((c: any) => c?.identifier === identifier);
    if (match?.id && typeof match.id === 'number') return match.id;
    const meta = res?.meta || {};
    if (meta?.next_page) nextPath = `/customers?page=${meta.next_page}&per_page=100`;
    else if (meta?.next_id) nextPath = `/customers?from_id=${meta.next_id}&per_page=100`;
    else if (res?.links?.next)
      nextPath = String(res.links.next).replace('https://www.saltedge.com/api/v5', '');
    else nextPath = undefined;
    await delay(200 * (i + 1));
  }
  return undefined;
}

async function getOrCreateCustomerId(identifier: string): Promise<number> {
  try {
    const created = await saltedgeRequest('/customers', { data: { identifier } });
    const id = created?.data?.id;
    if (typeof id === 'number') return id;
  } catch (e: any) {
    const msg = String(e?.message || '');
    const isDuplicate =
      msg.includes('DuplicatedCustomer') ||
      msg.includes('already exists') ||
      msg.includes('identifier has already been taken');
    if (!isDuplicate) throw e;
  }
  const id = await findCustomerIdByIdentifier(identifier);
  if (typeof id !== 'number') throw new Error('Could not resolve Salt Edge customer_id');
  return id;
}

export const handler: APIGatewayProxyHandler = async (event) => {
  // Webhooks (no auth except optional Basic Auth)
  if (event.path.endsWith('/webhooks/saltedge')) {
    if (!basicAuthOk(event)) return { statusCode: 401, body: 'Unauthorized' };
    console.log('saltedge webhook', event.body);
    return { statusCode: 200, body: 'ok' };
  }
  if (event.path.endsWith('/webhooks/saltedge/providers')) {
    if (!basicAuthOk(event)) return { statusCode: 401, body: 'Unauthorized' };
    console.log('saltedge providers webhook', event.body);
    return { statusCode: 200, body: 'ok' };
  }

  const userId = userIdFromAuth(event);
  if (!userId) return { statusCode: 401, body: 'Unauthorized' };

  const { httpMethod, path } = event;

  if (path.endsWith('/connect/start') && httpMethod === 'POST') {
    try {
      const body = JSON.parse(event.body ?? '{}');
      const country_code = body.country_code || 'IL';
      const provider_code = body.provider_code; // optional preselected provider

      const identifier = `USER#${userId}`;
      const customer_id = await getOrCreateCustomerId(identifier);

      const redirect_url_success = `https://${process.env.APP_DOMAIN || 'app.the-libs.com'}/connect/success`;
      const payload: any = {
        data: {
          customer_id, // numeric id
          country_code,
          attempt: { return_to: redirect_url_success },
          ...(provider_code ? { provider_code } : {}),
          consent: { scopes: ['account_details', 'transactions'] },
        },
      };
      const res = await saltedgeRequest('/connect_sessions/create', payload);
      const connect_url = res?.data?.connect_url;
      return { statusCode: 200, body: JSON.stringify({ connect_url }) };
    } catch (err: any) {
      console.error('connect/start error', err);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: err?.message || 'connect_failed' }),
      };
    }
  }

  if (path.endsWith('/transactions') && httpMethod === 'GET') {
    const yyyymm = (event.queryStringParameters?.month ?? '').replace('-', '');
    const KeyConditionExpression = yyyymm ? 'gsi1pk = :g AND begins_with(gsi1sk, :b)' : 'pk = :p';
    const ExpressionAttributeValues = yyyymm
      ? { ':g': { S: `USER#${userId}#MONTH#${yyyymm}` }, ':b': { S: '' } }
      : { ':p': { S: `USER#${userId}` } };
    const indexName = yyyymm ? 'gsi1' : undefined;
    const res = await ddb.send(
      new QueryCommand({
        TableName: TABLE,
        IndexName: indexName,
        KeyConditionExpression,
        ExpressionAttributeValues,
        Limit: 200,
      })
    );
    const items = (res.Items ?? []).map(unmarshall);
    return { statusCode: 200, body: JSON.stringify({ items }) };
  }

  if (path.endsWith('/transactions') && httpMethod === 'POST') {
    const body = JSON.parse(event.body ?? '{}');
    const now = new Date(body.date ?? Date.now());
    const yyyymm = now.toISOString().slice(0, 7).replace('-', '');
    const id = randomUUID();
    const item: Record<string, any> = {
      pk: `USER#${userId}`,
      sk: `TX#${now.toISOString().slice(0, 10)}#${id}`,
      id,
      gsi1pk: `USER#${userId}#MONTH#${yyyymm}`,
      gsi1sk: `${now.toISOString()}#${id}`,
      amountNis: body.amountNis,
      currency: body.currency ?? 'ILS',
      date: now.toISOString(),
      merchantRaw: body.merchantRaw ?? '',
      merchantClean: body.merchantClean ?? body.merchantRaw ?? '',
      category: body.category ?? 'Uncategorized',
      institution: body.institution ?? '',
      accountId: body.accountId ?? '',
      isIncome: !!body.isIncome,
      source: body.source ?? 'api',
    };
    await ddb.send(new PutItemCommand({ TableName: TABLE, Item: marshall(item) }));
    return {
      statusCode: 201,
      body: JSON.stringify({ ok: true, id, sk: item.sk }),
    };
  }

  if (path.endsWith('/transactions') && httpMethod === 'PUT') {
    const body = JSON.parse(event.body ?? '{}');
    const sk = body.sk as string | undefined;
    if (!sk) return { statusCode: 400, body: 'Missing sk' };
    const updates: string[] = [];
    const names: Record<string, any> = {};
    const values: Record<string, any> = {};
    function addUpdate(attr: string, value: any) {
      const nameKey = `#${attr}`;
      const valueKey = `:${attr}`;
      names[nameKey] = attr;
      values[valueKey] = marshall({ v: value }).v;
      updates.push(`${nameKey} = ${valueKey}`);
    }
    if (body.category !== undefined) addUpdate('category', body.category);
    if (body.merchantClean !== undefined) addUpdate('merchantClean', body.merchantClean);
    if (updates.length === 0) return { statusCode: 400, body: 'No updatable fields' };
    await ddb.send(
      new UpdateItemCommand({
        TableName: TABLE,
        Key: marshall({ pk: `USER#${userId}`, sk }),
        UpdateExpression: 'SET ' + updates.join(', '),
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
      })
    );
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  }

  if (path.endsWith('/budgets') && httpMethod === 'GET') {
    return {
      statusCode: 200,
      body: JSON.stringify({
        month: new Date().toISOString().slice(0, 7),
        categories: [],
      }),
    };
  }

  if (path.endsWith('/budgets') && httpMethod === 'PUT') {
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  }

  return { statusCode: 404, body: 'Not found' };
};
