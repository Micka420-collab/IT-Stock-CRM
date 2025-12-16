import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const GamificationContext = createContext();

export const useGamification = () => useContext(GamificationContext);

// Constants
const MAX_LEVEL = 10;
const XP_PER_LEVEL = 100;

export const GamificationProvider = ({ children }) => {
    const { user } = useAuth() || {};
    const [xp, setXp] = useState(0);
    const [level, setLevel] = useState(1);
    const [isMaxLevel, setIsMaxLevel] = useState(false);
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const saveTimeoutRef = useRef(null);

    // Load XP from server when user changes
    useEffect(() => {
        if (!user) {
            // Reset when logged out
            setXp(0);
            setIsUnlocked(false);
            setIsLoaded(false);
            return;
        }

        const loadFromServer = async () => {
            try {
                const { data } = await axios.get('/api/users/gamification');
                setXp(data.xp || 0);
                if (data.team3150_unlocked) {
                    localStorage.setItem('team3150Unlocked', 'true');
                    setIsUnlocked(true);
                    window.dispatchEvent(new Event('team3150-unlocked'));
                }
                setIsLoaded(true);
            } catch (error) {
                console.error('Failed to load gamification data:', error);
                // Fallback to localStorage
                const savedXp = parseInt(localStorage.getItem('user_xp')) || 0;
                setXp(savedXp);
                setIsUnlocked(localStorage.getItem('team3150Unlocked') === 'true');
                setIsLoaded(true);
            }
        };
        loadFromServer();
    }, [user]);

    // Calculate level and save to server
    useEffect(() => {
        if (!isLoaded || !user) return;

        const calculatedLevel = Math.min(Math.floor(xp / XP_PER_LEVEL) + 1, MAX_LEVEL);

        if (calculatedLevel > level && level < MAX_LEVEL) {
            if (calculatedLevel >= MAX_LEVEL) {
                showNotification(`🏆 NIVEAU MAX ATTEINT ! Vous êtes légendaire !`, 'maxlevel');
            } else {
                showNotification(`LEVEL UP! Niveau ${calculatedLevel} ! 🎉`, 'levelup');
            }
        }

        setLevel(calculatedLevel);
        setIsMaxLevel(calculatedLevel >= MAX_LEVEL);

        // Save locally
        localStorage.setItem('user_xp', xp.toString());

        // Debounce save to server
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
            axios.post('/api/users/xp', { xp }).catch(() => { });
        }, 1000);
    }, [xp, level, isLoaded, user]);

    const addXp = (amount, reason) => {
        setXp(prev => prev + amount);
        showNotification(`+${amount} XP: ${reason}`, 'xp-gain');
    };

    const showNotification = (message, type) => {
        const id = Date.now();
        setNotifications(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id));
        }, 4000);
    };

    const setXpDirectly = (amount) => {
        setXp(amount);
        localStorage.setItem('user_xp', amount.toString());
        axios.post('/api/users/xp', { xp: amount }).catch(() => { });
    };

    const unlockEasterEgg = () => {
        localStorage.setItem('team3150Unlocked', 'true');
        setIsUnlocked(true);
        window.dispatchEvent(new Event('team3150-unlocked'));
        return axios.post('/api/users/unlock-easter-egg');
    };

    return (
        <GamificationContext.Provider value={{
            xp,
            level,
            isMaxLevel,
            isUnlocked,
            maxLevel: MAX_LEVEL,
            xpPerLevel: XP_PER_LEVEL,
            addXp,
            setXpDirectly,
            unlockEasterEgg,
            notifications
        }}>
            {children}
            {/* Gamification Toasts */}
            <div className="gamification-toast-container" style={{
                position: 'fixed',
                bottom: '20px',
                right: '20px',
                zIndex: 10000,
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
            }}>
                {notifications.map(n => (
                    <div key={n.id} style={{
                        background: n.type === 'maxlevel'
                            ? 'linear-gradient(45deg, #FFD700, #FF6B00)'
                            : n.type === 'levelup'
                                ? 'linear-gradient(45deg, #8B5CF6, #EC4899)'
                                : 'rgba(0,0,0,0.9)',
                        color: n.type === 'xp-gain' ? '#00ff9d' : '#FFF',
                        padding: '12px 20px',
                        borderRadius: '10px',
                        border: n.type === 'xp-gain' ? '1px solid #00ff9d' : 'none',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                        animation: 'slideInRight 0.3s ease-out',
                        fontWeight: 'bold',
                        fontFamily: 'system-ui, sans-serif',
                        fontSize: n.type === 'xp-gain' ? '0.85rem' : '1rem'
                    }}>
                        {n.message}
                    </div>
                ))}
            </div>

            <style>{`
                @keyframes slideInRight {
                    from { transform: translateX(100px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `}</style>
        </GamificationContext.Provider>
    );
};
