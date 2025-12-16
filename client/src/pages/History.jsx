import { useState, useEffect } from 'react';
import axios from 'axios';
import { Clock, Search, Filter, Plus, Minus, Box, AlertCircle, ArrowUp, ArrowDown } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import TutorialButton from '../components/TutorialButton';

export default function History() {
    const { t } = useLanguage();
    const [logs, setLogs] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('ALL');

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        try {
            const { data } = await axios.get('/api/logs');
            setLogs(data);
        } catch (error) {
            console.error("Failed to fetch logs", error);
        }
    };

    const getActionIcon = (action) => {
        if (action.includes('ADD_PRODUCT')) return <Box size={18} />;
        if (action.includes('UPDATE_STOCK')) {
            return <ArrowUp size={18} />;
        }
        return <AlertCircle size={18} />;
    };

    const getActionColorClass = (action) => {
        if (action === 'ADD_PRODUCT') return 'bg-green';
        if (action === 'UPDATE_STOCK') return 'bg-blue';
        return 'bg-gray';
    };

    const filteredLogs = logs.filter(log => {
        const matchesSearch = log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.username.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = filterType === 'ALL' || log.action === filterType;
        return matchesSearch && matchesType;
    });

    return (
        <div className="page-container">
            <TutorialButton tutorialKey="history" />

            <div className="history-header page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <h1 className="page-title">{t('activityTimeline')}</h1>
                </div>

                <div className="history-controls">
                    <div className="search-bar compact">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder={t('searchLogs')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="filter-tabs">
                <button
                    className={`filter-tab ${filterType === 'ALL' ? 'active' : ''}`}
                    onClick={() => setFilterType('ALL')}
                >
                    {t('allActivity')}
                </button>
                <button
                    className={`filter-tab ${filterType === 'ADD_PRODUCT' ? 'active' : ''}`}
                    onClick={() => setFilterType('ADD_PRODUCT')}
                >
                    <Box size={14} /> {t('newItems')}
                </button>
                <button
                    className={`filter-tab ${filterType === 'UPDATE_STOCK' ? 'active' : ''}`}
                    onClick={() => setFilterType('UPDATE_STOCK')}
                >
                    <ArrowUp size={14} /> {t('stockUpdates')}
                </button>
            </div>

            <div className="timeline-container">
                {filteredLogs.map((log, index) => (
                    <div key={log.id} className="timeline-item">
                        <div className={`timeline-icon ${getActionColorClass(log.action)}`}>
                            {getActionIcon(log.action)}
                        </div>
                        <div className="timeline-content card">
                            <div className="timeline-header">
                                <span className="username">{log.username}</span>
                                <span className="time">
                                    <Clock size={14} />
                                    {new Date(log.timestamp).toLocaleString()}
                                </span>
                            </div>
                            <div className="timeline-body">
                                <p className="details">{log.details}</p>
                                <span className="action-tag">{log.action.replace('_', ' ')}</span>
                            </div>
                        </div>
                        {index < filteredLogs.length - 1 && <div className="timeline-connector"></div>}
                    </div>
                ))}

                {filteredLogs.length === 0 && (
                    <div className="empty-state">{t('noHistoryFound')}</div>
                )}
            </div>
        </div>
    );
}
