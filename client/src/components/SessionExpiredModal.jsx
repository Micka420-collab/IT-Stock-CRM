import React from 'react';
import { Clock, LogOut } from 'lucide-react';

const SessionExpiredModal = ({ onReconnect }) => {
    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            animation: 'fadeIn 0.5s ease-out'
        }}>
            <div style={{
                position: 'relative',
                background: 'rgba(15, 23, 42, 0.8)',
                borderRadius: '30px',
                padding: '3rem',
                maxWidth: '480px',
                width: '90%',
                textAlign: 'center',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 0 80px rgba(59, 130, 246, 0.2), inset 0 0 20px rgba(59, 130, 246, 0.05)',
                animation: 'modalSlideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                overflow: 'hidden'
            }}>
                {/* Background Glow Effects */}
                <div style={{
                    position: 'absolute',
                    top: '-50%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '300px',
                    height: '300px',
                    background: 'radial-gradient(circle, rgba(59, 130, 246, 0.4) 0%, transparent 70%)',
                    filter: 'blur(40px)',
                    zIndex: 0,
                    animation: 'pulseGlow 4s infinite alternate'
                }} />

                <div style={{ position: 'relative', zIndex: 1 }}>
                    {/* Animated Icon */}
                    <div style={{
                        width: '100px',
                        height: '100px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 2rem',
                        border: '2px solid rgba(59, 130, 246, 0.3)',
                        boxShadow: '0 0 30px rgba(59, 130, 246, 0.3), inset 0 0 20px rgba(59, 130, 246, 0.1)',
                        animation: 'float 3s ease-in-out infinite'
                    }}>
                        <Clock size={48} color="#60a5fa" style={{ filter: 'drop-shadow(0 0 10px rgba(96, 165, 250, 0.5))' }} />
                    </div>

                    {/* Title */}
                    <h2 style={{
                        color: '#fff',
                        fontSize: '2rem',
                        fontWeight: 800,
                        marginBottom: '1rem',
                        letterSpacing: '-0.5px',
                        background: 'linear-gradient(to right, #fff, #93c5fd)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        textShadow: '0 0 30px rgba(59, 130, 246, 0.3)'
                    }}>
                        Session Expirée
                    </h2>

                    {/* Description */}
                    <p style={{
                        color: '#94a3b8',
                        fontSize: '1.1rem',
                        lineHeight: 1.6,
                        marginBottom: '2.5rem'
                    }}>
                        Pour votre sécurité, vous avez été déconnecté après une période d'inactivité.
                    </p>

                    {/* Action Button */}
                    <button
                        onClick={onReconnect}
                        style={{
                            background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                            border: 'none',
                            color: 'white',
                            padding: '1.2rem 2.5rem',
                            borderRadius: '16px',
                            fontSize: '1.1rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.8rem',
                            width: '100%',
                            boxShadow: '0 10px 30px -10px rgba(37, 99, 235, 0.5)',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                            e.currentTarget.style.boxShadow = '0 20px 40px -10px rgba(37, 99, 235, 0.6)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0) scale(1)';
                            e.currentTarget.style.boxShadow = '0 10px 30px -10px rgba(37, 99, 235, 0.5)';
                        }}
                    >
                        <LogOut size={22} />
                        Se reconnecter maintenant

                        {/* Shimmer Effect on Button */}
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: '-100%',
                            width: '100%',
                            height: '100%',
                            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                            animation: 'shimmer 2.5s infinite'
                        }} />
                    </button>
                </div>

                {/* Inline Styles for Animations */}
                <style>{`
                    @keyframes fadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                    @keyframes modalSlideUp {
                        from { opacity: 0; transform: translateY(40px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    @keyframes float {
                        0%, 100% { transform: translateY(0); }
                        50% { transform: translateY(-10px); }
                    }
                    @keyframes pulseGlow {
                        0% { opacity: 0.5; transform: translateX(-50%) scale(1); }
                        100% { opacity: 0.8; transform: translateX(-50%) scale(1.2); }
                    }
                    @keyframes shimmer {
                        0% { left: -100%; }
                        100% { left: 200%; }
                    }
                `}</style>
            </div>
        </div>
    );
};

export default SessionExpiredModal;
