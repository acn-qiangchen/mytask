import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import type { AppState } from '../types';
import { logSync } from './syncLog';
import { attemptWithRetry } from './dynamoClient';

export { isCredentialError } from './dynamoClient';

const TABLE = 'MyTask';
const SK = 'STATE';

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
