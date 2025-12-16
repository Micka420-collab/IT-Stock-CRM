import React from 'react';
import Modal from './Modal';
import { AlertTriangle, CheckCircle, HelpCircle } from 'lucide-react';

export default function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirmer',
    cancelText = 'Annuler',
    isDangerous = false,
    type = 'warning' // 'warning', 'info', 'danger'
}) {
    const getIcon = () => {
        switch (type) {
            case 'danger': return <AlertTriangle size={48} color="#ef4444" />;
            case 'success': return <CheckCircle size={48} color="#10b981" />;
            default: return <HelpCircle size={48} color="var(--primary-color)" />;
        }
    };

    const confirmBtnClass = isDangerous ? 'primary-btn danger' : 'primary-btn';

    // Inline minimal styles for buttons since we don't have global classes for everything yet
    const btnStyle = {
        padding: '0.75rem 1.5rem',
        borderRadius: '8px',
        fontWeight: 600,
        cursor: 'pointer',
        border: 'none',
        fontSize: '0.95rem',
        transition: 'all 0.2s'
    };

    const cancelBtnStyle = {
        ...btnStyle,
        background: 'var(--hover-bg)',
        border: '1px solid var(--border-color)',
        color: 'var(--text-color)'
    };

    const getButtonStyles = () => {
        const base = { ...btnStyle, color: 'white', border: 'none' };

        switch (type) {
            case 'danger':
                return { ...base, background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)', boxShadow: '0 4px 15px rgba(220, 38, 38, 0.3)' };
            case 'success':
                return { ...base, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)' };
            case 'info':
                return { ...base, background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)' };
            case 'warning':
                return { ...base, background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)' };
            default:
                return { ...base, background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)', boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)' };
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            size="sm"
            footer={
                <>
                    {cancelText && (
                        <button onClick={onClose} style={cancelBtnStyle}>{cancelText}</button>
                    )}
                    <button onClick={onConfirm} style={getButtonStyles()}>{confirmText}</button>
                </>
            }
        >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '0.75rem', padding: '0.5rem 0' }}>
                <div style={{
                    padding: '0.75rem',
                    borderRadius: '50%',
                    background: isDangerous ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                    marginBottom: '0.25rem'
                }}>
                    {getIcon()}
                </div>
                <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-color)' }}>{title}</h4>
                <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem', lineHeight: 1.4, maxWidth: '280px' }}>
                    {message}
                </p>
            </div>
        </Modal>
    );
}

