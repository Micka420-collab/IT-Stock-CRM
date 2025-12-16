import React from 'react';
import { HelpCircle } from 'lucide-react';
import { useTutorial } from '../context/TutorialContext';

const TutorialButton = ({ tutorialKey, style = {}, onBeforeStart }) => {
    const { startTutorial } = useTutorial();

    const handleClick = () => {
        if (onBeforeStart) onBeforeStart();
        setTimeout(() => startTutorial(tutorialKey), 300);
    };

    return (
        <>
            <button
                onClick={handleClick}
                className="tutorial-btn"
                style={{
                    position: 'fixed',
                    bottom: '2rem',
                    right: '2rem',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '56px',
                    height: '56px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 0 30px rgba(59, 130, 246, 0.5), 0 0 60px rgba(139, 92, 246, 0.3)',
                    zIndex: 90,
                    transition: 'all 0.3s ease',
                    animation: 'tutorialBtnPulse 2s ease-in-out infinite, tutorialBtnGlow 3s ease-in-out infinite alternate',
                    ...style
                }}
                title="Tutoriel - Cliquez pour apprendre"
                onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.15) rotate(10deg)';
                    e.currentTarget.style.boxShadow = '0 0 50px rgba(59, 130, 246, 0.7), 0 0 100px rgba(139, 92, 246, 0.5)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 0 30px rgba(59, 130, 246, 0.5), 0 0 60px rgba(139, 92, 246, 0.3)';
                }}
            >
                <HelpCircle size={28} />
            </button>

            {/* Animations CSS */}
            <style>{`
                @keyframes tutorialBtnPulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                }
                @keyframes tutorialBtnGlow {
                    0% { 
                        box-shadow: 0 0 30px rgba(59, 130, 246, 0.5), 0 0 60px rgba(139, 92, 246, 0.3);
                    }
                    100% { 
                        box-shadow: 0 0 50px rgba(139, 92, 246, 0.6), 0 0 80px rgba(59, 130, 246, 0.4);
                    }
                }
            `}</style>
        </>
    );
};

export default TutorialButton;
