import { useState, useEffect } from 'react';
import axios from 'axios';

import { useLanguage } from '../context/LanguageContext';
import { useGamification } from '../context/GamificationContext';

import { Smartphone, Plus, Search, Edit2, Trash2, Download, Upload, User, Building, Hash, AlertCircle, CheckCircle, XCircle, HelpCircle, X, Clock, History } from 'lucide-react';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';

export default function Phones() {
    const { t, language } = useLanguage();
    const { addXp } = useGamification() || { addXp: () => { } };

    const [phones, setPhones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCondition, setFilterCondition] = useState('ALL');

    // Modals
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editPhone, setEditPhone] = useState(null);
    const [showCSVImport, setShowCSVImport] = useState(false);
    const [phoneHistory, setPhoneHistory] = useState([]);
    const [showHistory, setShowHistory] = useState(false);

    // Toasts & Confirms
    const [confirmModal, setConfirmModal] = useState(null);
    const [toast, setToast] = useState(null);

    const [newPhone, setNewPhone] = useState({
        name: '',
        serial_number: '',
        tlp_id: '',
        assigned_to: '',
        department: '',
        condition: 'Bon',
        notes: ''
    });

    const showToast = (message, type = 'info') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    useEffect(() => {
        fetchPhones();
        fetchPhoneHistory();
    }, []);

    const fetchPhoneHistory = async () => {
        try {
            const { data } = await axios.get('/api/logs');
            const phoneLogs = data.filter(log =>
                log.action?.includes('PHONE') ||
                log.details?.toLowerCase().includes('phone') ||
                log.details?.toLowerCase().includes('téléphone') ||
                log.details?.toLowerCase().includes('tlp')
            ).slice(0, 15);
            setPhoneHistory(phoneLogs);
        } catch (error) {
            console.error('Failed to fetch phone history', error);
        }
    };

    const fetchPhones = async () => {
        try {
            const { data } = await axios.get('/api/phones');
            setPhones(data);
        } catch (error) {
            console.error('Failed to fetch phones', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddPhone = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post('/api/phones', newPhone);
            setPhones([{ ...newPhone, id: res.data.id }, ...phones]);
            setShowAddModal(false);
            setNewPhone({ name: '', serial_number: '', tlp_id: '', assigned_to: '', department: '', condition: 'Bon', notes: '' });
            addXp(10, 'Nouveau téléphone ajouté');
            showToast('Téléphone ajouté avec succès', 'success');
        } catch (error) {
            showToast(error.response?.data?.error || 'Erreur', 'error');
        }
    };

    const handleEditPhone = async (e) => {
        e.preventDefault();
        try {
            await axios.put(`/api/phones/${editPhone.id}`, editPhone);
            setPhones(prev => prev.map(p => p.id === editPhone.id ? editPhone : p));
            setShowEditModal(false);
            setEditPhone(null);
            addXp(5, 'Téléphone modifié');
            showToast('Téléphone modifié', 'success');
        } catch (error) {
            showToast(error.response?.data?.error || 'Erreur', 'error');
        }
    };

    const handleDeletePhone = (phone) => {
        setConfirmModal({
            title: 'Supprimer le téléphone',
            message: `Êtes-vous sûr de vouloir supprimer "${phone.name}"${phone.tlp_id ? ` [${phone.tlp_id}]` : ''} ?`,
            type: 'danger',
            onConfirm: async () => {
                setConfirmModal(null);
                try {
                    await axios.delete(`/api/phones/${phone.id}`);
                    setPhones(prev => prev.filter(p => p.id !== phone.id));
                    addXp(2, 'Téléphone supprimé');
                    showToast('Téléphone supprimé', 'success');
                } catch (error) {
                    showToast(error.response?.data?.error || 'Erreur', 'error');
                }
            }
        });
    };

    const handleExport = async () => {
        try {
            const { data } = await axios.get('/api/phones/export');
            const csv = [
                ['Nom', 'Numéro de série', 'TLP ID', 'Attribué à', 'Service', 'État', 'Notes'].join(';'),
                ...data.map(p => [p.name, p.serial_number, p.tlp_id, p.assigned_to, p.department, p.condition, p.notes].join(';'))
            ].join('\n');

            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `phones_export_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
            URL.revokeObjectURL(url);
            showToast('Export CSV réussi', 'success');
        } catch (error) {
            showToast('Erreur lors de l\'export', 'error');
        }
    };

    const handleCSVImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target.result;
            const lines = text.split('\n').filter(l => l.trim());
            const headers = lines[0].split(/[;,]/);

            const data = lines.slice(1).map(line => {
                const values = line.split(/[;,]/);
                return {
                    name: values[0]?.trim() || '',
                    serial_number: values[1]?.trim() || '',
                    tlp_id: values[2]?.trim() || '',
                    assigned_to: values[3]?.trim() || '',
                    department: values[4]?.trim() || '',
                    condition: values[5]?.trim() || 'Bon',
                    notes: values[6]?.trim() || ''
                };
            }).filter(row => row.name);

            try {
                const res = await axios.post('/api/phones/import', { data });
                showToast(`${res.data.imported} téléphones importés`, 'success');
                fetchPhones();
                setShowCSVImport(false);
            } catch (error) {
                showToast('Erreur lors de l\'import', 'error');
            }
        };
        reader.readAsText(file);
    };

    const getConditionBadge = (condition) => {
        const styles = {
            'Neuf': { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981', icon: <CheckCircle size={12} /> },
            'Bon': { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', icon: <CheckCircle size={12} /> },
            'Usé': { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', icon: <AlertCircle size={12} /> },
            'Hors service': { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', icon: <XCircle size={12} /> }
        };
        const s = styles[condition] || styles['Bon'];
        return (
            <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600,
                background: s.bg, color: s.color
            }}>
                {s.icon} {condition}
            </span>
        );
    };

    const filteredPhones = phones.filter(phone => {
        const matchesSearch = !searchTerm ||
            phone.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            phone.tlp_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            phone.assigned_to?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            phone.serial_number?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filterCondition === 'ALL' ||
            (filterCondition === 'AVAILABLE' ? !phone.assigned_to : phone.condition === filterCondition);
        return matchesSearch && matchesFilter;
    });

    const stats = {
        total: phones.length,
        assigned: phones.filter(p => p.assigned_to).length,
        available: phones.filter(p => !p.assigned_to).length,
        outOfService: phones.filter(p => p.condition === 'Hors service').length
    };

    if (loading) return <div className="loading-spinner">Chargement...</div>;

    return (
        <div className="inventory-page">
            {/* Toast notification */}
            {toast && (
                <div className={`toast toast-${toast.type}`} style={{
                    position: 'fixed', top: '20px', right: '20px', zIndex: 9999,
                    padding: '1rem 1.5rem', borderRadius: '10px',
                    background: toast.type === 'success' ? 'linear-gradient(135deg, #10b981, #059669)' :
                        toast.type === 'error' ? 'linear-gradient(135deg, #ef4444, #dc2626)' :
                            'linear-gradient(135deg, #3b82f6, #2563eb)',
                    color: 'white', fontWeight: 500, boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
                }}>
                    {toast.message}
                </div>
            )}

            {/* Header */}
            <div className="inventory-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
                        <div style={{
                            width: '42px', height: '42px', borderRadius: '12px',
                            background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 0 25px rgba(6, 182, 212, 0.4)'
                        }}>
                            <Smartphone size={24} color="white" />
                        </div>
                        {language === 'fr' ? 'Gestion des Téléphones' : 'Phone Management'}
                    </h1>
                    <p className="subtitle" style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', marginBottom: 0 }}>
                        {language === 'fr' ? 'Gérez le parc téléphonique de votre entreprise' : 'Manage your company\'s phone fleet'}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                    <button
                        onClick={() => setShowCSVImport(true)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.4rem',
                            padding: '0.45rem 0.85rem', borderRadius: '8px',
                            background: 'var(--card-bg)', border: '1px solid var(--border-color)',
                            color: 'var(--text-color)', cursor: 'pointer', fontWeight: 500,
                            fontSize: '0.8rem', transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={e => {
                            e.target.style.borderColor = '#06b6d4';
                            e.target.style.boxShadow = '0 0 15px rgba(6, 182, 212, 0.25)';
                        }}
                        onMouseLeave={e => {
                            e.target.style.borderColor = 'var(--border-color)';
                            e.target.style.boxShadow = 'none';
                        }}
                    >
                        <Upload size={14} /> Import
                    </button>
                    <button
                        onClick={handleExport}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.4rem',
                            padding: '0.45rem 0.85rem', borderRadius: '8px',
                            background: 'var(--card-bg)', border: '1px solid var(--border-color)',
                            color: 'var(--text-color)', cursor: 'pointer', fontWeight: 500,
                            fontSize: '0.8rem', transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={e => {
                            e.target.style.borderColor = '#10b981';
                            e.target.style.boxShadow = '0 0 15px rgba(16, 185, 129, 0.25)';
                        }}
                        onMouseLeave={e => {
                            e.target.style.borderColor = 'var(--border-color)';
                            e.target.style.boxShadow = 'none';
                        }}
                    >
                        <Download size={14} /> Export
                    </button>
                    <button
                        onClick={() => setShowAddModal(true)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.4rem',
                            padding: '0.5rem 1rem', borderRadius: '8px',
                            background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                            border: 'none', color: 'white', cursor: 'pointer', fontWeight: 600,
                            fontSize: '0.8rem', transition: 'all 0.3s ease',
                            boxShadow: '0 3px 12px rgba(6, 182, 212, 0.35)'
                        }}
                        onMouseEnter={e => {
                            e.target.style.transform = 'translateY(-1px)';
                            e.target.style.boxShadow = '0 5px 20px rgba(6, 182, 212, 0.5)';
                        }}
                        onMouseLeave={e => {
                            e.target.style.transform = 'translateY(0)';
                            e.target.style.boxShadow = '0 3px 12px rgba(6, 182, 212, 0.35)';
                        }}
                    >
                        <Plus size={16} strokeWidth={2.5} /> {language === 'fr' ? 'Ajouter' : 'Add'}
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                {[
                    { label: 'Total', value: stats.total, color: '#3b82f6', icon: '📱' },
                    { label: 'Attribués', value: stats.assigned, color: '#10b981', icon: '👤' },
                    { label: 'Disponibles', value: stats.available, color: '#f59e0b', icon: '✓' },
                    { label: 'Hors service', value: stats.outOfService, color: '#ef4444', icon: '⚠️' }
                ].map((stat, i) => (
                    <div key={i} style={{
                        background: 'var(--card-bg)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '12px',
                        padding: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        boxShadow: `0 0 20px ${stat.color}15`,
                        transition: 'all 0.3s ease'
                    }}
                        onMouseEnter={e => {
                            e.currentTarget.style.boxShadow = `0 0 30px ${stat.color}35`;
                            e.currentTarget.style.borderColor = stat.color;
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.boxShadow = `0 0 20px ${stat.color}15`;
                            e.currentTarget.style.borderColor = 'var(--border-color)';
                        }}
                    >
                        <div style={{ fontSize: '1.5rem' }}>{stat.icon}</div>
                        <div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: stat.color }}>{stat.value}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{stat.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Search & Filter */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <div style={{
                    flex: 1, minWidth: '280px', position: 'relative',
                    background: 'var(--card-bg)', borderRadius: '14px',
                    border: '1px solid var(--border-color)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                    transition: 'all 0.3s ease',
                    overflow: 'hidden'
                }}
                    onFocus={e => {
                        e.currentTarget.style.borderColor = '#06b6d4';
                        e.currentTarget.style.boxShadow = '0 0 30px rgba(6, 182, 212, 0.25)';
                    }}
                    onBlur={e => {
                        e.currentTarget.style.borderColor = 'var(--border-color)';
                        e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)';
                    }}
                >
                    <div style={{
                        position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: '32px', height: '32px', borderRadius: '8px',
                        background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.15), rgba(59, 130, 246, 0.15))'
                    }}>
                        <Search size={16} style={{ color: '#06b6d4' }} />
                    </div>
                    <input
                        type="text"
                        placeholder={language === 'fr' ? "🔍 Rechercher par nom, TLP, série, personne..." : "🔍 Search by name, TLP, serial, person..."}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{
                            paddingLeft: '58px', paddingRight: '16px', width: '100%',
                            height: '52px', border: 'none', background: 'transparent',
                            color: 'var(--text-color)', fontSize: '0.95rem',
                            outline: 'none'
                        }}
                    />
                </div>
                <select
                    value={filterCondition}
                    onChange={e => setFilterCondition(e.target.value)}
                    style={{
                        padding: '0 1.25rem', height: '52px', borderRadius: '14px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--card-bg)', color: 'var(--text-color)',
                        fontSize: '0.9rem', fontWeight: 500, cursor: 'pointer',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                        transition: 'all 0.3s ease', minWidth: '160px'
                    }}
                    onMouseEnter={e => {
                        e.target.style.borderColor = '#8b5cf6';
                        e.target.style.boxShadow = '0 0 20px rgba(139, 92, 246, 0.2)';
                    }}
                    onMouseLeave={e => {
                        e.target.style.borderColor = 'var(--border-color)';
                        e.target.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)';
                    }}
                >
                    <option value="ALL">🏷️ Tous les états</option>
                    <option value="AVAILABLE">🟢 Disponible</option>
                    <option value="Neuf">✨ Neuf</option>
                    <option value="Bon">✅ Bon</option>
                    <option value="Usé">⚠️ Usé</option>
                    <option value="Hors service">❌ Hors service</option>
                </select>
            </div>

            {/* Phones Grid */}
            <div className="products-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                {filteredPhones.map(phone => (
                    <div key={phone.id} className="product-card" style={{
                        background: 'var(--card-bg)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '12px',
                        padding: '1.25rem',
                        position: 'relative',
                        transition: 'all 0.2s ease',
                        boxShadow: phone.assigned_to ? '0 0 20px rgba(16, 185, 129, 0.1)' : 'none'
                    }}>
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{
                                    width: '40px', height: '40px', borderRadius: '10px',
                                    background: 'linear-gradient(135deg, var(--primary-color), var(--accent-color))',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <Smartphone size={20} color="white" />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{phone.name}</h3>
                                    {phone.tlp_id && (
                                        <span style={{
                                            fontSize: '0.75rem',
                                            background: 'var(--primary-color)',
                                            color: 'white',
                                            padding: '2px 8px',
                                            borderRadius: '4px',
                                            fontWeight: 600
                                        }}>
                                            {phone.tlp_id}
                                        </span>
                                    )}
                                </div>
                            </div>
                            {getConditionBadge(phone.condition)}
                        </div>

                        {/* Details */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
                            {phone.serial_number && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                                    <Hash size={14} /> {phone.serial_number}
                                </div>
                            )}
                            {phone.assigned_to && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success-color, #10b981)' }}>
                                    <User size={14} /> {phone.assigned_to}
                                </div>
                            )}
                            {phone.department && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                                    <Building size={14} /> {phone.department}
                                </div>
                            )}
                            {!phone.assigned_to && (
                                <div style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                                    Non attribué
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => { setEditPhone(phone); setShowEditModal(true); }}
                                className="icon-btn"
                                style={{ padding: '8px', borderRadius: '8px', background: 'var(--hover-bg)', border: 'none', cursor: 'pointer', color: 'var(--primary-color)' }}
                                title="Modifier"
                            >
                                <Edit2 size={16} />
                            </button>
                            <button
                                onClick={() => handleDeletePhone(phone)}
                                className="icon-btn"
                                style={{ padding: '8px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', border: 'none', cursor: 'pointer', color: '#ef4444' }}
                                title="Supprimer"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}

                {filteredPhones.length === 0 && (
                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                        <Smartphone size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                        <p>{language === 'fr' ? 'Aucun téléphone trouvé' : 'No phones found'}</p>
                    </div>
                )}
            </div>

            {/* History Section */}
            <div style={{
                marginTop: '2rem', padding: '1.25rem', borderRadius: '14px',
                background: 'var(--card-bg)', border: '1px solid var(--border-color)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontSize: '1rem' }}>
                        <History size={18} style={{ color: '#8b5cf6' }} />
                        {language === 'fr' ? 'Historique récent' : 'Recent History'}
                    </h3>
                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        style={{
                            background: 'none', border: 'none', color: 'var(--primary-color)',
                            cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500
                        }}
                    >
                        {showHistory ? '▼ Masquer' : '▶ Afficher'}
                    </button>
                </div>
                {showHistory && (
                    <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                        {phoneHistory.length > 0 ? (
                            phoneHistory.map((log, i) => (
                                <div key={i} style={{
                                    padding: '0.6rem 0.8rem', marginBottom: '0.5rem',
                                    borderRadius: '8px', background: 'var(--hover-bg)',
                                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                                    fontSize: '0.85rem'
                                }}>
                                    <Clock size={14} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                                    <div style={{ flex: 1 }}>
                                        <span style={{ color: 'var(--text-color)' }}>{log.details}</span>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                            {new Date(log.timestamp).toLocaleString('fr-FR')}
                                        </div>
                                    </div>
                                    <span style={{
                                        padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600,
                                        background: log.action?.includes('ADD') ? 'rgba(16, 185, 129, 0.15)' :
                                            log.action?.includes('DELETE') ? 'rgba(239, 68, 68, 0.15)' :
                                                'rgba(59, 130, 246, 0.15)',
                                        color: log.action?.includes('ADD') ? '#10b981' :
                                            log.action?.includes('DELETE') ? '#ef4444' : '#3b82f6'
                                    }}>
                                        {log.action?.includes('ADD') ? '+ Ajout' :
                                            log.action?.includes('DELETE') ? '- Suppr.' : '✎ Modif.'}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                Aucun historique disponible
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Add Phone Modal */}
            <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title={language === 'fr' ? '📱 Ajouter un téléphone' : '📱 Add Phone'} size="lg">
                <form onSubmit={handleAddPhone} id="add-phone-form" className="pro-form">
                    {/* 3 columns layout */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                        <div className="form-group">
                            <label>📱 Nom / Modèle <span className="required">*</span></label>
                            <input
                                required
                                value={newPhone.name}
                                onChange={e => setNewPhone({ ...newPhone, name: e.target.value })}
                                placeholder="Ex: iPhone 14 Pro"
                                autoFocus
                            />
                        </div>
                        <div className="form-group">
                            <label>🔢 Numéro de série</label>
                            <input
                                value={newPhone.serial_number}
                                onChange={e => setNewPhone({ ...newPhone, serial_number: e.target.value })}
                                placeholder="Ex: SN123456789"
                            />
                        </div>
                        <div className="form-group">
                            <label>🏷️ TLP ID</label>
                            <input
                                value={newPhone.tlp_id}
                                onChange={e => setNewPhone({ ...newPhone, tlp_id: e.target.value })}
                                placeholder="Ex: TLP1245"
                            />
                        </div>
                    </div>

                    {/* 3 columns layout for attribution */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginTop: '1rem' }}>
                        <div className="form-group">
                            <label>👤 Attribué à</label>
                            <input
                                value={newPhone.assigned_to}
                                onChange={e => setNewPhone({ ...newPhone, assigned_to: e.target.value })}
                                placeholder="Ex: Jean Dupont"
                            />
                        </div>
                        <div className="form-group">
                            <label>🏢 Service</label>
                            <input
                                value={newPhone.department}
                                onChange={e => setNewPhone({ ...newPhone, department: e.target.value })}
                                placeholder="Ex: Marketing"
                            />
                        </div>
                        <div className="form-group">
                            <label>📊 État</label>
                            <select
                                value={newPhone.condition}
                                onChange={e => setNewPhone({ ...newPhone, condition: e.target.value })}
                            >
                                <option value="Neuf">✨ Neuf</option>
                                <option value="Bon">✅ Bon</option>
                                <option value="Usé">⚠️ Usé</option>
                                <option value="Hors service">❌ Hors service</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-group" style={{ marginTop: '1rem' }}>
                        <label>📝 Notes</label>
                        <textarea
                            value={newPhone.notes}
                            onChange={e => setNewPhone({ ...newPhone, notes: e.target.value })}
                            placeholder="Notes supplémentaires..."
                            rows={2}
                        />
                    </div>
                </form>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                    <button type="button" onClick={() => setShowAddModal(false)} className="cancel-btn">Annuler</button>
                    <button type="submit" form="add-phone-form" className="submit-btn pro-submit">
                        <Plus size={18} /> Ajouter
                    </button>
                </div>
            </Modal>

            {/* Edit Phone Modal */}
            <Modal isOpen={showEditModal} onClose={() => { setShowEditModal(false); setEditPhone(null); }} title={language === 'fr' ? 'Modifier le téléphone' : 'Edit Phone'} size="md">
                {editPhone && (
                    <form onSubmit={handleEditPhone} id="edit-phone-form" className="pro-form">
                        <div className="form-group">
                            <label>Nom / Modèle <span className="required">*</span></label>
                            <input
                                required
                                value={editPhone.name}
                                onChange={e => setEditPhone({ ...editPhone, name: e.target.value })}
                                placeholder="Ex: iPhone 14 Pro"
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Numéro de série</label>
                                <input
                                    value={editPhone.serial_number || ''}
                                    onChange={e => setEditPhone({ ...editPhone, serial_number: e.target.value })}
                                    placeholder="Ex: SN123456789"
                                />
                            </div>
                            <div className="form-group">
                                <label>TLP ID</label>
                                <input
                                    value={editPhone.tlp_id || ''}
                                    onChange={e => setEditPhone({ ...editPhone, tlp_id: e.target.value })}
                                    placeholder="Ex: TLP1245"
                                />
                            </div>
                        </div>

                        <div style={{ borderTop: '1px solid var(--border-color)', margin: '1rem 0', paddingTop: '1rem' }}>
                            <h4 style={{ fontSize: '0.85rem', color: 'var(--primary-color)', marginBottom: '0.75rem' }}>👤 Attribution</h4>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Attribué à (Nom Prénom)</label>
                                    <input
                                        value={editPhone.assigned_to || ''}
                                        onChange={e => setEditPhone({ ...editPhone, assigned_to: e.target.value })}
                                        placeholder="Ex: Jean Dupont"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Service / Département</label>
                                    <input
                                        value={editPhone.department || ''}
                                        onChange={e => setEditPhone({ ...editPhone, department: e.target.value })}
                                        placeholder="Ex: Marketing"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>État</label>
                                <select
                                    value={editPhone.condition || 'Bon'}
                                    onChange={e => setEditPhone({ ...editPhone, condition: e.target.value })}
                                >
                                    <option value="Neuf">✨ Neuf</option>
                                    <option value="Bon">✅ Bon</option>
                                    <option value="Usé">⚠️ Usé</option>
                                    <option value="Hors service">❌ Hors service</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Notes</label>
                            <textarea
                                value={editPhone.notes || ''}
                                onChange={e => setEditPhone({ ...editPhone, notes: e.target.value })}
                                placeholder="Notes supplémentaires..."
                                rows={2}
                            />
                        </div>
                    </form>
                )}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                    <button type="button" onClick={() => { setShowEditModal(false); setEditPhone(null); }} className="cancel-btn">Annuler</button>
                    <button type="submit" form="edit-phone-form" className="submit-btn pro-submit">
                        <Edit2 size={18} /> Enregistrer
                    </button>
                </div>
            </Modal>

            {/* CSV Import Modal */}
            <Modal isOpen={showCSVImport} onClose={() => setShowCSVImport(false)} title="Importer des téléphones" size="sm">
                <div style={{ textAlign: 'center', padding: '1rem' }}>
                    <Upload size={48} style={{ color: 'var(--primary-color)', marginBottom: '1rem' }} />
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                        Format CSV attendu: Nom;Numéro de série;TLP ID;Attribué à;Service;État;Notes
                    </p>
                    <input
                        type="file"
                        accept=".csv"
                        onChange={handleCSVImport}
                        style={{ display: 'none' }}
                        id="csv-import"
                    />
                    <label htmlFor="csv-import" className="primary-btn" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Upload size={16} /> Sélectionner un fichier CSV
                    </label>
                </div>
            </Modal>

            {/* Confirm Modal */}
            {confirmModal && (
                <ConfirmModal
                    isOpen={true}
                    title={confirmModal.title}
                    message={confirmModal.message}
                    type={confirmModal.type}
                    onConfirm={confirmModal.onConfirm}
                    onCancel={() => setConfirmModal(null)}
                />
            )}
        </div>
    );
}
