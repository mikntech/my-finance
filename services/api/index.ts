import { APIGatewayProxyHandler } from "aws-lambda";
import {
  DynamoDBClient,
  QueryCommand,
  PutItemCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { randomUUID } from "crypto";

const ddb = new DynamoDBClient({});
const TABLE = process.env.TABLE_NAME!;

function userIdFromAuth(event: any): string | undefined {
  return event.requestContext?.authorizer?.claims?.sub;
}

function basicAuthOk(event: any): boolean {
  const user = process.env.SALTEDGE_WEBHOOK_USER || "";
  const pass = process.env.SALTEDGE_WEBHOOK_PASS || "";
  if (!user && !pass) return true; // disabled
  const header = event.headers?.authorization || event.headers?.Authorization;
  if (!header?.startsWith("Basic ")) return false;
  try {
    const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
    const [u, p] = decoded.split(":");
    return u === user && p === pass;
  } catch {
    return false;
  }
}

export const handler: APIGatewayProxyHandler = async (event) => {
  // Webhooks (no auth except optional Basic Auth)
  if (event.path.endsWith("/webhooks/saltedge")) {
    if (!basicAuthOk(event)) return { statusCode: 401, body: "Unauthorized" };
    // TODO: verify signature if configured, and enqueue processing
    console.log("saltedge webhook", event.body);
    return { statusCode: 200, body: "ok" };
  }
  if (event.path.endsWith("/webhooks/saltedge/providers")) {
    if (!basicAuthOk(event)) return { statusCode: 401, body: "Unauthorized" };
    console.log("saltedge providers webhook", event.body);
    return { statusCode: 200, body: "ok" };
  }

  const userId = userIdFromAuth(event);
  if (!userId) return { statusCode: 401, body: "Unauthorized" };

  const { httpMethod, path } = event;

  if (path.endsWith("/transactions") && httpMethod === "GET") {
    const yyyymm = (event.queryStringParameters?.month ?? "").replace("-", "");
    const KeyConditionExpression = yyyymm
      ? "gsi1pk = :g AND begins_with(gsi1sk, :b)"
      : "pk = :p";
    const ExpressionAttributeValues = yyyymm
      ? { ":g": { S: `USER#${userId}#MONTH#${yyyymm}` }, ":b": { S: "" } }
      : { ":p": { S: `USER#${userId}` } };
    const indexName = yyyymm ? "gsi1" : undefined;
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

  if (path.endsWith("/transactions") && httpMethod === "POST") {
    const body = JSON.parse(event.body ?? "{}");
    const now = new Date(body.date ?? Date.now());
    const yyyymm = now.toISOString().slice(0, 7).replace("-", "");
    const id = randomUUID();
    const item: Record<string, any> = {
      pk: `USER#${userId}`,
      sk: `TX#${now.toISOString().slice(0, 10)}#${id}`,
      id,
      gsi1pk: `USER#${userId}#MONTH#${yyyymm}`,
      gsi1sk: `${now.toISOString()}#${id}`,
      amountNis: body.amountNis,
      currency: body.currency ?? "ILS",
      date: now.toISOString(),
      merchantRaw: body.merchantRaw ?? "",
      merchantClean: body.merchantClean ?? body.merchantRaw ?? "",
      category: body.category ?? "Uncategorized",
      institution: body.institution ?? "",
      accountId: body.accountId ?? "",
      isIncome: !!body.isIncome,
      source: body.source ?? "api",
    };
    await ddb.send(
      new PutItemCommand({ TableName: TABLE, Item: marshall(item) })
    );
    return {
      statusCode: 201,
      body: JSON.stringify({ ok: true, id, sk: item.sk }),
    };
  }

  if (path.endsWith("/transactions") && httpMethod === "PUT") {
    const body = JSON.parse(event.body ?? "{}");
    const sk = body.sk as string | undefined;
    if (!sk) return { statusCode: 400, body: "Missing sk" };
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
    if (body.category !== undefined) addUpdate("category", body.category);
    if (body.merchantClean !== undefined)
      addUpdate("merchantClean", body.merchantClean);
    if (updates.length === 0)
      return { statusCode: 400, body: "No updatable fields" };
    await ddb.send(
      new UpdateItemCommand({
        TableName: TABLE,
        Key: marshall({ pk: `USER#${userId}`, sk }),
        UpdateExpression: "SET " + updates.join(", "),
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
      })
    );
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  }

  if (path.endsWith("/budgets") && httpMethod === "GET") {
    return {
      statusCode: 200,
      body: JSON.stringify({
        month: new Date().toISOString().slice(0, 7),
        categories: [],
      }),
    };
  }

  if (path.endsWith("/budgets") && httpMethod === "PUT") {
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  }

  return { statusCode: 404, body: "Not found" };
};
