import { fetchAuthSession } from 'aws-amplify/auth';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import type { AppState } from '../types';
import { logSync } from './syncLog';

const REGION = 'ap-northeast-1';
const TABLE = 'MyTask';
const SK = 'STATE';

interface SessionData {
  client: DynamoDBDocumentClient;
  identityId: string;
}

async function getSession(forceRefresh = false): Promise<SessionData> {
  const session = await fetchAuthSession({ forceRefresh });
  const { accessKeyId, secretAccessKey, sessionToken } = session.credentials!;
  const identityId = session.identityId!;
  const raw = new DynamoDBClient({
    region: REGION,
    credentials: { accessKeyId, secretAccessKey, sessionToken },
  });
  return { client: DynamoDBDocumentClient.from(raw), identityId };
}

export function isCredentialError(err: unknown): boolean {
  if (!err) return false;
  const name = (err as { name?: string }).name ?? '';
  const msg = String(err);
  return (
    name === 'NotAuthorizedException' ||
    name === 'InvalidSignatureException' ||
    name === 'ExpiredTokenException' ||
    name === 'UnauthorizedException' ||
    msg.includes('expired') ||
    msg.includes('credentials') ||
    msg.includes('Signature')
  );
}

async function attemptWithRetry<T>(fn: (session: SessionData) => Promise<T>): Promise<T> {
  try {
    const session = await getSession();
    return await fn(session);
  } catch (err) {
    if (!isCredentialError(err)) throw err;
    logSync('dynamoSync:credential-error', `retrying with forceRefresh: ${String(err)}`);
    const session = await getSession(true);
    return await fn(session);
  }
}

export interface DynamoLoadResult {
  state: AppState | null;
  identityId: string | null;
}

export async function loadFromDynamo(): Promise<DynamoLoadResult> {
  try {
    return await attemptWithRetry(async ({ client, identityId }) => {
      const res = await client.send(new GetCommand({
        TableName: TABLE,
        Key: { userId: identityId, sk: SK },
      }));
      const state = res.Item?.data
        ? JSON.parse(res.Item.data as string) as AppState
        : null;
      logSync('loadFromDynamo', state
        ? `tasks=${state.tasks.length} sessions=${state.sessions.length} updatedAt=${state.updatedAt ?? 'none'}`
        : 'no data in DynamoDB');
      return { state, identityId };
    });
  } catch (err) {
    console.error('DynamoDB load error:', err);
    logSync('loadFromDynamo:error', String(err));
    return { state: null, identityId: null };
  }
}

export async function saveToDynamo(state: AppState): Promise<void> {
  try {
    await attemptWithRetry(async ({ client, identityId }) => {
      // Guard: refuse to overwrite existing non-empty data with an empty state
      if (state.tasks.length === 0 && state.sessions.length === 0) {
        const existing = await client.send(new GetCommand({
          TableName: TABLE,
          Key: { userId: identityId, sk: SK },
        }));
        if (existing.Item?.data) {
          const existingState = JSON.parse(existing.Item.data as string) as AppState;
          if (existingState.tasks.length > 0 || existingState.sessions.length > 0) {
            logSync('saveToDynamo:blocked', `refused to overwrite dynamo (tasks=${existingState.tasks.length}) with empty state`);
            console.warn('saveToDynamo: blocked empty-state overwrite of existing data');
            return;
          }
        }
      }

      logSync('saveToDynamo', `tasks=${state.tasks.length} sessions=${state.sessions.length} updatedAt=${state.updatedAt ?? 'none'}`);
      await client.send(new PutCommand({
        TableName: TABLE,
        Item: {
          userId: identityId,
          sk: SK,
          data: JSON.stringify(state),
          updatedAt: new Date().toISOString(),
        },
      }));
      logSync('saveToDynamo:success', `tasks=${state.tasks.length} sessions=${state.sessions.length}`);
    });
  } catch (err) {
    console.error('DynamoDB save error:', err);
    logSync('saveToDynamo:error', String(err));
  }
}
