import { fetchAuthSession } from 'aws-amplify/auth';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { logSync } from './syncLog';

const REGION = 'ap-northeast-1';

export interface SessionData {
  client: DynamoDBDocumentClient;
  identityId: string;
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

export async function getSession(forceRefresh = false): Promise<SessionData> {
  const session = await fetchAuthSession({ forceRefresh });
  const { accessKeyId, secretAccessKey, sessionToken } = session.credentials!;
  const identityId = session.identityId!;
  const raw = new DynamoDBClient({
    region: REGION,
    credentials: { accessKeyId, secretAccessKey, sessionToken },
  });
  return { client: DynamoDBDocumentClient.from(raw), identityId };
}

export async function attemptWithRetry<T>(fn: (session: SessionData) => Promise<T>): Promise<T> {
  try {
    const session = await getSession();
    return await fn(session);
  } catch (err) {
    if (!isCredentialError(err)) throw err;
    logSync('dynamoClient:credential-error', `retrying with forceRefresh: ${String(err)}`);
    const session = await getSession(true);
    return await fn(session);
  }
}
