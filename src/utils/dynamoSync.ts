import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import type { AppState } from '../types';
import type { ArchiveData } from './archiveUtils';
import { logSync } from './syncLog';
import { attemptWithRetry } from './dynamoClient';
import { getCutoffDate, partitionByDate, groupByYear } from './archiveUtils';

export { isCredentialError } from './dynamoClient';
export type { ArchiveData };

const TABLE = 'MyTask';
const SK_STATE = 'STATE';

export interface DynamoLoadResult {
  state: AppState | null;
  identityId: string | null;
}

export async function loadFromDynamo(): Promise<DynamoLoadResult> {
  try {
    return await attemptWithRetry(async ({ client, identityId }) => {
      const res = await client.send(new GetCommand({
        TableName: TABLE,
        Key: { userId: identityId, sk: SK_STATE },
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

/** Loads a yearly archive item (SK="ARCHIVE#<year>"). Returns null if none exists. */
export async function loadArchiveYear(year: string): Promise<ArchiveData | null> {
  try {
    return await attemptWithRetry(async ({ client, identityId }) => {
      const res = await client.send(new GetCommand({
        TableName: TABLE,
        Key: { userId: identityId, sk: `ARCHIVE#${year}` },
      }));
      if (!res.Item?.data) return null;
      logSync('loadArchiveYear', `year=${year}`);
      return JSON.parse(res.Item.data as string) as ArchiveData;
    });
  } catch (err) {
    console.error('DynamoDB archive load error:', err);
    logSync('loadArchiveYear:error', String(err));
    return null;
  }
}

export async function saveToDynamo(state: AppState): Promise<void> {
  try {
    await attemptWithRetry(async ({ client, identityId }) => {
      // Guard: refuse to overwrite existing non-empty data with an empty state
      if (state.tasks.length === 0 && state.sessions.length === 0) {
        const existing = await client.send(new GetCommand({
          TableName: TABLE,
          Key: { userId: identityId, sk: SK_STATE },
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

      // Partition items older than 6 months into yearly archive items.
      // Pruning happens here (after mergeStates has already been applied in AppContext).
      const cutoff = getCutoffDate();
      const { recent: recentTasks, old: oldTasks } = partitionByDate(state.tasks, cutoff);
      const { recent: recentSessions, old: oldSessions } = partitionByDate(state.sessions, cutoff);
      const { recent: recentInterruptions, old: oldInterruptions } = partitionByDate(
        state.interruptions ?? [],
        cutoff
      );

      const hasOldData =
        oldTasks.length > 0 || oldSessions.length > 0 || oldInterruptions.length > 0;

      if (hasOldData) {
        const tasksByYear = groupByYear(oldTasks);
        const sessionsByYear = groupByYear(oldSessions);
        const interruptionsByYear = groupByYear(oldInterruptions);
        const allYears = new Set([
          ...Object.keys(tasksByYear),
          ...Object.keys(sessionsByYear),
          ...Object.keys(interruptionsByYear),
        ]);

        for (const year of allYears) {
          const archiveData: ArchiveData = {
            tasks: tasksByYear[year] ?? [],
            sessions: sessionsByYear[year] ?? [],
            interruptions: interruptionsByYear[year] ?? [],
          };
          logSync(
            'saveToDynamo:archive',
            `year=${year} tasks=${archiveData.tasks.length} sessions=${archiveData.sessions.length} interruptions=${archiveData.interruptions.length}`
          );
          await client.send(new PutCommand({
            TableName: TABLE,
            Item: {
              userId: identityId,
              sk: `ARCHIVE#${year}`,
              data: JSON.stringify(archiveData),
              updatedAt: new Date().toISOString(),
            },
          }));
        }
      }

      // Write the trimmed (recent-only) state to SK="STATE"
      const trimmedState: AppState = {
        ...state,
        tasks: recentTasks,
        sessions: recentSessions,
        interruptions: recentInterruptions,
      };

      logSync('saveToDynamo', `tasks=${trimmedState.tasks.length} sessions=${trimmedState.sessions.length} updatedAt=${trimmedState.updatedAt ?? 'none'}`);
      await client.send(new PutCommand({
        TableName: TABLE,
        Item: {
          userId: identityId,
          sk: SK_STATE,
          data: JSON.stringify(trimmedState),
          updatedAt: new Date().toISOString(),
        },
      }));
      logSync('saveToDynamo:success', `tasks=${trimmedState.tasks.length} sessions=${trimmedState.sessions.length}`);
    });
  } catch (err) {
    console.error('DynamoDB save error:', err);
    logSync('saveToDynamo:error', String(err));
  }
}
