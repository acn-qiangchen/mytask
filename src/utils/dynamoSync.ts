import { fetchAuthSession } from 'aws-amplify/auth';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import type { AppState } from '../types';

const REGION = 'ap-northeast-1';
const TABLE = 'MyTask';
const SK = 'STATE';

interface SessionData {
  client: DynamoDBDocumentClient;
  identityId: string;
}

async function getSession(): Promise<SessionData> {
  const session = await fetchAuthSession();
  const { accessKeyId, secretAccessKey, sessionToken } = session.credentials!;
  const identityId = session.identityId!;
  const raw = new DynamoDBClient({
    region: REGION,
    credentials: { accessKeyId, secretAccessKey, sessionToken },
  });
  return { client: DynamoDBDocumentClient.from(raw), identityId };
}

export interface DynamoLoadResult {
  state: AppState | null;
  identityId: string | null;
}

export async function loadFromDynamo(): Promise<DynamoLoadResult> {
  try {
    const { client, identityId } = await getSession();
    const res = await client.send(new GetCommand({
      TableName: TABLE,
      Key: { userId: identityId, sk: SK },
    }));
    const state = res.Item?.data
      ? JSON.parse(res.Item.data as string) as AppState
      : null;
    return { state, identityId };
  } catch (err) {
    console.error('DynamoDB load error:', err);
    return { state: null, identityId: null };
  }
}

export async function saveToDynamo(state: AppState): Promise<void> {
  try {
    const { client, identityId } = await getSession();
    await client.send(new PutCommand({
      TableName: TABLE,
      Item: {
        userId: identityId,
        sk: SK,
        data: JSON.stringify(state),
        updatedAt: new Date().toISOString(),
      },
    }));
  } catch (err) {
    console.error('DynamoDB save error:', err);
  }
}
