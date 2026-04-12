import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadFromDynamo, saveToDynamo, isCredentialError, loadArchiveYear } from './dynamoSync';
import type { AppState } from '../types';

// Mock modules
vi.mock('./syncLog', () => ({ logSync: vi.fn() }));

const mockSend = vi.fn();

vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: vi.fn(() => ({ send: mockSend })),
  },
  // Use regular functions (not arrow functions) so `new Command(...)` works
  GetCommand: vi.fn(function (this: Record<string, unknown>, input: unknown) {
    this.input = input;
  }),
  PutCommand: vi.fn(function (this: Record<string, unknown>, input: unknown) {
    this.input = input;
  }),
}));

vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn(function () {}),
}));

const mockFetchAuthSession = vi.fn();
vi.mock('aws-amplify/auth', () => ({
  fetchAuthSession: (...args: unknown[]) => mockFetchAuthSession(...args),
}));

function makeSession() {
  return {
    credentials: {
      accessKeyId: 'key',
      secretAccessKey: 'secret',
      sessionToken: 'token',
    },
    identityId: 'user-123',
  };
}

function makeState(taskCount = 2): AppState {
  return {
    tasks: Array.from({ length: taskCount }, (_, i) => ({
      id: `task-${i}`,
      title: `Task ${i}`,
      estimatedPomodoros: 1,
      completedPomodoros: 0,
      date: '2026-01-01',
      completed: false,
      createdAt: '2026-01-01T00:00:00.000Z',
    })),
    sessions: [],
    interruptions: [],
    tickets: [],
    settings: {
      focusDuration: 25,
      shortBreakDuration: 5,
      longBreakDuration: 15,
      longBreakInterval: 4,
      autoStartBreaks: false,
      autoStartPomodoros: false,
      soundEnabled: true,
    },
    selectedDate: '2026-01-01',
    updatedAt: '2026-01-01T10:00:00.000Z',
  };
}

function makeCredentialError(name: string) {
  const err = new Error(`${name}: token expired`);
  err.name = name;
  return err;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFetchAuthSession.mockResolvedValue(makeSession());
});

// ─── isCredentialError ────────────────────────────────────────────────────────

describe('isCredentialError', () => {
  it('returns true for NotAuthorizedException', () => {
    expect(isCredentialError(makeCredentialError('NotAuthorizedException'))).toBe(true);
  });

  it('returns true for InvalidSignatureException', () => {
    expect(isCredentialError(makeCredentialError('InvalidSignatureException'))).toBe(true);
  });

  it('returns true for ExpiredTokenException', () => {
    expect(isCredentialError(makeCredentialError('ExpiredTokenException'))).toBe(true);
  });

  it('returns false for NetworkError', () => {
    const err = new Error('NetworkError: A network error has occurred');
    err.name = 'NetworkError';
    expect(isCredentialError(err)).toBe(false);
  });

  it('returns false for null/undefined', () => {
    expect(isCredentialError(null)).toBe(false);
    expect(isCredentialError(undefined)).toBe(false);
  });
});

// ─── loadFromDynamo ───────────────────────────────────────────────────────────

describe('loadFromDynamo', () => {
  it('returns state and identityId on success', async () => {
    const state = makeState(3);
    mockSend.mockResolvedValueOnce({ Item: { data: JSON.stringify(state) } });

    const result = await loadFromDynamo();

    expect(result.identityId).toBe('user-123');
    expect(result.state?.tasks).toHaveLength(3);
  });

  it('returns null state when DynamoDB item has no data', async () => {
    mockSend.mockResolvedValueOnce({ Item: undefined });

    const result = await loadFromDynamo();

    expect(result.state).toBeNull();
    expect(result.identityId).toBe('user-123');
  });

  it('retries with forceRefresh on credential error and succeeds', async () => {
    const state = makeState(2);
    // First getSession → credential error; second getSession (forceRefresh) → success
    mockFetchAuthSession
      .mockRejectedValueOnce(makeCredentialError('NotAuthorizedException'))
      .mockResolvedValueOnce(makeSession());
    mockSend.mockResolvedValueOnce({ Item: { data: JSON.stringify(state) } });

    const result = await loadFromDynamo();

    expect(mockFetchAuthSession).toHaveBeenCalledTimes(2);
    expect(mockFetchAuthSession).toHaveBeenLastCalledWith({ forceRefresh: true });
    expect(result.state?.tasks).toHaveLength(2);
  });

  it('returns null/null if retry also fails', async () => {
    mockFetchAuthSession
      .mockRejectedValueOnce(makeCredentialError('NotAuthorizedException'))
      .mockRejectedValueOnce(makeCredentialError('NotAuthorizedException'));

    const result = await loadFromDynamo();

    expect(result.state).toBeNull();
    expect(result.identityId).toBeNull();
  });

  it('does not retry on non-credential errors', async () => {
    const networkErr = new Error('NetworkError: A network error has occurred');
    networkErr.name = 'NetworkError';
    mockFetchAuthSession.mockRejectedValueOnce(networkErr);

    const result = await loadFromDynamo();

    expect(mockFetchAuthSession).toHaveBeenCalledTimes(1);
    expect(result.state).toBeNull();
    expect(result.identityId).toBeNull();
  });
});

// ─── saveToDynamo ─────────────────────────────────────────────────────────────

describe('saveToDynamo', () => {
  it('saves state to DynamoDB successfully', async () => {
    const state = makeState(2);
    mockSend.mockResolvedValueOnce({});

    await saveToDynamo(state);

    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('retries with forceRefresh on credential error and succeeds', async () => {
    const state = makeState(2);
    mockFetchAuthSession
      .mockRejectedValueOnce(makeCredentialError('InvalidSignatureException'))
      .mockResolvedValueOnce(makeSession());
    mockSend.mockResolvedValueOnce({});

    await saveToDynamo(state);

    expect(mockFetchAuthSession).toHaveBeenCalledTimes(2);
    expect(mockFetchAuthSession).toHaveBeenLastCalledWith({ forceRefresh: true });
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('does not retry on non-credential errors', async () => {
    const state = makeState(2);
    const networkErr = new Error('NetworkError: A network error has occurred');
    networkErr.name = 'NetworkError';
    mockFetchAuthSession.mockRejectedValueOnce(networkErr);

    await saveToDynamo(state); // should not throw

    expect(mockFetchAuthSession).toHaveBeenCalledTimes(1);
  });

  it('blocks empty-state overwrite when DynamoDB has existing data', async () => {
    const existingState = makeState(3);
    const emptyState = makeState(0);
    // GetCommand returns existing non-empty data
    mockSend.mockResolvedValueOnce({ Item: { data: JSON.stringify(existingState) } });

    await saveToDynamo(emptyState);

    // Only 1 send call (the guard GetCommand), PutCommand NOT called
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('writes archive item and trimmed STATE when state contains old tasks', async () => {
    // Tasks dated 2024-01-01 are well before any 6-month cutoff from 2026
    const state: AppState = {
      ...makeState(0),
      tasks: [
        {
          id: 'old-task-1',
          title: 'Old Task',
          estimatedPomodoros: 1,
          completedPomodoros: 1,
          date: '2024-01-15',
          completed: true,
          createdAt: '2024-01-15T09:00:00.000Z',
        },
      ],
      sessions: [
        {
          id: 'old-session-1',
          taskId: 'old-task-1',
          date: '2024-01-15',
          startTime: '2024-01-15T09:00:00.000Z',
          duration: 25,
          type: 'focus',
          completed: true,
        },
      ],
    };
    // Two PutCommand calls expected: ARCHIVE#2024 + STATE
    mockSend.mockResolvedValue({});

    await saveToDynamo(state);

    expect(mockSend).toHaveBeenCalledTimes(2);

    // First call: archive write
    const archiveCall = mockSend.mock.calls[0][0];
    expect(archiveCall.input.Item.sk).toBe('ARCHIVE#2024');
    const archiveData = JSON.parse(archiveCall.input.Item.data);
    expect(archiveData.tasks).toHaveLength(1);
    expect(archiveData.sessions).toHaveLength(1);

    // Second call: STATE write with trimmed (empty recent) data
    const stateCall = mockSend.mock.calls[1][0];
    expect(stateCall.input.Item.sk).toBe('STATE');
    const savedState = JSON.parse(stateCall.input.Item.data);
    expect(savedState.tasks).toHaveLength(0);
    expect(savedState.sessions).toHaveLength(0);
  });

  it('writes only STATE (no archive) when all tasks are recent', async () => {
    // makeState uses date '2026-01-01' which is within 6 months of 2026-04-12
    const state = makeState(2);
    mockSend.mockResolvedValue({});

    await saveToDynamo(state);

    expect(mockSend).toHaveBeenCalledTimes(1);
    const stateCall = mockSend.mock.calls[0][0];
    expect(stateCall.input.Item.sk).toBe('STATE');
  });
});

// ─── loadArchiveYear ──────────────────────────────────────────────────────────

describe('loadArchiveYear', () => {
  it('returns parsed archive data when item exists', async () => {
    const archiveData = {
      tasks: [{ id: 't1', date: '2024-03-01' }],
      sessions: [{ id: 's1', date: '2024-03-01' }],
      interruptions: [],
    };
    mockSend.mockResolvedValueOnce({ Item: { data: JSON.stringify(archiveData) } });

    const result = await loadArchiveYear('2024');

    expect(result).not.toBeNull();
    expect(result?.tasks).toHaveLength(1);
    expect(result?.sessions).toHaveLength(1);
    // Verify correct sk was used
    const getCall = mockSend.mock.calls[0][0];
    expect(getCall.input.Key.sk).toBe('ARCHIVE#2024');
  });

  it('returns null when no archive item exists', async () => {
    mockSend.mockResolvedValueOnce({ Item: undefined });

    const result = await loadArchiveYear('2023');

    expect(result).toBeNull();
  });

  it('returns null on DynamoDB error', async () => {
    mockFetchAuthSession.mockRejectedValueOnce(new Error('Network failure'));

    const result = await loadArchiveYear('2022');

    expect(result).toBeNull();
  });
});
