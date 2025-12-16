import { useState, useRef, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Search, X, Package, Users, FileText, Clock } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useGamification } from '../context/GamificationContext';
import { hasPermission } from '../utils/permissions';
import Sidebar from './Sidebar';
import Screensaver from './Screensaver';

export default function Layout() {
    const { t } = useLanguage();
    const { unlockEasterEgg } = useGamification() || { unlockEasterEgg: () => { } };
    const { user, refreshUser } = useAuth();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState(null);
    const [prtHistory, setPrtHistory] = useState(null);
    const [showSearch, setShowSearch] = useState(false);
    // Easter Egg State
    const [showEasterEggModal, setShowEasterEggModal] = useState(false);
    const searchRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (searchRef.current && !searchRef.current.contains(e.target)) {
                setShowSearch(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSearch = async (query) => {
        setSearchQuery(query);
        setPrtHistory(null);

        if (query.trim() === '3150') {
            // Secret code handling is done in handleKeyDown or runEasterEgg
        }

        if (query.length < 2) {
            setSearchResults(null);
            return;
        }

        const prtMatch = query.match(/^PRT\d+$/i);
        if (prtMatch) {
            try {
                const { data } = await axios.get(`/api/search/prt/${query.toUpperCase()}`);
                setPrtHistory(data);
                setSearchResults(null);
            } catch (error) {
                console.error('PRT search failed', error);
            }
            return;
        }

        try {
            const { data } = await axios.get(`/api/search?q=${encodeURIComponent(query)}`);
            setSearchResults(data);
        } catch (error) {
            console.error('Search failed', error);
        }
    };

    const clearSearch = () => {
        setSearchQuery('');
        setSearchResults(null);
        setPrtHistory(null);
        setShowSearch(false);
    };

    const runEasterEgg = async () => {
        // Unlock on server and locally
        try {
            await unlockEasterEgg();
        } catch (e) { console.error(e); }

        localStorage.setItem('team3150Unlocked', 'true');
        localStorage.setItem('theme', 'neon');
        document.documentElement.setAttribute('data-theme', 'neon');

        // Dispatch events
        window.dispatchEvent(new Event('team3150-unlocked'));
        window.dispatchEvent(new Event('storage'));

        // Refresh user to update access to Achievements tab
        await refreshUser();

        // Dispatch events
        window.dispatchEvent(new Event('team3150-unlocked'));
        window.dispatchEvent(new Event('storage'));

        // Force reload to ensure everything is synced (Database to Frontend)
        window.location.reload();
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            if (searchQuery.trim() === '3150') {
                runEasterEgg();
                clearSearch();
                return;
            }

            const prtMatch = searchQuery.match(/^PRT\d+$/i);
            if (prtMatch) {
                navigate(`/prt-history/${searchQuery.toUpperCase()}`);
                clearSearch();
            }
        }
    };

    return (
        <div className="dashboard-layout">
            <Sidebar />
            <main className="main-content">
                {/* Global Search Bar - Restricted */}
                {hasPermission(user, 'inventory_view') && (
                    <div className="global-header">
                        <div className="global-search" ref={searchRef}>
                            <Search size={18} className="search-icon" />
                            <input
                                type="text"
                                placeholder={t('searchGlobal') || 'Rechercher (ex: PRT3150, produit...)'}
                                value={searchQuery}
                                onChange={(e) => handleSearch(e.target.value)}
                                onKeyDown={handleKeyDown}
                                onFocus={() => setShowSearch(true)}
                            />
                            {searchQuery && (
                                <button className="clear-search" onClick={clearSearch}>
                                    <X size={16} />
                                </button>
                            )}

                            {/* Search Results Dropdown */}
                            {showSearch && (searchResults || prtHistory) && (
                                <div className="search-dropdown">
                                    {/* ... (dropdown content same as before) ... */}
                                    {/* PRT History Results */}
                                    {prtHistory && (
                                        <div className="search-section prt-section">
                                            <div
                                                className="search-section-header prt-header clickable"
                                                onClick={() => { navigate(`/prt-history/${searchQuery.toUpperCase()}`); clearSearch(); }}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                <Clock size={14} /> Historique {searchQuery.toUpperCase()} - Cliquer pour voir tout
                                            </div>
                                            {prtHistory.length > 0 ? (
                                                prtHistory.slice(0, 3).map(l => (
                                                    <div
                                                        key={l.id}
                                                        className="search-item prt-item"
                                                        onClick={() => { navigate(`/prt-history/${searchQuery.toUpperCase()}`); clearSearch(); }}
                                                        style={{ cursor: 'pointer' }}
                                                    >
                                                        <span className="search-item-title">{l.details}</span>
                                                        <span className="search-item-meta">
                                                            {l.username} • {new Date(l.timestamp).toLocaleDateString('fr-FR')}
                                                        </span>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="search-empty">
                                                    {t('noPrtHistory') || 'No history found for this PRT'}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Normal search results from searchResults state */}
                                    {searchResults?.products?.length > 0 && (
                                        <div className="search-section">
                                            <div className="search-section-header">
                                                <Package size={14} /> {t('inventory') || 'Products'}
                                            </div>
                                            {searchResults.products.map(p => (
                                                <div
                                                    key={`p-${p.id}`}
                                                    className="search-item"
                                                    onClick={() => { navigate('/inventory'); clearSearch(); }}
                                                >
                                                    <span className="search-item-title">{p.name}</span>
                                                    <span className="search-item-meta">{p.category_name} • Qty: {p.quantity}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {searchResults?.employees?.length > 0 && (
                                        <div className="search-section">
                                            <div className="search-section-header">
                                                <Users size={14} /> {t('employeesManagement') || 'Employees'}
                                            </div>
                                            {searchResults.employees.map(e => (
                                                <div
                                                    key={`e-${e.id}`}
                                                    className="search-item"
                                                    onClick={() => { navigate('/settings'); clearSearch(); }}
                                                >
                                                    <span className="search-item-title">{e.name}</span>
                                                    <span className="search-item-meta">{e.department || e.email || '-'}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {searchResults?.logs?.length > 0 && (
                                        <div className="search-section">
                                            <div className="search-section-header">
                                                <FileText size={14} /> {t('history') || 'Logs'}
                                            </div>
                                            {searchResults.logs.map(l => (
                                                <div
                                                    key={`l-${l.id}`}
                                                    className="search-item"
                                                    onClick={() => { navigate('/history'); clearSearch(); }}
                                                >
                                                    <span className="search-item-title">{l.details}</span>
                                                    <span className="search-item-meta">{l.username}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {searchResults && (!searchResults.products?.length && !searchResults.employees?.length && !searchResults.logs?.length) && (
                                        <div className="search-empty">
                                            {t('noResults') || 'No results found'}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <Outlet />
            </main>

            {/* ULTIMATE TEAM 3150 POPUP - Premium Design */}
            {showEasterEggModal && (
                <div className="easter-popup-overlay" onClick={() => setShowEasterEggModal(false)}>
                    <div className="easter-popup-card" onClick={(e) => e.stopPropagation()}>
                        <button className="easter-close" onClick={() => setShowEasterEggModal(false)}>
                            <X size={20} />
                        </button>

                        <div className="easter-badge">🎮 SECRET UNLOCKED</div>

                        <h1 className="easter-title">TEAM 3150</h1>
                        <p className="easter-subtitle">Bienvenue dans le mode élite</p>

                        <div className="easter-rewards">
                            <div className="easter-reward">
                                <div className="reward-emoji">🎨</div>
                                <span>Thème Neon</span>
                            </div>
                            <div className="easter-reward">
                                <div className="reward-emoji">💻</div>
                                <span>Terminal</span>
                            </div>
                            <div className="easter-reward">
                                <div className="reward-emoji">⚡</div>
                                <span>God Mode</span>
                            </div>
                        </div>

                        <button className="easter-continue" onClick={() => setShowEasterEggModal(false)}>
                            Continuer →
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
