import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';
import { Client } from 'pg';

const secrets = new SecretsManagerClient({});

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
  return client;
}

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  try {
    const { text, params } = JSON.parse(event.body ?? '{}') as {
      text: string;
      params?: unknown[];
    };
    if (!text || !/^\s*select\s+/i.test(text)) {
      return { statusCode: 400, body: 'Only SELECT queries are allowed' };
    }

    const client = await getDbClient();
    const res = await client.query(text, params);
    await client.end();
    return { statusCode: 200, body: JSON.stringify(res.rows) };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Query error', err }),
    };
  }
};
