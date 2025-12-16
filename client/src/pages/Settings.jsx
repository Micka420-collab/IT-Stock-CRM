import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { hasPermission } from '../utils/permissions';
import { UserPlus, Trash2, Shield, User, Palette, Lock, Globe, Layers, Plus, Users, Mail, Building, AlertTriangle, Edit, X, Camera, CheckCircle, Upload, FileText, Trophy, Activity } from 'lucide-react';
import TutorialButton from '../components/TutorialButton';
import ConfirmModal from '../components/ConfirmModal';
import NotesPanel from '../components/NotesPanel';
import CSVImportModal from '../components/CSVImportModal';
import PermissionsSelector from '../components/PermissionsSelector';
import { LeaderboardTable, BadgesGrid } from '../components/GamificationComponents';
import { useGamification } from '../context/GamificationContext';

export default function Settings() {
    const { user, refreshUser } = useAuth();
    const { theme, setTheme } = useTheme();
    const { language, setLanguage, t } = useLanguage();
    const gamification = useGamification();
    const userXp = gamification?.xp || 0;
    const [activeTab, setActiveTab] = useState('appearance');

    // Helper for permissions
    const can = (perm) => hasPermission(user, perm);

    const [users, setUsers] = useState([]);
    const [newUser, setNewUser] = useState({ username: '', password: '', role: 'hotliner', permissions: [] });
    const [editingUser, setEditingUser] = useState(null);

    // Categories state
    const [categories, setCategories] = useState([]);
    const [newCategory, setNewCategory] = useState('');

    // Employees state
    const [employees, setEmployees] = useState([]);
    const [newEmployee, setNewEmployee] = useState({ name: '', email: '', department: '', password: '' });
    const [editingEmployee, setEditingEmployee] = useState(null);

    // Password change state
    const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });

    // Photo error modal state
    const [photoError, setPhotoError] = useState(null);

    // Confirm modal state (replaces window.confirm)
    const [confirmModal, setConfirmModal] = useState(null);

    // CSV Import modal state
    const [showCSVImport, setShowCSVImport] = useState(false);

    // Toast notification state (replaces alert)
    const [toast, setToast] = useState(null);

    // Audit Logs state
    const [auditLogs, setAuditLogs] = useState([]);
    const [auditFilters, setAuditFilters] = useState({ action: '', user_id: '', start_date: '', end_date: '' });

    // Blocked IPs state (Security)
    const [blockedIPs, setBlockedIPs] = useState([]);

    // Helper to show toast
    const showToast = (message, type = 'info') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    useEffect(() => {
        if (activeTab === 'users' && user?.role === 'admin') {
            fetchUsers();
        }
        if (activeTab === 'categories') {
            fetchCategories();
        }
        if (activeTab === 'employees') {
            fetchEmployees();
        }
        if (activeTab === 'audit' && user?.role === 'admin') {
            fetchAuditLogs();
        }
        if (activeTab === 'security' && user?.role === 'admin') {
            fetchBlockedIPs();
        }
    }, [activeTab, user]);

    const fetchAuditLogs = async () => {
        try {
            const params = new URLSearchParams();
            if (auditFilters.action) params.append('action', auditFilters.action);
            if (auditFilters.user_id) params.append('user_id', auditFilters.user_id);
            if (auditFilters.start_date) params.append('start_date', auditFilters.start_date);
            if (auditFilters.end_date) params.append('end_date', auditFilters.end_date);

            const res = await axios.get(`/api/audit-logs?${params.toString()}`);
            setAuditLogs(res.data);
        } catch (error) {
            console.error("Failed to fetch audit logs", error);
        }
    };

    // Fetch Blocked IPs
    const fetchBlockedIPs = async () => {
        try {
            const res = await axios.get('/api/admin/blocked-ips');
            setBlockedIPs(res.data);
        } catch (error) {
            console.error("Failed to fetch blocked IPs", error);
        }
    };

    // Unblock IP
    const handleUnblockIP = async (ip) => {
        try {
            await axios.delete(`/api/admin/blocked-ips/${encodeURIComponent(ip)}`);
            showToast(`IP ${ip} débloquée`, 'success');
            fetchBlockedIPs();
        } catch (error) {
            showToast(error.response?.data?.error || 'Erreur', 'error');
        }
    };

    // Unblock all IPs
    const handleUnblockAllIPs = async () => {
        try {
            await axios.delete('/api/admin/blocked-ips');
            showToast('Toutes les IPs débloquées', 'success');
            fetchBlockedIPs();
        } catch (error) {
            showToast(error.response?.data?.error || 'Erreur', 'error');
        }
    };

    // Refresh Audit logs when filters change (debounced could be better but this is fine)
    useEffect(() => {
        if (activeTab === 'audit' && user?.role === 'admin') {
            fetchAuditLogs();
        }
    }, [auditFilters]);

    const fetchUsers = async () => {
        try {
            const { data } = await axios.get('/api/users');
            setUsers(data);
        } catch (error) {
            console.error("Failed to fetch users");
        }
    };

    const fetchCategories = async () => {
        try {
            const { data } = await axios.get('/api/categories');
            setCategories(data);
        } catch (error) {
            console.error("Failed to fetch categories");
        }
    };

    const fetchEmployees = async () => {
        try {
            const { data } = await axios.get('/api/employees');
            setEmployees(data);
        } catch (error) {
            console.error("Failed to fetch employees");
        }
    };

    const handleAddUser = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/users', newUser);
            await fetchUsers();
            setNewUser({ username: '', password: '', role: 'hotliner', permissions: [] });
            showToast(t('userAdded'), 'success');
        } catch (error) {
            showToast(error.response?.data?.error || "Failed to add user", 'error');
        }
    };

    const handleEditUser = (u) => {
        setEditingUser({
            ...u,
            permissions: u.permissions ? (typeof u.permissions === 'string' ? JSON.parse(u.permissions) : u.permissions) : []
        });
    };

    const handleUpdateUser = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                username: editingUser.username,
                role: editingUser.role,
                permissions: JSON.stringify(editingUser.permissions)
            };
            if (editingUser.password) payload.password = editingUser.password;

            await axios.put(`/api/users/${editingUser.id}`, payload);
            await fetchUsers();
            setEditingUser(null);
            showToast('Utilisateur mis à jour', 'success');
        } catch (error) {
            showToast(error.response?.data?.error || "Failed to update user", 'error');
        }
    };

    const handleDeleteUser = (id) => {
        setConfirmModal({
            title: 'Supprimer l\'utilisateur',
            message: 'Êtes-vous sûr de vouloir supprimer cet utilisateur ?',
            type: 'danger',
            onConfirm: async () => {
                setConfirmModal(null);
                try {
                    await axios.delete(`/api/users/${id}`);
                    await fetchUsers();
                    showToast('Utilisateur supprimé', 'success');
                } catch (error) {
                    showToast(error.response?.data?.error || 'Erreur de suppression', 'error');
                }
            }
        });
    };



    const handleAddCategory = async (e) => {
        e.preventDefault();
        if (!newCategory.trim()) return;
        try {
            await axios.post('/api/categories', { name: newCategory });
            await fetchCategories();
            setNewCategory('');
        } catch (error) {
            alert(error.response?.data?.error || "Failed to add category");
        }
    };

    const handleDeleteCategory = (id) => {
        setConfirmModal({
            title: t('confirmDeleteCategory'),
            message: 'Cette action est irréversible.',
            type: 'danger',
            onConfirm: async () => {
                setConfirmModal(null);
                try {
                    await axios.delete(`/api/categories/${id}`);
                    await fetchCategories();
                    showToast('Catégorie supprimée', 'success');
                } catch (error) {
                    showToast(error.response?.data?.error || 'Erreur de suppression', 'error');
                }
            }
        });
    };

    const handleAddEmployee = async (e) => {
        e.preventDefault();
        if (!newEmployee.name.trim()) return;
        try {
            await axios.post('/api/employees', newEmployee);
            await fetchEmployees();
            setNewEmployee({ name: '', email: '', department: '', password: '', permissions: [] });
            showToast(t('userAdded').replace('Utilisateur', 'Employé'), 'success');
        } catch (error) {
            showToast(error.response?.data?.error || "Failed to add employee", 'error');
        }
    };

    const handleDeleteEmployee = (id) => {
        setConfirmModal({
            title: t('confirmDeleteEmployee'),
            message: 'Cette action est irréversible. L\'employé sera définitivement supprimé.',
            type: 'danger',
            onConfirm: async () => {
                setConfirmModal(null);
                try {
                    await axios.delete(`/api/employees/${id}`);
                    await fetchEmployees();
                    showToast('Employé supprimé', 'success');
                } catch (error) {
                    showToast(error.response?.data?.error || 'Erreur de suppression', 'error');
                }
            }
        });
    };

    const handleEditEmployee = (employee) => {
        setEditingEmployee({
            ...employee,
            password: '',
            permissions: employee.permissions ? (typeof employee.permissions === 'string' ? JSON.parse(employee.permissions) : employee.permissions) : []
        });
    };

    const handleUpdateEmployee = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...editingEmployee, permissions: JSON.stringify(editingEmployee.permissions) };
            await axios.put(`/api/employees/${editingEmployee.id}`, payload);
            await fetchEmployees();
            setEditingEmployee(null);
            showToast('Employé mis à jour', 'success');
        } catch (error) {
            showToast(error.response?.data?.error || "Failed to update employee", 'error');
        }
    };



    const handlePasswordChange = async (e) => {
        e.preventDefault();
        setPasswordMessage({ type: '', text: '' });

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setPasswordMessage({ type: 'error', text: t('passwordMismatch') });
            return;
        }

        try {
            await axios.post('/api/users/change-password', {
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword
            });
            setPasswordMessage({ type: 'success', text: t('passwordChanged') });
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error) {
        }
    };

    const handleResetDatabase = () => {
        setConfirmModal({
            title: t('alertResetDB1'),
            message: t('alertResetDB2'),
            type: 'danger',
            confirmText: 'Réinitialiser',
            onConfirm: async () => {
                setConfirmModal(null);
                try {
                    await axios.post('/api/admin/reset-database');
                    showToast(t('resetSuccessDB'), 'success');
                } catch (error) {
                    console.error(error);
                    showToast(t('errorReset'), 'error');
                }
            }
        });
    };

    const handleResetEmployees = () => {
        setConfirmModal({
            title: t('alertResetEmp1'),
            message: 'Tous les employés seront supprimés définitivement.',
            type: 'danger',
            confirmText: 'Réinitialiser',
            onConfirm: async () => {
                setConfirmModal(null);
                try {
                    await axios.post('/api/admin/reset-employees');
                    setEmployees([]);
                    showToast(t('resetSuccessEmp'), 'success');
                } catch (error) {
                    console.error(error);
                    showToast(t('errorReset'), 'error');
                }
            }
        });
    };

    // Photo upload handlers
    const handlePhotoUpload = async (type, id, file) => {
        // Validate file
        const maxSize = 5 * 1024 * 1024; // 5MB
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

        if (!allowedTypes.includes(file.type)) {
            setPhotoError({
                title: 'Format non supporté',
                message: `Le fichier "${file.name}" n'est pas une image valide.`,
                requirements: ['JPEG / JPG', 'PNG', 'GIF', 'WebP']
            });
            return;
        }

        if (file.size > maxSize) {
            setPhotoError({
                title: 'Image trop volumineuse',
                message: `L'image fait ${(file.size / 1024 / 1024).toFixed(2)} MB.`,
                requirements: ['Taille max: 5 MB', 'Idéalement: moins de 1 MB', 'Dimensions recommandées: 400x400 px']
            });
            return;
        }

        const reader = new FileReader();
        reader.onloadend = async () => {
            try {
                const base64 = reader.result;
                await axios.post(`/api/${type}/${id}/photo`, { photo_url: base64 });
                // Refresh current user if uploading own photo
                if (type === 'users' && id === user?.id) {
                    await refreshUser();
                    showToast('Photo de profil mise à jour !', 'success');
                } else if (type === 'users') {
                    await fetchUsers();
                    showToast('Photo mise à jour !', 'success');
                } else {
                    await fetchEmployees();
                    showToast('Photo mise à jour !', 'success');
                }
            } catch (error) {
                setPhotoError({
                    title: 'Erreur d\'upload',
                    message: 'Une erreur est survenue lors de l\'upload de l\'image.',
                    requirements: ['Vérifiez votre connexion', 'Réessayez avec une image plus petite']
                });
            }
        };
        reader.readAsDataURL(file);
    };

    const handlePhotoDelete = (type, id) => {
        setConfirmModal({
            title: 'Supprimer la photo',
            message: 'Êtes-vous sûr de vouloir supprimer cette photo de profil ?',
            type: 'danger',
            onConfirm: async () => {
                setConfirmModal(null);
                try {
                    await axios.delete(`/api/${type}/${id}/photo`);
                    if (type === 'users' && id === user?.id) {
                        await refreshUser();
                    } else if (type === 'users') {
                        await fetchUsers();
                    } else {
                        await fetchEmployees();
                    }
                    showToast('Photo supprimée avec succès', 'success');
                } catch (error) {
                    showToast('Erreur lors de la suppression', 'error');
                }
            }
        });
    };

    return (
        <div className="settings-page">
            <h1 className="page-title">{t('settingsTitle')}</h1>

            <div className="settings-container">
                <TutorialButton tutorialKey="settings" />
                <div className="settings-sidebar">
                    <button
                        className={`tab-btn ${activeTab === 'appearance' ? 'active' : ''}`}
                        onClick={() => setActiveTab('appearance')}
                    >
                        <Palette size={18} /> {t('appearance')}
                    </button>
                    {can('inventory_edit') && (
                        <button
                            className={`tab-btn ${activeTab === 'categories' ? 'active' : ''}`}
                            onClick={() => setActiveTab('categories')}
                        >
                            <Layers size={18} /> {t('categoriesManagement')}
                        </button>
                    )}
                    {can('employees_view') && (
                        <button
                            className={`tab-btn ${activeTab === 'employees' ? 'active' : ''}`}
                            onClick={() => setActiveTab('employees')}
                        >
                            <Users size={18} /> {t('employeesManagement')}
                        </button>
                    )}
                    {can('users_manage') && (
                        <button
                            className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
                            onClick={() => setActiveTab('users')}
                        >
                            <Shield size={18} /> {t('userManagement')}
                        </button>
                    )}

                    {can('settings_access') && (
                        <button
                            className={`tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
                            onClick={() => setActiveTab('audit')}
                        >
                            <FileText size={18} /> Audit Log
                        </button>
                    )}

                    {/* Sidebar Button - Always visible now */}
                    <button
                        className={`tab-btn ${activeTab === 'achievements' ? 'active' : ''}`}
                        onClick={() => setActiveTab('achievements')}
                        style={{
                            background: (user?.team3150_unlocked || user?.role === 'admin') ? 'linear-gradient(45deg, rgba(255,215,0,0.1), transparent)' : 'transparent',
                            border: (user?.team3150_unlocked || user?.role === 'admin') ? '1px solid rgba(255,215,0,0.3)' : '1px solid transparent'
                        }}
                    >
                        <Trophy size={18} color={(user?.team3150_unlocked || user?.role === 'admin') ? "#FFD700" : "var(--text-secondary)"} />
                        <span style={{ color: (user?.team3150_unlocked || user?.role === 'admin') ? 'var(--text-color)' : 'var(--text-secondary)' }}>
                            {(user?.team3150_unlocked || user?.role === 'admin') ? 'Achievements' : '???'}
                        </span>
                        {!(user?.team3150_unlocked || user?.role === 'admin') && <Lock size={12} style={{ marginLeft: 'auto', opacity: 0.5 }} />}
                    </button>

                    {user?.role === 'admin' && (
                        <button
                            className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`}
                            onClick={() => setActiveTab('security')}
                            style={{ color: '#10b981' }}
                        >
                            <Shield size={18} /> Sécurité
                        </button>
                    )}

                    {user?.role === 'admin' && (
                        <button
                            className={`tab-btn ${activeTab === 'danger' ? 'active' : ''} danger-tab`}
                            onClick={() => setActiveTab('danger')}
                            style={{ color: '#ef4444', marginTop: 'auto', borderTop: '1px solid var(--border-color)' }}
                        >
                            <AlertTriangle size={18} /> {t('dangerZone')}
                        </button>
                    )}
                    <button
                        className={`tab-btn ${activeTab === 'account' ? 'active' : ''}`}
                        onClick={() => setActiveTab('account')}
                    >
                        <User size={18} /> {t('myAccount')}
                    </button>
                </div>

                <div className="settings-content">

                    {activeTab === 'appearance' && (
                        <>
                            <div className="card">
                                <h2><Palette size={20} /> {t('interfaceTheme')}</h2>
                                <p className="section-desc">{t('chooseTheme')}</p>

                                <div className="theme-grid">
                                    <button
                                        className={`theme-option ${theme === 'light' ? 'selected' : ''}`}
                                        onClick={() => setTheme('light')}
                                    >
                                        <div className="theme-preview light"></div>
                                        <span>{t('lightMode')}</span>
                                    </button>

                                    <button
                                        className={`theme-option ${theme === 'dim' ? 'selected' : ''}`}
                                        onClick={() => setTheme('dim')}
                                    >
                                        <div className="theme-preview dim"></div>
                                        <span>{t('semiDark')}</span>
                                    </button>

                                    <button
                                        className={`theme-option ${theme === 'dark' ? 'selected' : ''}`}
                                        onClick={() => setTheme('dark')}
                                    >
                                        <div className="theme-preview dark"></div>
                                        <span>{t('darkMode')}</span>
                                    </button>

                                    {/* Christmas Theme - Unlocks at 200 XP */}
                                    <button
                                        className={`theme-option ${theme === 'christmas' ? 'selected' : ''} ${userXp < 200 ? 'locked' : ''}`}
                                        onClick={() => userXp >= 200 && setTheme('christmas')}
                                        disabled={userXp < 200}
                                        style={userXp < 200 ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
                                        title={userXp < 200 ? `Débloquez à 200 XP (Actuel: ${userXp} XP)` : 'Thème Noël 🎄'}
                                    >
                                        <div className="theme-preview christmas" style={{
                                            background: 'linear-gradient(135deg, #0c1f0c 0%, #1a2f1a 50%, #c41e3a 100%)',
                                            position: 'relative',
                                            overflow: 'hidden'
                                        }}>
                                            {userXp < 200 && (
                                                <div style={{
                                                    position: 'absolute',
                                                    inset: 0,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    background: 'rgba(0,0,0,0.5)',
                                                    color: '#fff',
                                                    fontSize: '1.2rem'
                                                }}>🔒</div>
                                            )}
                                        </div>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                            🎄 Noël
                                            {userXp < 200 && <Lock size={12} style={{ marginLeft: '4px' }} />}
                                        </span>
                                        {userXp < 200 && (
                                            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block' }}>
                                                200 XP requis
                                            </span>
                                        )}
                                    </button>

                                    {/* BRGM Corporate Theme */}
                                    <button
                                        className={`theme-option ${theme === 'brgm' ? 'selected' : ''}`}
                                        onClick={() => setTheme('brgm')}
                                    >
                                        <div className="theme-preview brgm" style={{
                                            background: 'linear-gradient(135deg, #3d3d3d 0%, #4a4a4a 50%, #e85d04 100%)',
                                            position: 'relative'
                                        }}></div>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                            🏛️ BRGM
                                        </span>
                                    </button>
                                </div>
                            </div>

                            <div className="card" style={{ marginTop: '1.5rem' }}>
                                <h2><Globe size={20} /> {t('language')}</h2>
                                <p className="section-desc">{t('chooseLanguage')}</p>

                                <div className="language-grid">
                                    <button
                                        className={`language-option ${language === 'fr' ? 'selected' : ''}`}
                                        onClick={() => setLanguage('fr')}
                                    >
                                        <span className="lang-flag">🇫🇷</span>
                                        <span>Français</span>
                                    </button>

                                    <button
                                        className={`language-option ${language === 'en' ? 'selected' : ''}`}
                                        onClick={() => setLanguage('en')}
                                    >
                                        <span className="lang-flag">🇬🇧</span>
                                        <span>English</span>
                                    </button>
                                </div>
                            </div>
                        </>
                    )}

                    {activeTab === 'categories' && can('inventory_edit') && (
                        <div className="settings-grid">
                            <div className="card form-card">
                                <div className="card-header-pro">
                                    <h2><Plus size={20} /> {t('addCategory')}</h2>
                                    <p className="section-desc">{t('addCategoryDesc')}</p>
                                </div>

                                <form onSubmit={handleAddCategory} className="pro-form">
                                    <div className="form-group">
                                        <label>{t('categoryName')}</label>
                                        <div className="input-affix-wrapper">
                                            <Layers size={16} className="input-icon-left" />
                                            <input
                                                required
                                                value={newCategory}
                                                onChange={e => setNewCategory(e.target.value)}
                                                placeholder={t('placeholderCategory')}
                                            />
                                        </div>
                                    </div>

                                    <div className="form-actions">
                                        <button className="submit-btn pro-submit">
                                            <Plus size={18} />
                                            {t('addCategory')}
                                        </button>
                                    </div>
                                </form>
                            </div>

                            <div className="card list-card">
                                <h2>{t('existingCategories')}</h2>
                                <div className="user-list">
                                    {categories.map(cat => (
                                        <div key={cat.id} className="user-item">
                                            <div className="user-info">
                                                <div className="avatar">
                                                    <Layers size={18} />
                                                </div>
                                                <div>
                                                    <div className="username">{cat.name}</div>
                                                </div>
                                            </div>
                                            <button className="delete-btn" onClick={() => handleDeleteCategory(cat.id)}>
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                    {categories.length === 0 && (
                                        <p className="no-activity">{t('noCategories')}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'employees' && can('employees_view') && (
                        <div className="settings-grid">
                            <div className="card form-card">
                                <div className="card-header-pro" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <h2><UserPlus size={20} /> {t('addEmployee')}</h2>
                                        <p className="section-desc">{t('addEmployeeDesc')}</p>
                                    </div>
                                    <button
                                        onClick={() => setShowCSVImport(true)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            padding: '0.5rem 1rem',
                                            background: 'var(--hover-bg)',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '8px',
                                            color: 'var(--text-color)',
                                            cursor: 'pointer',
                                            fontSize: '0.875rem'
                                        }}
                                    >
                                        <Upload size={16} />
                                        Import CSV
                                    </button>
                                </div>

                                <form onSubmit={handleAddEmployee} className="pro-form">
                                    <div className="form-group">
                                        <label>{t('employeeName')}</label>
                                        <div className="input-affix-wrapper">
                                            <User size={16} className="input-icon-left" />
                                            <input
                                                required
                                                value={newEmployee.name}
                                                onChange={e => setNewEmployee({ ...newEmployee, name: e.target.value })}
                                                placeholder={t('placeholderEmployeeName')}
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>{t('employeeEmail')}</label>
                                        <div className="input-affix-wrapper">
                                            <Mail size={16} className="input-icon-left" />
                                            <input
                                                type="email"
                                                value={newEmployee.email}
                                                onChange={e => setNewEmployee({ ...newEmployee, email: e.target.value })}
                                                placeholder={t('placeholderEmployeeEmail')}
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>{t('employeeDepartment')}</label>
                                        <div className="input-affix-wrapper">
                                            <Building size={16} className="input-icon-left" />
                                            <input
                                                value={newEmployee.department}
                                                onChange={e => setNewEmployee({ ...newEmployee, department: e.target.value })}
                                                placeholder={t('placeholderDepartment')}
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>{t('employeePassword')} ({t('optional')})</label>
                                        <div className="input-affix-wrapper">
                                            <Lock size={16} className="input-icon-left" />
                                            <input
                                                type="password"
                                                value={newEmployee.password || ''}
                                                onChange={e => setNewEmployee({ ...newEmployee, password: e.target.value })}
                                                placeholder={t('placeholderEmployeePassword')}
                                            />
                                        </div>
                                        <p className="form-hint" style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.5rem' }}>
                                            {t('employeePasswordHint')}
                                        </p>
                                    </div>

                                    <PermissionsSelector
                                        selectedPermissions={newEmployee.permissions || []}
                                        onChange={perms => setNewEmployee({ ...newEmployee, permissions: perms })}
                                    />

                                    <div className="form-actions">
                                        <button className="submit-btn pro-submit">
                                            <UserPlus size={18} />
                                            {t('addEmployee')}
                                        </button>
                                    </div>
                                </form>
                            </div>

                            <div className="card list-card">
                                <h2>{t('existingEmployees')}</h2>
                                <div className="user-list">
                                    {employees.map(emp => (
                                        <div key={emp.id} className="user-item">
                                            <div className="user-info">
                                                <div className="avatar" style={emp.photo_url ? { padding: 0, overflow: 'hidden' } : {}}>
                                                    {emp.photo_url ? (
                                                        <img src={emp.photo_url} alt={emp.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    ) : (
                                                        <User size={18} />
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="username">{emp.name}</div>
                                                    <div className="role">{emp.department || emp.email || '-'}</div>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <label className="delete-btn" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', cursor: 'pointer' }}>
                                                    <Camera size={16} />
                                                    <input type="file" accept="image/*" hidden onChange={(e) => e.target.files[0] && handlePhotoUpload('employees', emp.id, e.target.files[0])} />
                                                </label>
                                                {emp.photo_url && (
                                                    <button className="delete-btn" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }} onClick={() => handlePhotoDelete('employees', emp.id)}>
                                                        <X size={16} />
                                                    </button>
                                                )}
                                                <button className="delete-btn" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }} onClick={() => handleEditEmployee(emp)}>
                                                    <Edit size={16} />
                                                </button>
                                                <button className="delete-btn" onClick={() => handleDeleteEmployee(emp.id)}>
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {employees.length === 0 && (
                                        <p className="no-activity">{t('noEmployees')}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Edit Employee Modal */}
                    {editingEmployee && (
                        <div className="modal-overlay">
                            <div className="modal">
                                <button className="modal-close" onClick={() => setEditingEmployee(null)}>
                                    <X size={24} />
                                </button>
                                <h2>{t('editEmployee')}</h2>
                                <form onSubmit={handleUpdateEmployee} className="pro-form">
                                    <div className="form-group">
                                        <label>{t('employeeName')}</label>
                                        <input
                                            required
                                            value={editingEmployee.name}
                                            onChange={e => setEditingEmployee({ ...editingEmployee, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>{t('employeeEmail')}</label>
                                        <input
                                            type="email"
                                            value={editingEmployee.email}
                                            onChange={e => setEditingEmployee({ ...editingEmployee, email: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>{t('employeeDepartment')}</label>
                                        <input
                                            value={editingEmployee.department}
                                            onChange={e => setEditingEmployee({ ...editingEmployee, department: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>{t('newPassword')} ({t('optional')})</label>
                                        <input
                                            type="password"
                                            value={editingEmployee.password || ''}
                                            onChange={e => setEditingEmployee({ ...editingEmployee, password: e.target.value })}
                                            placeholder={t('placeholderEmployeePassword')}
                                        />
                                    </div>

                                    <PermissionsSelector
                                        selectedPermissions={editingEmployee.permissions || []}
                                        onChange={perms => setEditingEmployee({ ...editingEmployee, permissions: perms })}
                                    />

                                    <div className="form-actions">
                                        <button type="submit" className="submit-btn pro-submit">
                                            {t('updateEmployee')}
                                        </button>
                                    </div>
                                </form>
                                <NotesPanel entityType="employee" entityId={editingEmployee.id} />
                            </div>
                        </div>
                    )}

                    {activeTab === 'users' && can('users_manage') && (
                        <div className="settings-grid">
                            <div className="card form-card">
                                <div className="card-header-pro">
                                    <h2><UserPlus size={20} /> {t('createUser')}</h2>
                                    <p className="section-desc">{t('addAccessAccount')}</p>
                                </div>

                                <form onSubmit={handleAddUser} className="pro-form">
                                    <div className="form-group">
                                        <label>{t('username')}</label>
                                        <div className="input-affix-wrapper">
                                            <User size={16} className="input-icon-left" />
                                            <input
                                                required
                                                value={newUser.username}
                                                onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                                                placeholder="e.g. jdoe"
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>{t('password')}</label>
                                        <div className="input-affix-wrapper">
                                            <Lock size={16} className="input-icon-left" />
                                            <input
                                                required
                                                type="password"
                                                value={newUser.password}
                                                onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                                                placeholder="••••••••"
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>{t('roleAccess')}</label>
                                        <div className="input-affix-wrapper">
                                            <Shield size={16} className="input-icon-left" />
                                            <select
                                                value={newUser.role}
                                                onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                                            >
                                                <option value="hotliner">{t('hotliner')}</option>
                                                <option value="admin">{t('admin')}</option>
                                            </select>
                                        </div>
                                    </div>

                                    <PermissionsSelector
                                        selectedPermissions={newUser.permissions || []}
                                        onChange={perms => setNewUser({ ...newUser, permissions: perms })}
                                    />

                                    <div className="form-actions">
                                        <button className="submit-btn pro-submit">
                                            <UserPlus size={18} />
                                            {t('createAccount')}
                                        </button>
                                    </div>
                                </form>
                            </div>
                            <div className="card list-card">
                                <h2>{t('currentUsers')}</h2>
                                <div className="user-list">
                                    {users.map(u => (
                                        <div key={u.id} className="user-item">
                                            <div className="user-info">
                                                <div className="avatar" style={u.photo_url ? { padding: 0, overflow: 'hidden' } : {}}>
                                                    {u.photo_url ? (
                                                        <img src={u.photo_url} alt={u.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    ) : u.role === 'admin' ? (
                                                        <Shield size={18} />
                                                    ) : (
                                                        <User size={18} />
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="username">{u.username}</div>
                                                    <div className="role">{u.role}</div>
                                                </div>
                                            </div>
                                            {u.username !== 'admin' && u.id !== user.id && (
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <label className="delete-btn" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', cursor: 'pointer' }}>
                                                        <Camera size={16} />
                                                        <input type="file" accept="image/*" hidden onChange={(e) => e.target.files[0] && handlePhotoUpload('users', u.id, e.target.files[0])} />
                                                    </label>
                                                    {u.photo_url && (
                                                        <button className="delete-btn" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }} onClick={() => handlePhotoDelete('users', u.id)}>
                                                            <X size={16} />
                                                        </button>
                                                    )}
                                                    <button className="delete-btn" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }} onClick={() => handleEditUser(u)}>
                                                        <Edit size={16} />
                                                    </button>
                                                    <button className="delete-btn" onClick={() => handleDeleteUser(u.id)}>
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Edit User Modal */}
                    {editingUser && (
                        <div className="modal-overlay">
                            <div className="modal">
                                <button className="modal-close" onClick={() => setEditingUser(null)}>
                                    <X size={24} />
                                </button>
                                <h2>{t('editUser')}</h2>
                                <form onSubmit={handleUpdateUser} className="pro-form">
                                    <div className="form-group">
                                        <label>{t('username')}</label>
                                        <input
                                            required
                                            value={editingUser.username}
                                            onChange={e => setEditingUser({ ...editingUser, username: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>{t('role')}</label>
                                        <select
                                            value={editingUser.role}
                                            onChange={e => setEditingUser({ ...editingUser, role: e.target.value })}
                                        >
                                            <option value="hotliner">{t('hotliner')}</option>
                                            <option value="admin">{t('admin')}</option>
                                        </select>
                                    </div>

                                    <PermissionsSelector
                                        selectedPermissions={editingUser.permissions || []}
                                        onChange={perms => setEditingUser({ ...editingUser, permissions: perms })}
                                    />

                                    <div className="form-group">
                                        <label>{t('newPassword')} ({t('optional')})</label>
                                        <input
                                            type="password"
                                            value={editingUser.password || ''}
                                            onChange={e => setEditingUser({ ...editingUser, password: e.target.value })}
                                            placeholder={t('placeholderEmployeePassword')}
                                        />
                                    </div>
                                    <div className="form-actions">
                                        <button type="submit" className="submit-btn pro-submit">
                                            {t('updateUser')}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {activeTab === 'users' && user?.role !== 'admin' && (
                        <div className="error-message">{t('accessDenied')}</div>
                    )}

                    {activeTab === 'audit' && can('settings_access') && (
                        <div className="settings-grid">
                            <div className="card full-width">
                                <h2><FileText size={20} /> Audit Log</h2>
                                <p className="section-desc">Historique des actions utilisateurs</p>

                                <div className="filters-bar" style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                                    <input
                                        placeholder="Filtrer par action..."
                                        value={auditFilters.action}
                                        onChange={e => setAuditFilters({ ...auditFilters, action: e.target.value })}
                                        className="search-input"
                                        style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-color)' }}
                                    />
                                    <input
                                        type="date"
                                        value={auditFilters.start_date}
                                        onChange={e => setAuditFilters({ ...auditFilters, start_date: e.target.value })}
                                        style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-color)' }}
                                    />
                                    <input
                                        type="date"
                                        value={auditFilters.end_date}
                                        onChange={e => setAuditFilters({ ...auditFilters, end_date: e.target.value })}
                                        style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-color)' }}
                                    />
                                </div>

                                <div className="table-container">
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Date</th>
                                                <th>Utilisateur</th>
                                                <th>Rôle</th>
                                                <th>Action</th>
                                                <th>Détails</th>
                                                <th>IP</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {auditLogs.length > 0 ? (
                                                auditLogs.map(log => {
                                                    let dateStr = 'Date invalide';
                                                    try {
                                                        const cleanDate = log.timestamp ? log.timestamp.replace(' ', 'T') : null;
                                                        dateStr = cleanDate ? new Date(cleanDate).toLocaleString() : 'N/A';
                                                    } catch (e) { dateStr = log.timestamp; }

                                                    return (
                                                        <tr key={log.id}>
                                                            <td>{dateStr}</td>
                                                            <td>{log.username}</td>
                                                            <td>
                                                                <span className={`role-badge ${log.user_role === 'admin' ? 'admin' : 'hotliner'}`}>
                                                                    {log.user_role}
                                                                </span>
                                                            </td>
                                                            <td><strong>{log.action}</strong></td>
                                                            <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.details}>
                                                                {log.details && log.details.startsWith('{') ? 'Données JSON' : log.details}
                                                            </td>
                                                            <td>{log.ip_address}</td>
                                                        </tr>
                                                    );
                                                })
                                            ) : (
                                                <tr>
                                                    <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>Aucun log trouvé</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'achievements' && (
                        (user?.team3150_unlocked || user?.role === 'admin') ? (
                            <div className="gamification-dashboard" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                                <div className="card">
                                    <LeaderboardTable />
                                </div>
                                <div className="card">
                                    <BadgesGrid />
                                </div>
                            </div>
                        ) : (
                            <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔒</div>
                                <h2>Section Verrouillée</h2>
                                <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                                    Cette section contient les succès et le classement de l'équipe.<br />
                                    Trouvez le code secret pour débloquer l'accès.
                                </p>
                                <div style={{
                                    background: 'var(--bg-secondary)',
                                    padding: '1rem',
                                    borderRadius: '8px',
                                    display: 'inline-block',
                                    fontFamily: 'monospace'
                                }}>
                                    Indice: <span style={{ letterSpacing: '3px' }}>????</span>
                                </div>
                            </div>
                        )
                    )}

                    {activeTab === 'account' && (
                        <>
                            <div className="card">
                                <h2><User size={20} /> {t('myProfile')}</h2>
                                <div className="profile-info">
                                    {/* Profile Photo Section */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
                                        <div style={{
                                            width: '80px',
                                            height: '80px',
                                            borderRadius: '50%',
                                            background: 'var(--hover-bg)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            overflow: 'hidden',
                                            border: '3px solid var(--primary-color)'
                                        }}>
                                            {user?.photo_url ? (
                                                <img src={user.photo_url} alt={user.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <User size={32} style={{ opacity: 0.5 }} />
                                            )}
                                        </div>
                                        <div>
                                            <label className="submit-btn pro-submit" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <Camera size={16} />
                                                {user?.photo_url ? 'Changer la photo' : 'Ajouter une photo'}
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    hidden
                                                    onChange={(e) => {
                                                        if (e.target.files[0]) {
                                                            handlePhotoUpload('users', user.id, e.target.files[0]);
                                                        }
                                                    }}
                                                />
                                            </label>
                                            {user?.photo_url && (
                                                <button
                                                    className="delete-btn"
                                                    style={{ marginLeft: '0.5rem' }}
                                                    onClick={() => handlePhotoDelete('users', user.id)}
                                                >
                                                    <Trash2 size={14} /> Supprimer
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="info-row">
                                        <label>{t('username')}</label>
                                        <div className="value">{user?.username}</div>
                                    </div>
                                    <div className="info-row">
                                        <label>{t('role')}</label>
                                        <div className="value role-badge">{user?.role}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="card form-card">
                                <div className="card-header-pro">
                                    <h2><Lock size={20} /> {t('changePassword')}</h2>
                                </div>

                                {passwordMessage.text && (
                                    <div className={`alert ${passwordMessage.type === 'success' ? 'alert-success' : 'alert-error'}`}>
                                        {passwordMessage.text}
                                    </div>
                                )}

                                <form onSubmit={handlePasswordChange} className="pro-form">
                                    <div className="form-group">
                                        <label>{t('currentPassword')}</label>
                                        <div className="input-affix-wrapper">
                                            <Lock size={16} className="input-icon-left" />
                                            <input
                                                type="password"
                                                required
                                                value={passwordData.currentPassword}
                                                onChange={e => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>{t('newPassword')}</label>
                                        <div className="input-affix-wrapper">
                                            <Lock size={16} className="input-icon-left" />
                                            <input
                                                type="password"
                                                required
                                                value={passwordData.newPassword}
                                                onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>{t('confirmPassword')}</label>
                                        <div className="input-affix-wrapper">
                                            <Lock size={16} className="input-icon-left" />
                                            <input
                                                type="password"
                                                required
                                                value={passwordData.confirmPassword}
                                                onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="form-actions">
                                        <button type="submit" className="submit-btn pro-submit">
                                            <Lock size={18} />
                                            {t('changePassword')}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </>
                    )}

                    {/* Security Tab - Blocked IPs Management */}
                    {activeTab === 'security' && user?.role === 'admin' && (
                        <div className="card">
                            <div className="card-header-pro">
                                <h2><Shield size={20} style={{ color: '#10b981' }} /> Sécurité - IPs Bloquées</h2>
                                <p className="section-desc">Gérer les adresses IP bloquées suite à trop de tentatives de connexion.</p>
                            </div>

                            <div style={{ padding: '1.5rem' }}>
                                {blockedIPs.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                        <CheckCircle size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
                                        <p>Aucune IP bloquée</p>
                                    </div>
                                ) : (
                                    <>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                            <span style={{ color: 'var(--text-secondary)' }}>{blockedIPs.length} IP(s) bloquée(s)</span>
                                            <button
                                                className="delete-btn"
                                                onClick={() => setConfirmModal({
                                                    title: 'Débloquer toutes les IPs',
                                                    message: 'Êtes-vous sûr de vouloir débloquer toutes les IPs ?',
                                                    onConfirm: handleUnblockAllIPs
                                                })}
                                                style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
                                            >
                                                Débloquer tout
                                            </button>
                                        </div>
                                        <div className="table-container">
                                            <table className="data-table">
                                                <thead>
                                                    <tr>
                                                        <th>Adresse IP</th>
                                                        <th>Tentatives</th>
                                                        <th>Raison</th>
                                                        <th>Expire dans</th>
                                                        <th>Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {blockedIPs.map((item, idx) => (
                                                        <tr key={idx}>
                                                            <td><code style={{ background: 'var(--hover-bg)', padding: '2px 6px', borderRadius: '4px' }}>{item.ip}</code></td>
                                                            <td>{item.attempts}</td>
                                                            <td>{item.reason}</td>
                                                            <td>{item.expiresIn}</td>
                                                            <td>
                                                                <button
                                                                    className="edit-btn"
                                                                    onClick={() => handleUnblockIP(item.ip)}
                                                                    style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}
                                                                >
                                                                    Débloquer
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                    {activeTab === 'danger' && user?.role === 'admin' && (
                        <div className="card" style={{ borderColor: '#ef4444' }}>
                            <div className="card-header-pro">
                                <h2 style={{ color: '#ef4444' }}><AlertTriangle size={20} /> {t('dangerZone')}</h2>
                                <p className="section-desc">{t('dangerZoneDesc')}</p>
                            </div>

                            <div className="danger-actions">
                                <div className="danger-item" style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
                                    <h3>{t('resetDatabase')}</h3>
                                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                                        {t('resetDatabaseDesc')}
                                    </p>
                                    <button
                                        className="delete-btn full-width"
                                        onClick={handleResetDatabase}
                                        style={{ backgroundColor: '#fee2e2', color: '#ef4444', padding: '0.75rem', width: '100%', justifyContent: 'center' }}
                                    >
                                        <Trash2 size={18} /> {t('btnResetDatabase')}
                                    </button>
                                </div>

                                <div className="danger-item" style={{ padding: '1.5rem' }}>
                                    <h3>{t('resetEmployees')}</h3>
                                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                                        {t('resetEmployeesDesc')}
                                    </p>
                                    <button
                                        className="delete-btn full-width"
                                        onClick={handleResetEmployees}
                                        style={{ backgroundColor: '#fee2e2', color: '#ef4444', padding: '0.75rem', width: '100%', justifyContent: 'center' }}
                                    >
                                        <Users size={18} /> {t('btnResetEmployees')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Photo Error Modal */}
            {photoError && (
                <div className="modal-overlay">
                    <div className="modal pro-modal" style={{ maxWidth: '450px' }}>
                        <div className="modal-header">
                            <div className="modal-icon" style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}>
                                <AlertTriangle size={24} />
                            </div>
                            <div>
                                <h2>{photoError.title}</h2>
                                <p className="modal-subtitle">{photoError.message}</p>
                            </div>
                            <button className="close-btn" onClick={() => setPhotoError(null)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div style={{ padding: '1.5rem' }}>
                            <h4 style={{ marginBottom: '1rem', color: 'var(--text-color)' }}>📋 Formats acceptés :</h4>
                            <ul style={{
                                listStyle: 'none',
                                padding: 0,
                                margin: 0,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.5rem'
                            }}>
                                {photoError.requirements.map((req, i) => (
                                    <li key={i} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        padding: '0.75rem 1rem',
                                        background: 'var(--hover-bg)',
                                        borderRadius: '8px',
                                        color: 'var(--text-color)'
                                    }}>
                                        <span style={{
                                            width: '8px',
                                            height: '8px',
                                            borderRadius: '50%',
                                            background: 'var(--primary-color)'
                                        }} />
                                        {req}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="modal-actions" style={{ padding: '0 1.5rem 1.5rem' }}>
                            <button className="submit-btn pro-submit" onClick={() => setPhotoError(null)}>
                                Compris
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Generic Confirm Modal */}
            <ConfirmModal
                isOpen={!!confirmModal}
                onClose={() => setConfirmModal(null)}
                onConfirm={confirmModal?.onConfirm}
                title={confirmModal?.title || 'Confirmation'}
                message={confirmModal?.message || ''}
                confirmText={confirmModal?.confirmText || 'Confirmer'}
                cancelText={confirmModal?.cancelText || 'Annuler'}
                type={confirmModal?.type || 'warning'}
                isDangerous={confirmModal?.type === 'danger'}
            />

            {/* Toast Notification */}
            {toast && (
                <div style={{
                    position: 'fixed',
                    bottom: '2rem',
                    right: '2rem',
                    padding: '1rem 1.5rem',
                    borderRadius: '12px',
                    background: toast.type === 'success' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' :
                        toast.type === 'error' ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' :
                            'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    boxShadow: toast.type === 'success'
                        ? '0 0 30px rgba(16, 185, 129, 0.4), 0 0 60px rgba(16, 185, 129, 0.2)'
                        : toast.type === 'error'
                            ? '0 0 30px rgba(239, 68, 68, 0.4), 0 0 60px rgba(239, 68, 68, 0.2)'
                            : '0 0 30px rgba(59, 130, 246, 0.4), 0 0 60px rgba(59, 130, 246, 0.2)',
                    animation: 'slideUp 0.3s ease, toastGlow 3s ease-in-out infinite alternate',
                    zIndex: 10000,
                    fontWeight: 500
                }}>
                    {toast.message}
                </div>
            )}

            {/* CSV Import Modal */}
            <CSVImportModal
                isOpen={showCSVImport}
                onClose={() => setShowCSVImport(false)}
                onImport={async (rows) => {
                    const res = await axios.post('/api/employees/import', { data: rows });
                    await fetchEmployees();
                    showToast(`${res.data.imported} employés importés !`, 'success');
                }}
                entityType="employees"
                requiredColumns={['name', 'email', 'department']}
                sampleData="Jean Dupont,jean@example.com,IT"
            />
            <style>{`
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes toastGlow {
                    0% { box-shadow: 0 0 30px rgba(59, 130, 246, 0.4), 0 0 60px rgba(139, 92, 246, 0.2); }
                    100% { box-shadow: 0 0 50px rgba(139, 92, 246, 0.5), 0 0 90px rgba(59, 130, 246, 0.3); }
                }
            `}</style>
        </div>
    );
}
