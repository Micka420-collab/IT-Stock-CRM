import { useState, useEffect } from 'react';
import axios from 'axios';
import { Line, Bar, Doughnut, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement } from 'chart.js';
import {
    Package, AlertTriangle, Layers, TrendingUp, TrendingDown, Clock, ArrowRight, Plus,
    Settings, LayoutGrid, List, Filter, Calendar, Save, RotateCcw, Eye, Laptop, Users, FileText,
    PieChart, BarChart, Smartphone
} from 'lucide-react';
import { Link } from 'react-router-dom';
import TutorialButton from '../components/TutorialButton';
import DashboardCharts from '../components/DashboardCharts';
import PhoneStatsCharts from '../components/PhoneStatsCharts';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import TerminalWidget from '../components/TerminalWidget';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement);

// Available widget types
// Widget types moved inside component for translation access

export default function Dashboard() {
    const { theme } = useTheme();
    const { t, language } = useLanguage();
    const { user } = useAuth();

    // View Mode: 'classic' | 'analytics'
    const [viewMode, setViewMode] = useState('classic');
    const [dashboardStats, setDashboardStats] = useState(null);
    const [loadingStats, setLoadingStats] = useState(false);

    // Check for Easter Egg unlock
    const [team3150Unlocked, setTeam3150Unlocked] = useState(false);

    // Toast notification state
    const [toast, setToast] = useState(null);

    useEffect(() => {
        if (localStorage.getItem('team3150Unlocked') === 'true') {
            setTeam3150Unlocked(true);
        }
    }, []);

    // Fetch Analytics Data if view changes
    useEffect(() => {
        if (viewMode === 'loan_stats' && !dashboardStats) {
            setLoadingStats(true);
            axios.get('/api/stats/dashboard')
                .then(res => setDashboardStats(res.data))
                .catch(e => console.error("Stats Error", e))
                .finally(() => setLoadingStats(false));
        }
        if (viewMode === 'phone_stats' && !dashboardStats) {
            setLoadingStats(true);
            axios.get('/api/stats/phones')
                .then(res => setDashboardStats(res.data))
                .catch(e => console.error("Phone Stats Error", e))
                .finally(() => setLoadingStats(false));
        }
    }, [viewMode]);

    const WIDGET_TYPES = {
        STAT_TOTAL: { id: 'stat_total', name: t('totalItems'), icon: Package, size: 'small' },
        STAT_LOW: { id: 'stat_low', name: t('lowStockAlerts'), icon: AlertTriangle, size: 'small' },
        STAT_CATEGORIES: { id: 'stat_categories', name: t('categories'), icon: Layers, size: 'small' },
        STAT_LOAN_PCS: { id: 'stat_loan_pcs', name: t('loanPC'), icon: Laptop, size: 'small' },
        STAT_PHONES: { id: 'stat_phones', name: t('phones') || 'Téléphonie', icon: Smartphone, size: 'small' },
        ...(team3150Unlocked ? {
            WIDGET_TEAM3150: { id: 'widget_team3150', name: 'Team 3150', icon: Users, size: 'large' },
            WIDGET_TERMINAL: { id: 'widget_terminal', name: 'Terminal', icon: Settings, size: 'large' }
        } : {}),
        CHART_BAR: { id: 'chart_bar', name: t('stockByCategory'), icon: LayoutGrid, size: 'medium' },
        CHART_PIE: { id: 'chart_pie', name: t('distribution'), icon: LayoutGrid, size: 'medium' },
        CHART_LINE: { id: 'chart_line', name: t('stockEvolution'), icon: TrendingUp, size: 'large' },
        CHART_TOP: { id: 'chart_top', name: t('topProducts'), icon: TrendingDown, size: 'medium' },
        TABLE_RECENT: { id: 'table_recent', name: t('recentActivity'), icon: Clock, size: 'large' },
        TABLE_LOW_STOCK: { id: 'table_low_stock', name: t('lowStockItems'), icon: AlertTriangle, size: 'medium' },
        KPI_TODAY: { id: 'kpi_today', name: t('todayActivity'), icon: Calendar, size: 'small' },
    };

    const VIEW_PRESETS = {
        default: { name: t('defaultView'), widgets: ['stat_total', 'stat_low', 'stat_categories', 'chart_line', 'chart_bar', 'chart_pie', 'table_recent'] },
        admin: { name: t('adminView'), widgets: ['stat_total', 'stat_low', 'stat_categories', 'stat_loan_pcs', 'stat_phones', 'chart_line', 'chart_bar', 'chart_top', 'table_recent', 'table_low_stock'] },
        stock: { name: t('stockView'), widgets: ['stat_total', 'stat_low', 'chart_bar', 'chart_pie', 'table_low_stock'] },
        activity: { name: t('activityView'), widgets: ['kpi_today', 'chart_line', 'chart_top', 'table_recent'] }
    };

    // Dashboard state
    const [activeWidgets, setActiveWidgets] = useState(['stat_total', 'stat_low', 'stat_categories', 'chart_line', 'chart_bar', 'chart_pie', 'table_recent']);
    const [currentView, setCurrentView] = useState('default');
    const [showConfig, setShowConfig] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    // Filter state
    const [filters, setFilters] = useState({
        dateFrom: '',
        dateTo: '',
        category: '',
        status: 'all'
    });

    // Data state
    const [stats, setStats] = useState({
        totalStock: 0,
        lowStock: 0,
        categories: 0,
        categoryData: [],
        recentLogs: [],
        evolution: [],
        topProducts: [],
        lowStockItems: [],
        todayActivity: 0,
        loanPcStats: { total: 0, available: 0, loaned: 0 },
        phoneStats: { total: 0, available: 0, assigned: 0 }
    });
    const [categories, setCategories] = useState([]);

    useEffect(() => {
        fetchAllData();
    }, []);

    // Listen for Easter Egg unlock event (Real-time update)
    useEffect(() => {
        const handleUnlock = () => {
            setTeam3150Unlocked(true);
            setActiveWidgets(prev => {
                const newWidgets = [...prev];
                if (!newWidgets.includes('widget_team3150')) newWidgets.unshift('widget_team3150');
                if (!newWidgets.includes('widget_terminal')) newWidgets.unshift('widget_terminal');
                return newWidgets;
            });
        };
        window.addEventListener('team3150-unlocked', handleUnlock);
        return () => window.removeEventListener('team3150-unlocked', handleUnlock);
    }, []);

    // Load saved layout when User is available
    useEffect(() => {
        if (!user) return; // Wait for user to be loaded

        const savedLayout = localStorage.getItem(`dashboard_layout_${user.id}`);
        if (savedLayout) {
            try {
                const parsed = JSON.parse(savedLayout);
                let savedWidgets = parsed.widgets || activeWidgets;

                // Auto-add Team 3150 widgets if unlocked and not present
                const isUnlocked = user?.team3150_unlocked === 1 || user?.team3150_unlocked === true;
                if (isUnlocked) {
                    if (!savedWidgets.includes('widget_team3150')) savedWidgets = ['widget_team3150', ...savedWidgets];
                    if (!savedWidgets.includes('widget_terminal')) savedWidgets = ['widget_terminal', ...savedWidgets];
                }

                setActiveWidgets(savedWidgets);
                setCurrentView(parsed.view || 'default');
            } catch (e) { console.error("Failed to parse layout", e); }
        } else {
            // First load or no saved layout
            const isUnlocked = user?.team3150_unlocked === 1 || user?.team3150_unlocked === true;
            if (isUnlocked) {
                setActiveWidgets(prev => {
                    // dedupe check
                    const base = prev.filter(w => w !== 'widget_terminal' && w !== 'widget_team3150');
                    return ['widget_terminal', 'widget_team3150', ...base];
                });
            }
        }
    }, [user]);

    const fetchAllData = async () => {
        try {
            const [prodRes, catRes, logRes, evolutionRes, topRes, loanRes, phonesRes] = await Promise.all([
                axios.get('/api/products'),
                axios.get('/api/categories'),
                axios.get('/api/logs'),
                axios.get('/api/stats/evolution').catch(() => ({ data: [] })),
                axios.get('/api/stats/top-products').catch(() => ({ data: [] })),
                axios.get('/api/loan-pcs/stats').catch(() => ({ data: { total: 0, available: 0, loaned: 0 } })),
                axios.get('/api/phones').catch(() => ({ data: [] }))
            ]);

            const products = prodRes.data;
            const cats = catRes.data;
            const logs = logRes.data;
            setCategories(cats);

            const totalStock = products.reduce((sum, p) => sum + p.quantity, 0);
            const lowStockItems = products.filter(p => p.quantity < p.min_quantity);
            const lowStock = lowStockItems.length;

            const categoryData = cats.map(cat => ({
                name: cat.name,
                count: products.filter(p => p.category_id === cat.id).reduce((sum, p) => sum + p.quantity, 0)
            })).filter(c => c.count > 0);

            // Today's activity
            const today = new Date().toISOString().split('T')[0];
            const todayActivity = logs.filter(l => l.timestamp?.startsWith(today)).length;

            setStats({
                totalStock,
                lowStock,
                categories: cats.length,
                categoryData,
                recentLogs: logs.slice(0, 10),
                evolution: evolutionRes.data,
                topProducts: topRes.data,
                lowStockItems,
                todayActivity,
                loanPcStats: loanRes.data,
                phoneStats: {
                    total: phonesRes.data.length,
                    available: phonesRes.data.filter(p => !p.assigned_to).length,
                    assigned: phonesRes.data.filter(p => p.assigned_to).length
                }
            });
        } catch (error) {
            console.error("Error fetching stats", error);
        }
    };

    const switchView = (viewKey) => {
        const preset = VIEW_PRESETS[viewKey];
        if (preset) {
            setActiveWidgets(preset.widgets);
            setCurrentView(viewKey);
        }
    };

    const toggleWidget = (widgetId) => {
        setActiveWidgets(prev =>
            prev.includes(widgetId)
                ? prev.filter(w => w !== widgetId)
                : [...prev, widgetId]
        );
    };

    const saveLayout = () => {
        localStorage.setItem(`dashboard_layout_${user?.id}`, JSON.stringify({
            widgets: activeWidgets,
            view: 'custom'
        }));
        setToast({ message: t('layoutSaved') || 'Configuration sauvegardée !', type: 'success' });
        setTimeout(() => setToast(null), 3000);
    };

    const resetLayout = () => {
        switchView('default');
        localStorage.removeItem(`dashboard_layout_${user?.id}`);
    };

    // Chart colors
    const chartColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#6366f1'];
    const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim() || '#1a1a1a';
    const textSecondary = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim() || '#64748b';

    // Chart data configurations
    const barData = {
        labels: stats.categoryData.map(c => c.name),
        datasets: [{
            data: stats.categoryData.map(c => c.count),
            backgroundColor: chartColors,
            borderWidth: 0,
            borderRadius: 4,
        }],
    };

    const pieData = {
        labels: stats.categoryData.map(c => c.name),
        datasets: [{
            data: stats.categoryData.map(c => c.count),
            backgroundColor: chartColors,
            borderWidth: 0,
        }],
    };

    const evolutionData = {
        labels: stats.evolution.map(e => new Date(e.date).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { day: '2-digit', month: '2-digit' })),
        datasets: [{
            label: 'Variations Stock',
            data: stats.evolution.map(e => e.change),
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            fill: true,
            tension: 0.3,
            pointRadius: 4,
            pointBackgroundColor: '#3b82f6',
        }]
    };

    const chartOptions = {
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            x: { grid: { display: false }, ticks: { color: textSecondary } },
            y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: textSecondary } }
        }
    };

    // Widget render functions
    const renderWidget = (widgetId) => {
        switch (widgetId) {
            case 'stat_total':
                return (
                    <div className="stat-card gradient-blue widget-stat">
                        <div className="stat-icon"><Package size={24} /></div>
                        <div className="stat-info">
                            <span className="stat-value">{stats.totalStock}</span>
                            <span className="stat-label">{t('totalItems')}</span>
                        </div>
                    </div>
                );
            case 'stat_low':
                return (
                    <div className="stat-card gradient-red widget-stat">
                        <div className="stat-icon"><AlertTriangle size={24} /></div>
                        <div className="stat-info">
                            <span className="stat-value">{stats.lowStock}</span>
                            <span className="stat-label">{t('lowStockAlerts')}</span>
                        </div>
                    </div>
                );
            case 'stat_categories':
                return (
                    <div className="stat-card gradient-green widget-stat">
                        <div className="stat-icon"><Layers size={24} /></div>
                        <div className="stat-info">
                            <span className="stat-value">{stats.categories}</span>
                            <span className="stat-label">{t('categories')}</span>
                        </div>
                    </div>
                );
            case 'stat_loan_pcs':
                return (
                    <div className="stat-card gradient-orange widget-stat">
                        <div className="stat-icon"><Laptop size={24} /></div>
                        <div className="stat-info">
                            <span className="stat-value">{stats.loanPcStats.loaned}/{stats.loanPcStats.total}</span>
                            <span className="stat-label">{t('loanedPC')}</span>
                        </div>
                    </div>
                );
            case 'stat_phones':
                return (
                    <div className="stat-card gradient-cyan widget-stat">
                        <div className="stat-icon"><Smartphone size={24} /></div>
                        <div className="stat-info">
                            {/* Display Available / Total */}
                            <span className="stat-value">{stats.phoneStats?.available}/{stats.phoneStats?.total}</span>
                            <span className="stat-label">{t('phones') || 'Téléphonie'}</span>
                        </div>
                    </div>
                );
            case 'kpi_today':
                return (
                    <div className="stat-card gradient-purple widget-stat">
                        <div className="stat-icon"><Calendar size={24} /></div>
                        <div className="stat-info">
                            <span className="stat-value">{stats.todayActivity}</span>
                            <span className="stat-label">{t('todayActivity')}</span>
                        </div>
                    </div>
                );
            case 'chart_bar':
                return (
                    <div className="chart-card widget-medium">
                        <h3>{t('stockByCategory')}</h3>
                        <div style={{ height: '250px' }}>
                            <Bar data={barData} options={{ ...chartOptions, indexAxis: 'y' }} />
                        </div>
                    </div>
                );
            case 'chart_pie':
                return (
                    <div className="chart-card widget-medium">
                        <h3>{t('distribution')}</h3>
                        <div style={{ height: '250px', display: 'flex', justifyContent: 'center' }}>
                            <Doughnut data={pieData} options={{ maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'right', labels: { boxWidth: 12, usePointStyle: true } } } }} />
                        </div>
                    </div>
                );
            case 'chart_line':
                return (
                    <div className="chart-card widget-large">
                        <h3><TrendingUp size={18} /> {t('stockEvolution')} (30 {t('days')})</h3>
                        <div style={{ height: '250px' }}>
                            {stats.evolution.length > 0 ? (
                                <Line data={evolutionData} options={chartOptions} />
                            ) : (
                                <p className="no-activity">{t('noData')}</p>
                            )}
                        </div>
                    </div>
                );
            case 'chart_top':
                return (
                    <div className="chart-card widget-medium">
                        <h3><TrendingDown size={18} /> {t('topProducts')}</h3>
                        <div className="top-products-list">
                            {stats.topProducts.slice(0, 5).map((item, idx) => (
                                <div key={idx} className="top-product-item">
                                    <span className="rank">#{idx + 1}</span>
                                    <span className="product-name">{item.details?.split(':')[0] || 'Unknown'}</span>
                                    <span className="product-count">{item.count}x</span>
                                </div>
                            ))}
                            {stats.topProducts.length === 0 && <p className="no-activity">{t('noData')}</p>}
                        </div>
                    </div>
                );
            case 'table_recent':
                return (
                    <div className="recent-activity-card widget-large">
                        <div className="card-header-row">
                            <h3><Clock size={18} /> {t('recentActivity')}</h3>
                            <Link to="/history" className="view-all-link">{t('viewAll')} <ArrowRight size={16} /></Link>
                        </div>
                        <div className="activity-list">
                            {stats.recentLogs.slice(0, 5).map(log => (
                                <div key={log.id} className="activity-item">
                                    <div className={`activity-icon ${log.action === 'ADD_PRODUCT' ? 'green' : 'blue'}`}>
                                        {log.action === 'ADD_PRODUCT' ? <Plus size={14} /> : <TrendingUp size={14} />}
                                    </div>
                                    <div className="activity-content">
                                        <span className="activity-user">{log.username}</span>
                                        <span className="activity-details">{log.details}</span>
                                    </div>
                                    <span className="activity-time">{new Date(log.timestamp).toLocaleTimeString(language === 'fr' ? 'fr-FR' : 'en-US')}</span>
                                </div>
                            ))}
                            {stats.recentLogs.length === 0 && <p className="no-activity">{t('noRecentActivity')}</p>}
                        </div>
                    </div>
                );
            case 'table_low_stock':
                return (
                    <div className="chart-card widget-medium">
                        <h3><AlertTriangle size={18} /> {t('lowStockItems')}</h3>
                        <div className="table-container" style={{ maxHeight: '200px', overflow: 'auto' }}>
                            <table className="data-table mini-table">
                                <thead>
                                    <tr><th>{t('product')}</th><th>{t('stock')}</th><th>{t('min')}</th></tr>
                                </thead>
                                <tbody>
                                    {stats.lowStockItems.slice(0, 5).map(item => (
                                        <tr key={item.id}>
                                            <td>{item.name}</td>
                                            <td className="negative">{item.quantity}</td>
                                            <td>{item.min_quantity}</td>
                                        </tr>
                                    ))}
                                    {stats.lowStockItems.length === 0 && (
                                        <tr><td colSpan="3" style={{ textAlign: 'center' }}>{t('none')}</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            case 'widget_terminal':
                return (
                    <div
                        className="terminal-skin"
                        style={{
                            height: '320px',
                            width: '100%',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            border: '1px solid rgba(0, 255, 157, 0.3)',
                            boxShadow: '0 4px 20px rgba(0, 255, 157, 0.1)'
                        }}
                    >
                        <TerminalWidget />
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="dashboard-page modular-dashboard">
            <TutorialButton
                tutorialKey="dashboard"
                onBeforeStart={() => {
                    // Reset to default view for tutorial
                    switchView('default');
                    setViewMode('classic');
                    setShowConfig(false);
                    setShowFilters(false);
                }}
            />
            {/* Header with controls */}
            <div className="dashboard-header">
                <div>
                    <h1 className="page-title">{t('dashboardTitle')}</h1>
                    <p className="page-subtitle">{t('dashboardSubtitle')}</p>
                </div>
                <div className="dashboard-controls">
                    <div className="view-switcher">
                        <button
                            className={`view-btn btn-glow ${viewMode === 'loan_stats' ? 'active' : ''}`}
                            style={{
                                boxShadow: '0 0 15px rgba(59, 130, 246, 0.5)', // Base glow
                                border: '1px solid rgba(59, 130, 246, 0.3)',
                            }}
                            onClick={() => setViewMode(viewMode === 'loan_stats' ? 'classic' : 'loan_stats')}
                            title="Voir les statistiques détaillées des prêts"
                        >
                            {viewMode === 'loan_stats' ? <LayoutGrid size={14} /> : <PieChart size={14} />}
                            {viewMode === 'loan_stats' ? 'Retour Vue Classique' : 'Statistiques Prêts'}
                        </button>
                        <button
                            className={`view-btn btn-glow ${viewMode === 'phone_stats' ? 'active' : ''}`}
                            style={{
                                boxShadow: '0 0 15px rgba(6, 182, 212, 0.5)', // Cyan glow
                                border: '1px solid rgba(6, 182, 212, 0.3)',
                                marginLeft: '0.5rem'
                            }}
                            onClick={() => {
                                if (viewMode === 'phone_stats') {
                                    setViewMode('classic');
                                    setDashboardStats(null);
                                } else {
                                    setViewMode('phone_stats');
                                    setDashboardStats(null); // Reset to force fetch new type
                                }
                            }}
                            title="Voir les statistiques détaillées de la téléphonie"
                        >
                            {viewMode === 'phone_stats' ? <LayoutGrid size={14} /> : <Smartphone size={14} />}
                            {viewMode === 'phone_stats' ? 'Retour Vue Classique' : 'Stats Téléphonie'}
                        </button>

                        <div className="divider-vertical" style={{ width: 1, height: 20, background: 'var(--border-color)', margin: '0 0.5rem' }}></div>

                        {Object.entries(VIEW_PRESETS).map(([key, preset]) => (
                            <button
                                key={key}
                                className={`view-btn btn-glow ${currentView === key && viewMode === 'classic' ? 'active' : ''}`}
                                onClick={() => { switchView(key); setViewMode('classic'); }}
                            >
                                <Eye size={14} />
                                {preset.name}
                            </button>
                        ))}
                    </div>
                    <button className="icon-btn-lg btn-glow" onClick={() => setShowFilters(!showFilters)} title="Filtres">
                        <Filter size={18} />
                    </button>
                    <button className="icon-btn-lg btn-glow" onClick={() => setShowConfig(!showConfig)} title="Configurer">
                        <Settings size={18} />
                    </button>
                    <button className="icon-btn-lg success btn-glow" onClick={saveLayout} title="Sauvegarder">
                        <Save size={18} />
                    </button>
                    <button className="icon-btn-lg btn-glow" onClick={resetLayout} title="Réinitialiser">
                        <RotateCcw size={18} />
                    </button>
                </div>
            </div>

            {/* Filters Panel */}
            {showFilters && (
                <div className="filters-panel">
                    <div className="filter-group">
                        <label>{t('from')}</label>
                        <input type="date" value={filters.dateFrom} onChange={e => setFilters({ ...filters, dateFrom: e.target.value })} />
                    </div>
                    <div className="filter-group">
                        <label>{t('to')}</label>
                        <input type="date" value={filters.dateTo} onChange={e => setFilters({ ...filters, dateTo: e.target.value })} />
                    </div>
                    <div className="filter-group">
                        <label>{t('category')}</label>
                        <select value={filters.category} onChange={e => setFilters({ ...filters, category: e.target.value })}>
                            <option value="">{t('allCategory') || 'Toutes'}</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div className="filter-group">
                        <label>{t('status')}</label>
                        <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}>
                            <option value="all">{t('all')}</option>
                            <option value="low">{t('lowStock')}</option>
                            <option value="normal">{t('normalStock')}</option>
                        </select>
                    </div>
                    <button className="add-btn small" onClick={fetchAllData}>
                        {t('apply')}
                    </button>
                </div>
            )}

            {/* Widget Config Panel */}
            {showConfig && (
                <div className="config-panel">
                    <h4><LayoutGrid size={16} /> {t('availableWidgets')}</h4>
                    <div className="widget-toggles">
                        {Object.values(WIDGET_TYPES).map(widget => (
                            <label key={widget.id} className="widget-toggle">
                                <input
                                    type="checkbox"
                                    checked={activeWidgets.includes(widget.id)}
                                    onChange={() => toggleWidget(widget.id)}
                                />
                                <widget.icon size={14} />
                                <span>{widget.name}</span>
                            </label>
                        ))}
                    </div>
                </div>
            )}

            {/* Analytics View */}
            {viewMode === 'loan_stats' && (
                <div className="analytics-view-wrapper fade-in">
                    <DashboardCharts stats={dashboardStats} loading={loadingStats} />
                </div>
            )}

            {/* Phone Stats View */}
            {viewMode === 'phone_stats' && (
                <div className="analytics-view-wrapper fade-in">
                    <PhoneStatsCharts stats={dashboardStats} loading={loadingStats} />
                </div>
            )}

            {/* Widget Grid */}
            {viewMode === 'classic' && (
                <div className="widget-grid">
                    {/* Special Widget: Terminal - Full width at top (only if Easter Egg unlocked) */}
                    {team3150Unlocked && activeWidgets.includes('widget_terminal') && (
                        <div style={{
                            gridColumn: '1 / -1',
                            marginBottom: '1.5rem',
                            width: '100%'
                        }}>
                            {renderWidget('widget_terminal')}
                        </div>
                    )}

                    {/* Stats row */}
                    <div className="widget-row stats-row">
                        {activeWidgets.filter(w => ['stat_total', 'stat_low', 'stat_categories', 'stat_loan_pcs', 'stat_phones', 'kpi_today'].includes(w)).map(widgetId => (
                            <div key={widgetId} className="widget-wrapper">
                                {renderWidget(widgetId)}
                            </div>
                        ))}
                    </div>

                    {/* Charts row */}
                    <div className="widget-row charts-row">
                        {activeWidgets.filter(w => w.startsWith('chart_')).map(widgetId => (
                            <div key={widgetId} className={`widget-wrapper ${WIDGET_TYPES[widgetId.toUpperCase().replace('-', '_')]?.size === 'large' ? 'full-width' : ''}`}>
                                {renderWidget(widgetId)}
                            </div>
                        ))}
                    </div>



                    {/* Tables row */}
                    <div className="widget-row tables-row">
                        {activeWidgets.filter(w => w.startsWith('table_')).map(widgetId => (
                            <div key={widgetId} className="widget-wrapper">
                                {renderWidget(widgetId)}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Styled Toast Notification */}
            {toast && (
                <div style={{
                    position: 'fixed',
                    bottom: '2rem',
                    right: '2rem',
                    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                    border: '1px solid rgba(59, 130, 246, 0.4)',
                    borderRadius: '16px',
                    padding: '1rem 1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    boxShadow: '0 0 40px rgba(59, 130, 246, 0.3), 0 0 80px rgba(139, 92, 246, 0.2)',
                    animation: 'toastSlideIn 0.3s ease-out, toastGlow 2s ease-in-out infinite alternate',
                    zIndex: 10000,
                    color: '#e2e8f0'
                }}>
                    <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: toast.type === 'success'
                            ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                            : 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: toast.type === 'success'
                            ? '0 0 20px rgba(16, 185, 129, 0.5)'
                            : '0 0 20px rgba(59, 130, 246, 0.5)'
                    }}>
                        <Save size={16} color="white" />
                    </div>
                    <span style={{ fontWeight: 500 }}>{toast.message}</span>
                </div>
            )}

            {/* Shimmer Effect Style */}
            <style>{`
                @keyframes toastSlideIn {
                    from { opacity: 0; transform: translateX(100px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                @keyframes toastGlow {
                    0% { box-shadow: 0 0 40px rgba(59, 130, 246, 0.3), 0 0 80px rgba(139, 92, 246, 0.2); }
                    100% { box-shadow: 0 0 60px rgba(139, 92, 246, 0.4), 0 0 100px rgba(59, 130, 246, 0.3); }
                }

                /* Button Glow & Shimmer Animation */
                .btn-glow {
                    position: relative;
                    overflow: hidden;
                    transition: all 0.3s ease;
                }
                .btn-glow:hover {
                    box-shadow: 0 0 20px rgba(59, 130, 246, 0.6);
                    transform: translateY(-2px);
                }
                .btn-glow::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    right: 120%; /* Start off-screen left */
                    width: 50%;
                    height: 100%;
                    background: linear-gradient(
                        120deg,
                        transparent,
                        rgba(255, 255, 255, 0.4),
                        transparent
                    );
                    transform: skewX(-20deg);
                    animation: shimmer 3s infinite linear;
                    pointer-events: none; /* Let clicks pass through */
                }

                @keyframes shimmer {
                    0% { right: 120%; }
                    20% { right: -60%; } /* Move across quickly */
                    100% { right: -60%; } /* Wait */
                }
            `}</style>
        </div>
    );
}
