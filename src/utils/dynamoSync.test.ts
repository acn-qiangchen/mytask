import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadFromDynamo, saveToDynamo, isCredentialError } from './dynamoSync';
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
});
