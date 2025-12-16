import { useState, useEffect } from 'react';
import axios from 'axios';
import { MessageSquare, Send, Trash2, Clock, User } from 'lucide-react';

export default function NotesPanel({ entityType, entityId }) {
    const [notes, setNotes] = useState([]);
    const [newNote, setNewNote] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (entityId) {
            fetchNotes();
        }
    }, [entityType, entityId]);

    const fetchNotes = async () => {
        try {
            const res = await axios.get(`/api/notes/${entityType}/${entityId}`);
            setNotes(res.data);
        } catch (error) {
            console.error('Error fetching notes:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddNote = async (e) => {
        e.preventDefault();
        if (!newNote.trim()) return;

        try {
            const res = await axios.post(`/api/notes/${entityType}/${entityId}`, {
                content: newNote
            });
            setNotes([res.data, ...notes]);
            setNewNote('');
        } catch (error) {
            console.error('Error adding note:', error);
        }
    };

    const handleDeleteNote = async (noteId) => {
        try {
            await axios.delete(`/api/notes/${noteId}`);
            setNotes(notes.filter(n => n.id !== noteId));
        } catch (error) {
            console.error('Error deleting note:', error);
        }
    };

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (!entityId) return null;

    return (
        <div className="notes-panel" style={{
            background: 'var(--card-bg)',
            borderRadius: '12px',
            padding: '1rem',
            marginTop: '1rem'
        }}>
            <h4 style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '1rem',
                color: 'var(--text-color)'
            }}>
                <MessageSquare size={18} />
                Notes ({notes.length})
            </h4>

            {/* Add note form */}
            <form onSubmit={handleAddNote} style={{
                display: 'flex',
                gap: '0.5rem',
                marginBottom: '1rem'
            }}>
                <input
                    type="text"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Ajouter une note..."
                    style={{
                        flex: 1,
                        padding: '0.75rem 1rem',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--input-bg)',
                        color: 'var(--text-color)'
                    }}
                />
                <button
                    type="submit"
                    disabled={!newNote.trim()}
                    style={{
                        padding: '0.75rem 1rem',
                        borderRadius: '8px',
                        border: 'none',
                        background: newNote.trim() ? 'var(--primary-color)' : 'var(--hover-bg)',
                        color: newNote.trim() ? 'white' : 'var(--text-secondary)',
                        cursor: newNote.trim() ? 'pointer' : 'not-allowed',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}
                >
                    <Send size={16} />
                </button>
            </form>

            {/* Notes list */}
            <div style={{
                maxHeight: '250px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
            }}>
                {loading ? (
                    <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem' }}>
                        Chargement...
                    </p>
                ) : notes.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem' }}>
                        Aucune note
                    </p>
                ) : (
                    notes.map(note => (
                        <div
                            key={note.id}
                            style={{
                                background: 'var(--hover-bg)',
                                borderRadius: '8px',
                                padding: '0.75rem 1rem',
                                position: 'relative'
                            }}
                        >
                            <p style={{
                                margin: 0,
                                marginBottom: '0.5rem',
                                color: 'var(--text-color)',
                                wordBreak: 'break-word'
                            }}>
                                {note.content}
                            </p>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                fontSize: '0.75rem',
                                color: 'var(--text-secondary)'
                            }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <User size={12} />
                                    {note.author_name || 'Anonyme'}
                                </span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <Clock size={12} />
                                    {formatDate(note.created_at)}
                                </span>
                            </div>
                            <button
                                onClick={() => handleDeleteNote(note.id)}
                                style={{
                                    position: 'absolute',
                                    top: '0.5rem',
                                    right: '0.5rem',
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    padding: '0.25rem',
                                    borderRadius: '4px',
                                    opacity: 0.5,
                                    transition: 'opacity 0.2s'
                                }}
                                onMouseEnter={(e) => e.target.style.opacity = 1}
                                onMouseLeave={(e) => e.target.style.opacity = 0.5}
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
