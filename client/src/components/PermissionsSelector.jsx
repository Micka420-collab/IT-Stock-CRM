import { useState } from 'react';
import { CheckSquare, Square, Sparkles, ChevronDown, ChevronUp, HelpCircle, X } from 'lucide-react';

export const PERMISSIONS = [
    // Inventaire
    { id: 'inventory_view', label: 'Voir', group: 'Inventaire', desc: 'Consulter la liste des produits' },
    { id: 'inventory_add', label: 'Ajouter', group: 'Inventaire', desc: 'Créer de nouveaux produits' },
    { id: 'inventory_edit', label: 'Modifier', group: 'Inventaire', desc: 'Éditer le stock et les infos' },
    { id: 'inventory_delete', label: 'Supprimer', group: 'Inventaire', desc: 'Supprimer des produits' },
    { id: 'inventory_export', label: 'Exporter', group: 'Inventaire', desc: 'Télécharger en CSV/PDF' },
    // Téléphones
    { id: 'phones_view', label: 'Voir', group: 'Téléphones', desc: 'Consulter la liste des téléphones' },
    { id: 'phones_add', label: 'Ajouter', group: 'Téléphones', desc: 'Ajouter des téléphones' },
    { id: 'phones_edit', label: 'Modifier', group: 'Téléphones', desc: 'Modifier les informations' },
    { id: 'phones_delete', label: 'Supprimer', group: 'Téléphones', desc: 'Supprimer des téléphones' },
    { id: 'phones_export', label: 'Import/Export', group: 'Téléphones', desc: 'Importer et exporter CSV' },
    // Employés
    { id: 'employees_view', label: 'Voir', group: 'Employés', desc: 'Consulter la liste des employés' },
    { id: 'employees_add', label: 'Ajouter', group: 'Employés', desc: 'Créer des fiches employés' },
    { id: 'employees_edit', label: 'Modifier', group: 'Employés', desc: 'Éditer les informations' },
    { id: 'employees_delete', label: 'Supprimer', group: 'Employés', desc: 'Supprimer des employés' },
    { id: 'employees_assign', label: 'Assigner', group: 'Employés', desc: 'Attribuer du matériel' },
    // Prêts PC
    { id: 'loans_view', label: 'Voir', group: 'Prêts', desc: 'Consulter les prêts en cours' },
    { id: 'loans_create', label: 'Créer', group: 'Prêts', desc: 'Prêter un PC à un employé' },
    { id: 'loans_return', label: 'Retour', group: 'Prêts', desc: 'Enregistrer le retour d\'un PC' },
    { id: 'loans_manage', label: 'Gérer', group: 'Prêts', desc: 'Modifier/supprimer tous les prêts' },
    { id: 'loans_reserve', label: 'Réserver', group: 'Prêts', desc: 'Réserver un PC à l\'avance' },
    { id: 'loans_history', label: 'Historique', group: 'Prêts', desc: 'Voir l\'historique complet' },
    // Catégories & Notes
    { id: 'categories_view', label: 'Voir', group: 'Catégories', desc: 'Consulter les catégories' },
    { id: 'categories_manage', label: 'Gérer', group: 'Catégories', desc: 'Créer/modifier/supprimer' },
    { id: 'notes_view', label: 'Voir', group: 'Notes', desc: 'Lire les notes' },
    { id: 'notes_create', label: 'Créer', group: 'Notes', desc: 'Ajouter des notes' },
    { id: 'notes_delete', label: 'Supprimer', group: 'Notes', desc: 'Supprimer des notes' },
    // Admin
    { id: 'settings_access', label: 'Paramètres', group: 'Admin', desc: 'Accéder aux paramètres' },
    { id: 'users_manage', label: 'Utilisateurs', group: 'Admin', desc: 'Gérer les comptes utilisateurs' },
    { id: 'audit_view', label: 'Audit', group: 'Admin', desc: 'Voir les logs de connexion' },
    { id: 'security_manage', label: 'Sécurité', group: 'Admin', desc: 'Gérer IPs bloquées' },
    { id: 'dashboard_view', label: 'Dashboard', group: 'Admin', desc: 'Voir le tableau de bord' }
];

const GROUP_CONFIG = {
    'Inventaire': { icon: '📦', color: '#3b82f6' },
    'Téléphones': { icon: '📱', color: '#06b6d4' },
    'Employés': { icon: '👥', color: '#10b981' },
    'Prêts': { icon: '💻', color: '#f59e0b' },
    'Catégories': { icon: '🏷️', color: '#8b5cf6' },
    'Notes': { icon: '📝', color: '#ec4899' },
    'Admin': { icon: '🔐', color: '#ef4444' }
};

export const ROLE_PRESETS = [
    {
        id: 'viewer',
        name: '👁️ Lecteur',
        description: 'Peut uniquement consulter les données sans rien modifier',
        details: 'Voir inventaire • Voir téléphones • Voir prêts • Dashboard',
        color: '#3b82f6',
        permissions: ['inventory_view', 'phones_view', 'employees_view', 'loans_view', 'categories_view', 'notes_view', 'dashboard_view']
    },
    {
        id: 'hotliner',
        name: '🎧 Hotliner',
        description: 'Support utilisateur : gère les prêts PC et téléphones',
        details: 'Prêter/Retourner PC • Gérer téléphones • Réserver • Notes',
        color: '#10b981',
        permissions: ['inventory_view', 'inventory_export', 'phones_view', 'phones_add', 'phones_edit', 'employees_view', 'employees_assign', 'loans_view', 'loans_create', 'loans_return', 'loans_reserve', 'loans_history', 'categories_view', 'notes_view', 'notes_create', 'dashboard_view']
    },
    {
        id: 'technician',
        name: '🔧 Technicien',
        description: 'Gère le matériel : ajoute des produits, gère les prêts et téléphones',
        details: 'Tout Hotliner + Ajouter/Modifier stock • Import/Export téléphones',
        color: '#f59e0b',
        permissions: ['inventory_view', 'inventory_add', 'inventory_edit', 'inventory_export', 'phones_view', 'phones_add', 'phones_edit', 'phones_export', 'employees_view', 'employees_assign', 'loans_view', 'loans_create', 'loans_return', 'loans_manage', 'loans_reserve', 'loans_history', 'categories_view', 'categories_manage', 'notes_view', 'notes_create', 'notes_delete', 'dashboard_view']
    },
    {
        id: 'stock_manager',
        name: '📦 Gestionnaire',
        description: 'Contrôle total sur l\'inventaire, téléphones et employés',
        details: 'Tout Technicien + Supprimer stock/téléphones • Ajouter employés',
        color: '#8b5cf6',
        permissions: ['inventory_view', 'inventory_add', 'inventory_edit', 'inventory_delete', 'inventory_export', 'phones_view', 'phones_add', 'phones_edit', 'phones_delete', 'phones_export', 'employees_view', 'employees_add', 'employees_edit', 'employees_assign', 'loans_view', 'loans_history', 'categories_view', 'categories_manage', 'notes_view', 'notes_create', 'settings_access', 'dashboard_view']
    },
    {
        id: 'team_lead',
        name: '👑 Chef d\'équipe',
        description: 'Supervise l\'équipe : voit les audits, gère tout sauf sécurité',
        details: 'Tout Gestionnaire + Supprimer employés • Logs d\'audit',
        color: '#ec4899',
        permissions: ['inventory_view', 'inventory_add', 'inventory_edit', 'inventory_export', 'phones_view', 'phones_add', 'phones_edit', 'phones_delete', 'phones_export', 'employees_view', 'employees_add', 'employees_edit', 'employees_delete', 'employees_assign', 'loans_view', 'loans_create', 'loans_return', 'loans_manage', 'loans_reserve', 'loans_history', 'categories_view', 'categories_manage', 'notes_view', 'notes_create', 'notes_delete', 'settings_access', 'audit_view', 'dashboard_view']
    },
    {
        id: 'full_access',
        name: '🔓 Accès Complet',
        description: 'TOUTES les permissions - équivalent administrateur',
        details: 'Tout + Gérer sécurité • Gérer utilisateurs',
        color: '#ef4444',
        permissions: PERMISSIONS.map(p => p.id)
    }
];

export default function PermissionsSelector({ selectedPermissions = [], onChange, disabled, compact = false }) {
    const [expanded, setExpanded] = useState(!compact);
    const [selectedRole, setSelectedRole] = useState(null); // Role preview before applying
    const [showRoleInfo, setShowRoleInfo] = useState(false); // Show role info popup

    const groups = PERMISSIONS.reduce((acc, perm) => {
        if (!acc[perm.group]) acc[perm.group] = [];
        acc[perm.group].push(perm);
        return acc;
    }, {});

    const togglePermission = (permId) => {
        if (disabled) return;
        const newPerms = selectedPermissions.includes(permId)
            ? selectedPermissions.filter(id => id !== permId)
            : [...selectedPermissions, permId];
        onChange(newPerms);
        setSelectedRole(null); // Clear role selection when manually editing
    };

    const toggleGroup = (groupName) => {
        if (disabled) return;
        const groupPerms = groups[groupName].map(p => p.id);
        const allSelected = groupPerms.every(id => selectedPermissions.includes(id));
        const newPerms = allSelected
            ? selectedPermissions.filter(id => !groupPerms.includes(id))
            : [...selectedPermissions, ...groupPerms.filter(id => !selectedPermissions.includes(id))];
        onChange(newPerms);
        setSelectedRole(null); // Clear role selection when manually editing
    };

    const selectRole = (role) => {
        if (disabled) return;
        setSelectedRole(role);
    };

    const applySelectedRole = () => {
        if (disabled || !selectedRole) return;
        onChange([...selectedRole.permissions]);
        setSelectedRole(null);
    };

    const cancelRoleSelection = () => {
        setSelectedRole(null);
    };

    const getActivePreset = () => {
        return ROLE_PRESETS.find(r =>
            r.permissions.length === selectedPermissions.length &&
            r.permissions.every(p => selectedPermissions.includes(p))
        );
    };

    const activePreset = getActivePreset();

    return (
        <>
            <div style={{
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, var(--input-bg) 0%, var(--card-bg) 100%)',
                overflow: 'hidden',
                boxShadow: activePreset ? `0 0 20px ${activePreset.color}15` : 'none',
                transition: 'box-shadow 0.3s ease'
            }}>
                <style>{`
                .role-card { transition: all 0.2s ease; cursor: pointer; }
                .role-card:hover:not(.disabled) { transform: translateY(-2px); }
                .perm-chip { transition: all 0.15s ease; user-select: none; }
                .perm-chip:hover { transform: scale(1.02); }
            `}</style>

                {/* Role cards selector */}
                <div style={{
                    padding: '0.75rem',
                    borderBottom: '1px solid var(--border-color)',
                    background: 'var(--hover-bg)'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        marginBottom: '0.75rem'
                    }}>
                        <Sparkles size={16} style={{ color: activePreset?.color || 'var(--primary-color)' }} />
                        <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-color)' }}>
                            Choisir un rôle prédéfini :
                        </span>
                        <span style={{
                            fontSize: '0.7rem',
                            color: 'var(--text-secondary)',
                            background: 'var(--card-bg)',
                            padding: '2px 8px',
                            borderRadius: '10px'
                        }}>
                            {selectedPermissions.length}/{PERMISSIONS.length} permissions
                        </span>
                        <button
                            onClick={() => setShowRoleInfo(true)}
                            style={{
                                background: 'var(--card-bg)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '6px',
                                padding: '4px 8px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                color: 'var(--primary-color)',
                                fontSize: '0.7rem'
                            }}
                            title="En savoir plus sur les rôles"
                        >
                            <HelpCircle size={14} />
                            Aide
                        </button>
                        <button
                            onClick={() => setExpanded(!expanded)}
                            style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--text-secondary)',
                                padding: '2px',
                                display: 'flex',
                                alignItems: 'center'
                            }}
                            title={expanded ? 'Masquer les détails' : 'Afficher les détails'}
                        >
                            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                    </div>

                    {/* Role cards grid */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                        gap: '0.5rem'
                    }}>
                        {ROLE_PRESETS.map(role => {
                            const isActive = activePreset?.id === role.id;
                            const isSelected = selectedRole?.id === role.id;
                            return (
                                <div
                                    key={role.id}
                                    onClick={() => !disabled && selectRole(role)}
                                    className={`role-card ${disabled ? 'disabled' : ''}`}
                                    style={{
                                        padding: '0.6rem 0.8rem',
                                        borderRadius: '8px',
                                        border: `2px solid ${isSelected ? role.color : isActive ? `${role.color}80` : 'var(--border-color)'}`,
                                        background: isSelected ? `${role.color}25` : isActive ? `${role.color}10` : 'var(--card-bg)',
                                        boxShadow: isSelected ? `0 0 20px ${role.color}40` : isActive ? `0 0 10px ${role.color}15` : 'none',
                                        opacity: disabled ? 0.5 : 1,
                                        transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.4rem',
                                        marginBottom: '0.3rem'
                                    }}>
                                        <span style={{
                                            fontWeight: 600,
                                            fontSize: '0.8rem',
                                            color: isSelected || isActive ? role.color : 'var(--text-color)'
                                        }}>
                                            {role.name}
                                        </span>
                                        {isActive && !isSelected && (
                                            <span style={{ marginLeft: 'auto', fontSize: '0.6rem', color: role.color, opacity: 0.7 }}>actuel</span>
                                        )}
                                        {isSelected && (
                                            <CheckSquare size={14} style={{ marginLeft: 'auto', color: role.color }} />
                                        )}
                                    </div>
                                    <div style={{
                                        fontSize: '0.65rem',
                                        color: 'var(--text-secondary)',
                                        lineHeight: 1.3
                                    }}>
                                        {role.description}
                                    </div>
                                    <div style={{
                                        fontSize: '0.6rem',
                                        color: isSelected || isActive ? role.color : 'var(--text-secondary)',
                                        marginTop: '0.3rem',
                                        opacity: 0.8,
                                        fontStyle: 'italic'
                                    }}>
                                        {role.details}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Apply/Cancel confirmation bar */}
                    {selectedRole && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            marginTop: '0.75rem',
                            padding: '0.6rem 0.8rem',
                            background: `${selectedRole.color}15`,
                            borderRadius: '8px',
                            border: `1px solid ${selectedRole.color}40`
                        }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-color)' }}>
                                Appliquer le rôle <strong style={{ color: selectedRole.color }}>{selectedRole.name}</strong> ?
                            </span>
                            <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
                                <button
                                    onClick={cancelRoleSelection}
                                    style={{
                                        padding: '5px 12px',
                                        fontSize: '0.75rem',
                                        borderRadius: '6px',
                                        border: '1px solid var(--border-color)',
                                        background: 'var(--card-bg)',
                                        color: 'var(--text-color)',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={applySelectedRole}
                                    style={{
                                        padding: '5px 12px',
                                        fontSize: '0.75rem',
                                        borderRadius: '6px',
                                        border: 'none',
                                        background: selectedRole.color,
                                        color: 'white',
                                        cursor: 'pointer',
                                        fontWeight: 600,
                                        boxShadow: `0 0 10px ${selectedRole.color}50`
                                    }}
                                >
                                    ✓ Appliquer
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Permissions grid - collapsible */}
                {expanded && (
                    <div style={{ padding: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                        {Object.entries(groups).map(([group, perms]) => {
                            const config = GROUP_CONFIG[group];
                            const groupPerms = perms.map(p => p.id);
                            const selectedCount = groupPerms.filter(id => selectedPermissions.includes(id)).length;
                            const allSelected = selectedCount === perms.length;

                            return (
                                <div key={group} style={{
                                    flex: '1 1 auto',
                                    minWidth: '180px',
                                    background: 'var(--card-bg)',
                                    borderRadius: '8px',
                                    padding: '0.5rem',
                                    border: `1px solid ${allSelected ? config.color : 'var(--border-color)'}`,
                                    boxShadow: allSelected ? `0 0 12px ${config.color}20` : 'none',
                                    transition: 'all 0.2s ease'
                                }}>
                                    {/* Group header */}
                                    <div
                                        onClick={() => toggleGroup(group)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.4rem',
                                            cursor: disabled ? 'default' : 'pointer',
                                            marginBottom: '0.4rem',
                                            paddingBottom: '0.4rem',
                                            borderBottom: `1px solid var(--border-color)`
                                        }}
                                    >
                                        <span style={{ fontSize: '0.9rem' }}>{config.icon}</span>
                                        <span style={{ fontWeight: 600, fontSize: '0.75rem', color: config.color }}>{group}</span>
                                        <span style={{
                                            marginLeft: 'auto',
                                            fontSize: '0.65rem',
                                            background: allSelected ? config.color : 'var(--hover-bg)',
                                            color: allSelected ? 'white' : 'var(--text-secondary)',
                                            padding: '1px 6px',
                                            borderRadius: '8px'
                                        }}>
                                            {selectedCount}/{perms.length}
                                        </span>
                                    </div>

                                    {/* Permission chips */}
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                        {perms.map(perm => {
                                            const isSelected = selectedPermissions.includes(perm.id);
                                            return (
                                                <div
                                                    key={perm.id}
                                                    onClick={() => togglePermission(perm.id)}
                                                    className="perm-chip"
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '3px',
                                                        padding: '3px 8px',
                                                        borderRadius: '5px',
                                                        fontSize: '0.7rem',
                                                        cursor: disabled ? 'default' : 'pointer',
                                                        background: isSelected ? `${config.color}15` : 'var(--hover-bg)',
                                                        color: isSelected ? config.color : 'var(--text-secondary)',
                                                        border: `1px solid ${isSelected ? `${config.color}40` : 'transparent'}`,
                                                        fontWeight: isSelected ? 500 : 400
                                                    }}
                                                >
                                                    {isSelected ? <CheckSquare size={11} /> : <Square size={11} style={{ opacity: 0.4 }} />}
                                                    {perm.label}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Role Info Popup Modal */}
            {
                showRoleInfo && (
                    <div
                        onClick={() => setShowRoleInfo(false)}
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(0, 0, 0, 0.7)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 9999,
                            backdropFilter: 'blur(4px)'
                        }}
                    >
                        <div
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                background: 'var(--card-bg)',
                                borderRadius: '16px',
                                padding: '1.5rem',
                                maxWidth: '800px',
                                maxHeight: '85vh',
                                overflow: 'auto',
                                margin: '1rem',
                                boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                                border: '1px solid var(--border-color)'
                            }}
                        >
                            {/* Header */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '1.5rem',
                                paddingBottom: '1rem',
                                borderBottom: '1px solid var(--border-color)'
                            }}>
                                <h2 style={{ margin: 0, color: 'var(--text-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <HelpCircle size={24} style={{ color: 'var(--primary-color)' }} />
                                    Guide des Rôles et Permissions
                                </h2>
                                <button
                                    onClick={() => setShowRoleInfo(false)}
                                    style={{
                                        background: 'var(--hover-bg)',
                                        border: 'none',
                                        borderRadius: '8px',
                                        padding: '8px',
                                        cursor: 'pointer',
                                        color: 'var(--text-color)'
                                    }}
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Intro text */}
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                                Chaque rôle prédéfini contient un ensemble de permissions adaptées à un type d'utilisateur.
                                Cliquez sur un rôle pour voir ses permissions en détail.
                            </p>

                            {/* Roles Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1rem' }}>
                                {ROLE_PRESETS.map(role => (
                                    <div
                                        key={role.id}
                                        style={{
                                            background: `${role.color}10`,
                                            border: `2px solid ${role.color}40`,
                                            borderRadius: '12px',
                                            padding: '1rem',
                                            boxShadow: `0 0 20px ${role.color}15`
                                        }}
                                    >
                                        <h3 style={{
                                            margin: '0 0 0.5rem 0',
                                            color: role.color,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem'
                                        }}>
                                            {role.name}
                                            <span style={{
                                                fontSize: '0.7rem',
                                                background: role.color,
                                                color: 'white',
                                                padding: '2px 8px',
                                                borderRadius: '10px',
                                                fontWeight: 500
                                            }}>
                                                {role.permissions.length} permissions
                                            </span>
                                        </h3>
                                        <p style={{
                                            margin: '0 0 0.75rem 0',
                                            color: 'var(--text-secondary)',
                                            fontSize: '0.85rem',
                                            fontWeight: 500
                                        }}>
                                            {role.description}
                                        </p>

                                        {/* Permission details by group */}
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                            {Object.entries(GROUP_CONFIG).map(([groupName, config]) => {
                                                const groupPerms = PERMISSIONS.filter(p => p.group === groupName);
                                                const activeInRole = groupPerms.filter(p => role.permissions.includes(p.id));
                                                if (activeInRole.length === 0) return null;

                                                return (
                                                    <div key={groupName} style={{ width: '100%', marginBottom: '0.4rem' }}>
                                                        <div style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.3rem',
                                                            fontSize: '0.75rem',
                                                            color: config.color,
                                                            fontWeight: 600,
                                                            marginBottom: '0.2rem'
                                                        }}>
                                                            <span>{config.icon}</span> {groupName}
                                                        </div>
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginLeft: '1.2rem' }}>
                                                            {activeInRole.map(perm => (
                                                                <span key={perm.id} style={{
                                                                    fontSize: '0.65rem',
                                                                    background: 'var(--card-bg)',
                                                                    borderRadius: '4px',
                                                                    padding: '2px 6px',
                                                                    color: 'var(--text-secondary)'
                                                                }} title={perm.desc}>
                                                                    {perm.label}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Footer with close button */}
                            <div style={{
                                marginTop: '1.5rem',
                                paddingTop: '1rem',
                                borderTop: '1px solid var(--border-color)',
                                display: 'flex',
                                justifyContent: 'flex-end'
                            }}>
                                <button
                                    onClick={() => setShowRoleInfo(false)}
                                    style={{
                                        background: 'var(--primary-color)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        padding: '10px 20px',
                                        cursor: 'pointer',
                                        fontWeight: 600
                                    }}
                                >
                                    Compris !
                                </button>
                            </div>
                        </div>
                    </div>
                )}
        </>
    );
}
