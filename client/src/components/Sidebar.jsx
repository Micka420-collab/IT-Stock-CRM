import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, History, Settings, LogOut, Database, FileText, Laptop } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useGamification } from '../context/GamificationContext';
import { useLanguage } from '../context/LanguageContext';
import { hasPermission } from '../utils/permissions';

export default function Sidebar() {
    const { logout, user } = useAuth();
    const { t } = useLanguage();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const XPBar = () => {
        const gamification = useGamification();
        const { xp = 0, level = 1, isMaxLevel = false, xpPerLevel = 100, isUnlocked = false } = gamification || {};

        // If not unlocked, don't show
        if (!isUnlocked) return null;

        const currentLevelXp = xp % xpPerLevel;
        const progress = isMaxLevel ? 100 : (currentLevelXp / xpPerLevel) * 100;

        return (
            <div style={{ marginTop: '0.5rem', marginBottom: '1rem', width: '100%', padding: '0 5px' }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.7rem',
                    color: 'var(--text-secondary)',
                    marginBottom: '4px'
                }}>
                    <span style={{
                        color: isMaxLevel ? '#FFD700' : 'var(--primary-color)',
                        fontWeight: 'bold'
                    }}>
                        {isMaxLevel ? '👑 MAX' : `Lv.${level}`}
                    </span>
                    <span>{isMaxLevel ? `${xp} XP Total` : `${currentLevelXp}/${xpPerLevel} XP`}</span>
                </div>
                <div style={{
                    width: '100%',
                    height: '6px',
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '3px',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        width: `${progress}%`,
                        height: '100%',
                        background: isMaxLevel
                            ? 'linear-gradient(90deg, #FFD700, #FF6B00)'
                            : 'linear-gradient(90deg, var(--primary-color), #a855f7)',
                        transition: 'width 0.5s ease',
                        boxShadow: isMaxLevel ? '0 0 10px #FFD700' : 'none'
                    }}></div>
                </div>
            </div>
        );
    };

    // Check if user has crown (max level)
    const gamification = useGamification();
    const hasCrown = gamification?.isMaxLevel || false;

    // Helper for permissions
    const can = (perm) => hasPermission(user, perm);

    return (
        <div className="sidebar">
            <div className="sidebar-header">
                <div className="logged-user">
                    <span className="user-greeting">
                        {hasCrown && <span style={{ marginRight: '5px' }}>👑</span>}
                        {user?.username}
                    </span>
                    <div className="role-badge">{user?.role}</div>
                </div>

                {/* GAMIFICATION: XP BAR */}
                <XPBar />

                <div className="brand-logo">
                    <Database size={28} />
                    <span className="brand-text">IT<span className="brand-accent">Stock</span></span>
                </div>
            </div>

            <nav className="sidebar-nav">
                <NavLink to="/dashboard" end className={({ isActive }) => isActive ? 'active' : ''} id="sidebar-dashboard">
                    <LayoutDashboard size={20} />
                    <span>{t('dashboard')}</span>
                </NavLink>

                {can('inventory_view') && (
                    <NavLink to="/inventory" className={({ isActive }) => isActive ? 'active' : ''} id="sidebar-inventory">
                        <Package size={20} />
                        <span>{t('inventory')}</span>
                    </NavLink>
                )}

                {can('loans_view') && (
                    <NavLink to="/loan-pcs" className={({ isActive }) => isActive ? 'active' : ''}>
                        <Laptop size={20} />
                        <span>{t('loanPC')}</span>
                    </NavLink>
                )}

                {(can('inventory_view') || can('loans_view')) && (
                    <>
                        <NavLink to="/history" className={({ isActive }) => isActive ? 'active' : ''}>
                            <History size={20} />
                            <span>{t('history')}</span>
                        </NavLink>
                        <NavLink to="/reports" className={({ isActive }) => isActive ? 'active' : ''}>
                            <FileText size={20} />
                            <span>{t('reports') || 'Rapports'}</span>
                        </NavLink>
                    </>
                )}

                <NavLink to="/settings" className={({ isActive }) => isActive ? 'active' : ''} id="sidebar-settings">
                    <Settings size={20} />
                    <span>{t('settings')}</span>
                </NavLink>
            </nav>

            <div className="sidebar-footer">
                <button onClick={logout} className="logout-btn">
                    <LogOut size={20} />
                    <span>{t('logout')}</span>
                </button>
                <div className="version-hint" title="Essayez de chercher ce numéro...">
                    v3.1.5.0
                </div>
            </div>
        </div>
    );
}
