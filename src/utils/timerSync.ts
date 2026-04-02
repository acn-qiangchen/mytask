import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { logSync } from './syncLog';
import { attemptWithRetry } from './dynamoClient';

const TABLE = 'MyTask';
const TIMER_SK = 'TIMER_STATE';

export interface TimerSyncState {
  isRunning: boolean;
  mode: 'focus' | 'short_break' | 'long_break';
  /** Absolute UTC ms when the current session ends; null when paused/stopped. */
  endTime: number | null;
  activeTaskId: string | null;
  sessionCount: number;
  /** ISO timestamp — used for last-writer-wins conflict resolution. */
  updatedAt: string;
}

export async function loadTimerState(): Promise<TimerSyncState | null> {
  try {
    return await attemptWithRetry(async ({ client, identityId }) => {
      const res = await client.send(new GetCommand({
        TableName: TABLE,
        Key: { userId: identityId, sk: TIMER_SK },
      }));
      const state = res.Item?.data
        ? JSON.parse(res.Item.data as string) as TimerSyncState
        : null;
      logSync('loadTimerState', state
        ? `running=${state.isRunning} mode=${state.mode} updatedAt=${state.updatedAt}`
        : 'no timer state in DynamoDB');
      return state;
    });
  } catch (err) {
    console.error('DynamoDB loadTimerState error:', err);
    logSync('loadTimerState:error', String(err));
    return null;
  }
}

export async function saveTimerState(state: TimerSyncState): Promise<void> {
  try {
    await attemptWithRetry(async ({ client, identityId }) => {
      logSync('saveTimerState', `running=${state.isRunning} mode=${state.mode} updatedAt=${state.updatedAt}`);
      await client.send(new PutCommand({
        TableName: TABLE,
        Item: {
          userId: identityId,
          sk: TIMER_SK,
          data: JSON.stringify(state),
          updatedAt: state.updatedAt,
        },
      }));
      logSync('saveTimerState:success', `running=${state.isRunning} mode=${state.mode}`);
    });
  } catch (err) {
    console.error('DynamoDB saveTimerState error:', err);
    logSync('saveTimerState:error', String(err));
  }
}
