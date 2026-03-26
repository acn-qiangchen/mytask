import { useState } from 'react';
import { readSyncLog, clearSyncLog } from '../utils/syncLog';

export function DebugPage() {
  const [entries, setEntries] = useState(() => readSyncLog().reverse());

  function handleClear() {
    clearSyncLog();
    setEntries([]);
  }

  function handleRefresh() {
    setEntries(readSyncLog().reverse());
  }

  return (
    <div style={{ fontFamily: 'monospace', padding: '16px', fontSize: '12px' }}>
      <h2 style={{ marginBottom: '8px' }}>Sync Debug Log</h2>
      <div style={{ marginBottom: '12px', display: 'flex', gap: '8px' }}>
        <button onClick={handleRefresh} style={{ padding: '4px 10px', cursor: 'pointer' }}>Refresh</button>
        <button onClick={handleClear} style={{ padding: '4px 10px', cursor: 'pointer', color: 'red' }}>Clear log</button>
        <span style={{ color: '#666' }}>{entries.length} entries (newest first)</span>
      </div>
      {entries.length === 0 ? (
        <p style={{ color: '#999' }}>No log entries yet. Interact with the app to generate events.</p>
      ) : (
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr style={{ background: '#f0f0f0' }}>
              <th style={{ textAlign: 'left', padding: '4px 8px', borderBottom: '1px solid #ccc' }}>Timestamp</th>
              <th style={{ textAlign: 'left', padding: '4px 8px', borderBottom: '1px solid #ccc' }}>Event</th>
              <th style={{ textAlign: 'left', padding: '4px 8px', borderBottom: '1px solid #ccc' }}>Detail</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e, i) => (
              <tr key={i} style={{ background: e.event.includes('error') || e.event.includes('blocked') ? '#fff0f0' : i % 2 === 0 ? '#fff' : '#fafafa' }}>
                <td style={{ padding: '3px 8px', borderBottom: '1px solid #eee', whiteSpace: 'nowrap' }}>{e.ts}</td>
                <td style={{ padding: '3px 8px', borderBottom: '1px solid #eee', whiteSpace: 'nowrap', fontWeight: e.event.includes('error') || e.event.includes('blocked') ? 'bold' : 'normal', color: e.event.includes('error') || e.event.includes('blocked') ? 'red' : 'inherit' }}>{e.event}</td>
                <td style={{ padding: '3px 8px', borderBottom: '1px solid #eee', color: '#555' }}>{e.detail ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
