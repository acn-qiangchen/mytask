import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadTimerState, saveTimerState } from './timerSync';
import type { TimerSyncState } from './timerSync';

vi.mock('./syncLog', () => ({ logSync: vi.fn() }));

const mockSend = vi.fn();

vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: vi.fn(() => ({ send: mockSend })),
  },
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

function makeTimerState(overrides?: Partial<TimerSyncState>): TimerSyncState {
  return {
    isRunning: true,
    mode: 'focus',
    endTime: Date.now() + 1_200_000, // 20 min from now
    activeTaskId: 'task-abc',
    sessionCount: 2,
    updatedAt: '2026-01-01T10:00:00.000Z',
    ...overrides,
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

// ─── loadTimerState ───────────────────────────────────────────────────────────

describe('loadTimerState', () => {
  it('returns parsed state on success', async () => {
    const state = makeTimerState();
    mockSend.mockResolvedValueOnce({ Item: { data: JSON.stringify(state) } });

    const result = await loadTimerState();

    expect(result).not.toBeNull();
    expect(result?.isRunning).toBe(true);
    expect(result?.mode).toBe('focus');
    expect(result?.activeTaskId).toBe('task-abc');
    expect(result?.sessionCount).toBe(2);
    expect(result?.updatedAt).toBe('2026-01-01T10:00:00.000Z');
  });

  it('returns null when no item in DynamoDB', async () => {
    mockSend.mockResolvedValueOnce({ Item: undefined });

    const result = await loadTimerState();

    expect(result).toBeNull();
  });

  it('returns null when item exists but has no data field', async () => {
    mockSend.mockResolvedValueOnce({ Item: {} });

    const result = await loadTimerState();

    expect(result).toBeNull();
  });

  it('retries with forceRefresh on credential error and succeeds', async () => {
    const state = makeTimerState();
    mockFetchAuthSession
      .mockRejectedValueOnce(makeCredentialError('NotAuthorizedException'))
      .mockResolvedValueOnce(makeSession());
    mockSend.mockResolvedValueOnce({ Item: { data: JSON.stringify(state) } });

    const result = await loadTimerState();

    expect(mockFetchAuthSession).toHaveBeenCalledTimes(2);
    expect(mockFetchAuthSession).toHaveBeenLastCalledWith({ forceRefresh: true });
    expect(result?.mode).toBe('focus');
  });

  it('returns null if retry also fails', async () => {
    mockFetchAuthSession
      .mockRejectedValueOnce(makeCredentialError('ExpiredTokenException'))
      .mockRejectedValueOnce(makeCredentialError('ExpiredTokenException'));

    const result = await loadTimerState();

    expect(result).toBeNull();
  });

  it('returns null on non-credential error without retrying', async () => {
    const networkErr = new Error('NetworkError: A network error has occurred');
    networkErr.name = 'NetworkError';
    mockFetchAuthSession.mockRejectedValueOnce(networkErr);

    const result = await loadTimerState();

    expect(mockFetchAuthSession).toHaveBeenCalledTimes(1);
    expect(result).toBeNull();
  });
});

// ─── saveTimerState ───────────────────────────────────────────────────────────

describe('saveTimerState', () => {
  it('calls PutCommand with sk = TIMER_STATE', async () => {
    const { PutCommand } = await import('@aws-sdk/lib-dynamodb');
    const state = makeTimerState();
    mockSend.mockResolvedValueOnce({});

    await saveTimerState(state);

    expect(PutCommand).toHaveBeenCalledTimes(1);
    const [callArg] = (PutCommand as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(callArg.Item.sk).toBe('TIMER_STATE');
  });

  it('writes data as JSON string of state', async () => {
    const { PutCommand } = await import('@aws-sdk/lib-dynamodb');
    const state = makeTimerState();
    mockSend.mockResolvedValueOnce({});

    await saveTimerState(state);

    const [callArg] = (PutCommand as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(callArg.Item.data).toBe(JSON.stringify(state));
  });

  it('sets updatedAt on DynamoDB item from state.updatedAt', async () => {
    const { PutCommand } = await import('@aws-sdk/lib-dynamodb');
    const state = makeTimerState({ updatedAt: '2026-03-15T08:00:00.000Z' });
    mockSend.mockResolvedValueOnce({});

    await saveTimerState(state);

    const [callArg] = (PutCommand as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(callArg.Item.updatedAt).toBe('2026-03-15T08:00:00.000Z');
  });

  it('does NOT perform a guard read — only one send call (PutCommand)', async () => {
    const state = makeTimerState();
    mockSend.mockResolvedValueOnce({});

    await saveTimerState(state);

    // Unlike saveToDynamo, there is no GetCommand guard before the PutCommand
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('retries with forceRefresh on credential error', async () => {
    const state = makeTimerState();
    mockFetchAuthSession
      .mockRejectedValueOnce(makeCredentialError('InvalidSignatureException'))
      .mockResolvedValueOnce(makeSession());
    mockSend.mockResolvedValueOnce({});

    await saveTimerState(state);

    expect(mockFetchAuthSession).toHaveBeenCalledTimes(2);
    expect(mockFetchAuthSession).toHaveBeenLastCalledWith({ forceRefresh: true });
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('does not throw on non-credential errors', async () => {
    const state = makeTimerState();
    const networkErr = new Error('NetworkError: A network error has occurred');
    networkErr.name = 'NetworkError';
    mockFetchAuthSession.mockRejectedValueOnce(networkErr);

    await expect(saveTimerState(state)).resolves.toBeUndefined();
    expect(mockFetchAuthSession).toHaveBeenCalledTimes(1);
  });
});
