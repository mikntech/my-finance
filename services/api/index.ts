import { APIGatewayProxyHandler } from "aws-lambda";
import {
  DynamoDBClient,
  QueryCommand,
  PutItemCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { randomUUID } from "crypto";

const ddb = new DynamoDBClient({});
const TABLE = process.env.TABLE_NAME!;

function userIdFromAuth(event: any): string | undefined {
  return event.requestContext?.authorizer?.claims?.sub;
}

export const handler: APIGatewayProxyHandler = async (event) => {
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
    return { statusCode: 201, body: JSON.stringify({ ok: true, id }) };
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
