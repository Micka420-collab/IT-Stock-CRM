import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children, footer, size = 'md' }) {
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') onClose();
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const sizeClasses = {
        sm: 'modal-sm',
        md: 'modal-md',
        lg: 'modal-lg',
        xl: 'modal-xl'
    };

    return (
        <div className="modal-overlay" onClick={onClose} style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem'
        }}>
            <div
                className={`modal-container ${sizeClasses[size]}`}
                onClick={e => e.stopPropagation()}
                style={{
                    background: 'var(--card-bg)',
                    borderRadius: '20px',
                    boxShadow: '0 0 60px rgba(59, 130, 246, 0.3), 0 0 120px rgba(139, 92, 246, 0.2)',
                    width: 'auto',
                    minWidth: size === 'sm' ? '320px' : '480px',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    maxHeight: '85vh',
                    margin: '1rem',
                    position: 'relative',
                    animation: 'modalSlideIn 0.3s ease-out, modalGlow 3s ease-in-out infinite alternate',
                    overflow: 'hidden',
                    zIndex: 10001
                }}
            >
                {/* Animated Header */}
                <div className="modal-header" style={{
                    padding: '1.5rem',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #3b82f6 100%)',
                    backgroundSize: '200% 200%',
                    animation: 'gradientShift 4s ease infinite',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    {/* Shimmer effect */}
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: '-100%',
                        width: '100%',
                        height: '100%',
                        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                        animation: 'shimmer 3s infinite'
                    }} />

                    <h3 style={{
                        margin: 0,
                        fontSize: '1.25rem',
                        color: 'white',
                        textShadow: '0 2px 10px rgba(0,0,0,0.3)',
                        position: 'relative',
                        zIndex: 1
                    }}>{title}</h3>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'rgba(255,255,255,0.2)',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'white',
                            padding: '0.5rem',
                            display: 'flex',
                            borderRadius: '50%',
                            width: '36px',
                            height: '36px',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s',
                            position: 'relative',
                            zIndex: 1
                        }}
                        onMouseOver={e => {
                            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.3)';
                            e.currentTarget.style.transform = 'scale(1.1)';
                        }}
                        onMouseOut={e => {
                            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)';
                            e.currentTarget.style.transform = 'scale(1)';
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="modal-body" style={{
                    padding: '1.5rem',
                    overflowY: 'auto',
                    background: 'var(--card-bg)',
                    color: 'var(--text-color)'
                }}>
                    {children}
                </div>

                {footer && (
                    <div className="modal-footer" style={{
                        padding: '1.5rem',
                        borderTop: '1px solid var(--border-color)',
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '1rem',
                        background: 'var(--card-bg)'
                    }}>
                        {footer}
                    </div>
                )}

                {/* CSS Animations */}
                <style>{`
                    @keyframes modalSlideIn {
                        from {
                            opacity: 0;
                            transform: scale(0.9) translateY(20px);
                        }
                        to {
                            opacity: 1;
                            transform: scale(1) translateY(0);
                        }
                    }
                    @keyframes modalGlow {
                        0% { box-shadow: 0 0 60px rgba(59, 130, 246, 0.3), 0 0 120px rgba(139, 92, 246, 0.2); }
                        100% { box-shadow: 0 0 80px rgba(139, 92, 246, 0.4), 0 0 140px rgba(59, 130, 246, 0.3); }
                    }
                    @keyframes gradientShift {
                        0% { background-position: 0% 50%; }
                        50% { background-position: 100% 50%; }
                        100% { background-position: 0% 50%; }
                    }
                    @keyframes shimmer {
                        0% { left: -100%; }
                        100% { left: 200%; }
                    }
                `}</style>
            </div>
        </div>
    );
}

