import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Clock, ArrowLeft, Search, Package, User, Calendar, TrendingUp, TrendingDown, Plus, Minus } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function PrtHistory() {
    const { prt } = useParams();
    const navigate = useNavigate();
    const { t, language } = useLanguage();
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchPrt, setSearchPrt] = useState(prt || '');

    useEffect(() => {
        if (prt) {
            setSearchPrt(prt);
            fetchHistory(prt);
        } else {
            setLoading(false);
        }
    }, [prt]);

    const fetchHistory = async (prtNumber) => {
        setLoading(true);
        try {
            const { data } = await axios.get(`/api/search/prt/${prtNumber}`);
            setHistory(data);
        } catch (error) {
            console.error('Failed to fetch PRT history', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchPrt.trim()) {
            navigate(`/prt-history/${searchPrt.toUpperCase()}`);
        }
    };

    const getActionIcon = (action, quantityChange) => {
        if (action === 'ADD_PRODUCT' || quantityChange > 0) {
            return <Plus size={16} />;
        }
        if (action === 'REMOVE_STOCK' || quantityChange < 0) {
            return <Minus size={16} />;
        }
        return <TrendingUp size={16} />;
    };

    const getActionClass = (action, quantityChange) => {
        if (action === 'ADD_PRODUCT' || action === 'ADD_STOCK' || quantityChange > 0) {
            return 'action-add';
        }
        if (action === 'REMOVE_STOCK' || quantityChange < 0) {
            return 'action-remove';
        }
        return 'action-update';
    };

    const formatDate = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    const formatTime = (timestamp) => {
        return new Date(timestamp).toLocaleTimeString(language === 'fr' ? 'fr-FR' : 'en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Group history by date
    const groupedHistory = history.reduce((groups, item) => {
        const date = new Date(item.timestamp).toDateString();
        if (!groups[date]) {
            groups[date] = [];
        }
        groups[date].push(item);
        return groups;
    }, {});

    return (
        <div className="prt-history-page">
            <div className="page-header">
                <div>
                    <button className="back-btn" onClick={() => navigate(-1)}>
                        <ArrowLeft size={18} />
                        {t('back') || 'Retour'}
                    </button>
                    <h1 className="page-title"><Clock size={28} /> {t('activityTimeline')}</h1>
                    <p className="page-subtitle">
                        {prt ? `${t('fullHistoryFor')} ${prt}` : t('searchPRTorUser')}
                    </p>
                </div>
            </div>

            {/* Search Bar */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <form onSubmit={handleSearch} className="prt-search-form">
                    <div className="search-input-wrapper">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder={t('enterPRT')}
                            value={searchPrt}
                            onChange={(e) => setSearchPrt(e.target.value.toUpperCase())}
                        />
                    </div>
                    <button type="submit" className="add-btn">
                        {t('search')}
                    </button>
                </form>
            </div>

            {/* Stats */}
            {prt && !loading && (
                <div className="stats-row" style={{ marginBottom: '1.5rem' }}>
                    <div className="stat-card gradient-purple">
                        <div className="stat-icon"><Clock size={24} /></div>
                        <div className="stat-info">
                            <span className="stat-value">{history.length}</span>
                            <span className="stat-label">{t('events')}</span>
                        </div>
                    </div>
                    <div className="stat-card gradient-green">
                        <div className="stat-icon"><TrendingUp size={24} /></div>
                        <div className="stat-info">
                            <span className="stat-value">
                                +{history.filter(h => h.quantity_change > 0).reduce((sum, h) => sum + h.quantity_change, 0)}
                            </span>
                            <span className="stat-label">{t('entries')}</span>
                        </div>
                    </div>
                    <div className="stat-card gradient-red">
                        <div className="stat-icon"><TrendingDown size={24} /></div>
                        <div className="stat-info">
                            <span className="stat-value">
                                {history.filter(h => h.quantity_change < 0).reduce((sum, h) => sum + h.quantity_change, 0)}
                            </span>
                            <span className="stat-label">{t('exits')}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Timeline */}
            <div className="card">
                <h2><Clock size={20} /> {t('timeline')}</h2>

                {loading ? (
                    <div className="timeline-loading">{t('loading')}</div>
                ) : history.length === 0 ? (
                    <div className="timeline-empty">
                        {prt ? `${t('noHistoryFor')} ${prt}` : t('searchPRTorUser')}
                    </div>
                ) : (
                    <div className="activity-timeline">
                        {Object.entries(groupedHistory).map(([dateKey, items]) => (
                            <div key={dateKey} className="timeline-day">
                                <div className="timeline-date">
                                    <Calendar size={14} />
                                    {formatDate(items[0].timestamp)}
                                </div>
                                <div className="timeline-events">
                                    {items.map(item => (
                                        <div key={item.id} className={`timeline-event ${getActionClass(item.action, item.quantity_change)}`}>
                                            <div className="event-icon">
                                                {getActionIcon(item.action, item.quantity_change)}
                                            </div>
                                            <div className="event-content">
                                                <div className="event-header">
                                                    <span className="event-time">{formatTime(item.timestamp)}</span>
                                                    <span className={`event-badge ${item.action}`}>{item.action}</span>
                                                    {item.quantity_change && (
                                                        <span className={`event-quantity ${item.quantity_change > 0 ? 'positive' : 'negative'}`}>
                                                            {item.quantity_change > 0 ? '+' : ''}{item.quantity_change}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="event-details">{item.details}</div>
                                                <div className="event-user">
                                                    <User size={12} />
                                                    {item.username}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
