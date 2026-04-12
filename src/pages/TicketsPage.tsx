import { useState } from 'react';
import { useApp } from '../hooks/useApp';
import { useLang } from '../hooks/useLang';
import type { Ticket } from '../types';

function randomId() {
  return Math.random().toString(36).slice(2, 10);
}

export function TicketsPage() {
  const { state, addTicket, updateTicket, deleteTicket } = useApp();
  const { t } = useLang();

  const [number, setNumber] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNumber, setEditNumber] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const tickets = state.tickets ?? [];

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!number.trim()) {
      setError(t.tickets.errNumber);
      return;
    }
    const ticket: Ticket = {
      id: randomId(),
      number: number.trim(),
      description: description.trim(),
      createdAt: new Date().toISOString(),
    };
    addTicket(ticket);
    setNumber('');
    setDescription('');
    setError('');
  }

  function startEdit(ticket: Ticket) {
    setEditingId(ticket.id);
    setEditNumber(ticket.number);
    setEditDescription(ticket.description);
  }

  function saveEdit(ticket: Ticket) {
    if (!editNumber.trim()) return;
    updateTicket({ ...ticket, number: editNumber.trim(), description: editDescription.trim() });
    setEditingId(null);
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        <h1 className="text-2xl font-bold">{t.tickets.title}</h1>

        {/* Add ticket form */}
        <form onSubmit={handleAdd} className="bg-gray-800 rounded-xl p-5 space-y-3">
          <div>
            <input
              type="text"
              value={number}
              onChange={e => { setNumber(e.target.value); setError(''); }}
              placeholder={t.tickets.numberPlaceholder}
              className="w-full px-3 py-2 rounded-lg bg-gray-700 text-white placeholder-gray-400 border border-gray-600 focus:outline-none focus:border-gray-400 text-sm"
            />
            {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
          </div>
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder={t.tickets.descriptionPlaceholder}
            className="w-full px-3 py-2 rounded-lg bg-gray-700 text-white placeholder-gray-400 border border-gray-600 focus:outline-none focus:border-gray-400 text-sm"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {t.tickets.add}
          </button>
        </form>

        {/* Ticket list */}
        <div className="space-y-3">
          {tickets.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">{t.tickets.noTickets}</p>
          ) : (
            tickets.map(ticket => {
              if (confirmDeleteId === ticket.id) {
                return (
                  <div key={ticket.id} className="bg-gray-800 rounded-xl p-4 text-sm text-white">
                    <p className="mb-3">{t.tickets.deleteMessage}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { deleteTicket(ticket.id); setConfirmDeleteId(null); }}
                        className="px-3 py-1.5 bg-red-500 hover:bg-red-600 rounded text-xs font-medium"
                      >
                        {t.shared.delete}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs"
                      >
                        {t.shared.cancel}
                      </button>
                    </div>
                  </div>
                );
              }

              if (editingId === ticket.id) {
                return (
                  <div key={ticket.id} className="bg-gray-800 rounded-xl p-4 space-y-3">
                    <input
                      type="text"
                      value={editNumber}
                      onChange={e => setEditNumber(e.target.value)}
                      placeholder={t.tickets.labelNumber}
                      className="w-full px-3 py-2 rounded-lg bg-gray-700 text-white placeholder-gray-400 border border-gray-600 focus:outline-none focus:border-gray-400 text-sm"
                    />
                    <input
                      type="text"
                      value={editDescription}
                      onChange={e => setEditDescription(e.target.value)}
                      placeholder={t.tickets.labelDescription}
                      className="w-full px-3 py-2 rounded-lg bg-gray-700 text-white placeholder-gray-400 border border-gray-600 focus:outline-none focus:border-gray-400 text-sm"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(ticket)}
                        className="px-3 py-1.5 bg-gray-600 hover:bg-gray-500 rounded text-xs text-white font-medium"
                      >
                        {t.tickets.btnSave}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs text-white"
                      >
                        {t.tickets.btnCancel}
                      </button>
                    </div>
                  </div>
                );
              }

              const linkedTaskCount = state.tasks.filter(task => task.ticketId === ticket.id).length;

              return (
                <div key={ticket.id} className="bg-gray-800 rounded-xl p-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-red-400">{ticket.number}</span>
                      {linkedTaskCount > 0 && (
                        <span className="text-xs text-gray-500">{linkedTaskCount} task{linkedTaskCount !== 1 ? 's' : ''}</span>
                      )}
                    </div>
                    {ticket.description && (
                      <p className="text-sm text-gray-300 mt-0.5 truncate">{ticket.description}</p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => startEdit(ticket)}
                      className="p-1.5 text-gray-400 hover:text-white rounded"
                      aria-label="Edit"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(ticket.id)}
                      className="p-1.5 text-gray-400 hover:text-red-400 rounded"
                      aria-label="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
