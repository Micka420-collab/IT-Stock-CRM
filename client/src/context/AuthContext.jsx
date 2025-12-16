import { createContext, useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';
import { Clock, LogOut } from 'lucide-react';
import SessionExpiredModal from '../components/SessionExpiredModal';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds
// const SESSION_TIMEOUT = 10 * 1000; // 10 seconds for testing (TEMPORARY)

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [lastActivity, setLastActivity] = useState(Date.now());
    const [showSessionExpired, setShowSessionExpired] = useState(false);

    // Update last activity on user interaction
    const updateActivity = useCallback(() => {
        setLastActivity(Date.now());
        localStorage.setItem('lastActivity', Date.now().toString());
    }, []);

    // Check for session timeout
    useEffect(() => {
        if (!user) return;

        const checkTimeout = () => {
            const lastAct = parseInt(localStorage.getItem('lastActivity') || Date.now().toString());
            if (Date.now() - lastAct > SESSION_TIMEOUT) {
                logout();
                setShowSessionExpired(true);
            }
        };

        const interval = setInterval(checkTimeout, 1000); // Check every second

        // POLLING: Refresh permissions every 5 seconds to ensure "Live" updates
        const permissionInterval = setInterval(() => {
            refreshUser().catch(e => console.error("Polling failed", e));
        }, 5000);

        // Add activity listeners
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
        events.forEach(event => window.addEventListener(event, updateActivity));

        return () => {
            clearInterval(interval);
            clearInterval(permissionInterval);
            events.forEach(event => window.removeEventListener(event, updateActivity));
        };
    }, [user, updateActivity]);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        if (token && storedUser) {
            const lastAct = parseInt(localStorage.getItem('lastActivity') || Date.now().toString());
            if (Date.now() - lastAct > SESSION_TIMEOUT) {
                logout();
                setShowSessionExpired(true); // Ensure modal shows on page reload if expired
            } else {
                setUser(JSON.parse(storedUser));
                axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            }
        }
        setLoading(false);
    }, []);

    const login = async (username, password) => {
        try {
            const res = await axios.post('/api/login', { username, password });
            const { token, user } = res.data;
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
            localStorage.setItem('lastActivity', Date.now().toString());
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            setUser(user);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.response?.data?.error || 'Login failed' };
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('lastActivity');
        delete axios.defaults.headers.common['Authorization'];
        setUser(null);
    };

    const refreshUser = async () => {
        try {
            const res = await axios.get('/api/me');
            const updatedUser = res.data;
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setUser(updatedUser);
            return updatedUser;
        } catch (error) {
            console.error('Failed to refresh user:', error);
            return null;
        }
    };

    const handleReconnect = () => {
        setShowSessionExpired(false);
        window.location.href = '/login';
    };

    const value = {
        user,
        login,
        logout,
        loading,
        refreshUser
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}

            {/* Premium Session Expired Modal */}
            {showSessionExpired && (
                <SessionExpiredModal onReconnect={handleReconnect} />
            )}
        </AuthContext.Provider>
    );
};
