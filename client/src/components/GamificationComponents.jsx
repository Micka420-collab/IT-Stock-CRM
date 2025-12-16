import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Trophy, Medal, Star, Award, Lock, CheckCircle, Crown } from 'lucide-react';

const BADGES = [
    { id: 'first_loan', name: 'Premier Prêt', description: 'Effectuer 1 prêt', icon: '🎯', target: 1, type: 'loans' },
    { id: '10_loans', name: 'Agent Actif', description: 'Effectuer 10 prêts', icon: '🥉', target: 10, type: 'loans' },
    { id: '50_loans', name: 'Expert Prêteur', description: 'Effectuer 50 prêts', icon: '🥈', target: 50, type: 'loans' },
    { id: '100_loans', name: 'Légende du Stock', description: 'Effectuer 100 prêts', icon: '🥇', target: 100, type: 'loans' },
    { id: 'first_note', name: 'Observateur', description: 'Ajouter 1 note', icon: '📝', target: 1, type: 'notes' },
    { id: '10_notes', name: 'Scribe', description: 'Ajouter 10 notes', icon: '📜', target: 10, type: 'notes' },
    { id: '50_notes', name: 'Historien', description: 'Ajouter 50 notes', icon: '📚', target: 50, type: 'notes' },
    { id: 'christmas_theme', name: 'Esprit de Noël', description: 'Atteindre 200 XP', icon: '🎄', target: 200, type: 'xp' },
];

export function LeaderboardTable() {
    const [leaders, setLeaders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLeaderboard();
    }, []);

    const fetchLeaderboard = async () => {
        try {
            const res = await axios.get('/api/leaderboard');
            setLeaders(res.data);
        } catch (error) {
            console.error("Failed to fetch leaderboard", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-4 text-center">Chargement du classement...</div>;

    const top3 = leaders.slice(0, 3);
    const rest = leaders.slice(3);

    return (
        <div className="leaderboard-container">
            <div className="leaderboard-header" style={{ marginBottom: '2rem', textAlign: 'center' }}>
                <div style={{ display: 'inline-block', padding: '0.5rem 1rem', background: 'rgba(255, 215, 0, 0.1)', borderRadius: '20px', color: '#FFD700', marginBottom: '0.5rem' }}>
                    <Trophy size={16} style={{ display: 'inline', marginRight: '5px' }} /> Saison 1
                </div>
                <h3>Classement Général</h3>
            </div>

            {/* PODIUM */}
            {top3.length > 0 && (
                <div className="leaderboard-podium">
                    {/* 2nd Place */}
                    {top3[1] && (
                        <div className="podium-place podium-2">
                            <div className="podium-avatar">
                                {top3[1].photo_url ? <img src={top3[1].photo_url} alt={top3[1].name} /> :
                                    <div style={{ width: '100%', height: '100%', background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>{top3[1].name.charAt(0)}</div>}
                            </div>
                            <div className="podium-info">
                                <div className="podium-name">{top3[1].name}</div>
                                <div className="podium-score">{top3[1].score} XP</div>
                            </div>
                            <div className="podium-step">2</div>
                        </div>
                    )}

                    {/* 1st Place */}
                    {top3[0] && (
                        <div className="podium-place podium-1">
                            <Crown className="podium-crown" size={32} />
                            <div className="podium-avatar">
                                {top3[0].photo_url ? <img src={top3[0].photo_url} alt={top3[0].name} /> :
                                    <div style={{ width: '100%', height: '100%', background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>{top3[0].name.charAt(0)}</div>}
                            </div>
                            <div className="podium-info">
                                <div className="podium-name">{top3[0].name}</div>
                                <div className="podium-score">{top3[0].score} XP</div>
                            </div>
                            <div className="podium-step">1</div>
                        </div>
                    )}

                    {/* 3rd Place */}
                    {top3[2] && (
                        <div className="podium-place podium-3">
                            <div className="podium-avatar">
                                {top3[2].photo_url ? <img src={top3[2].photo_url} alt={top3[2].name} /> :
                                    <div style={{ width: '100%', height: '100%', background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>{top3[2].name.charAt(0)}</div>}
                            </div>
                            <div className="podium-info">
                                <div className="podium-name">{top3[2].name}</div>
                                <div className="podium-score">{top3[2].score} XP</div>
                            </div>
                            <div className="podium-step">3</div>
                        </div>
                    )}
                </div>
            )}

            {/* LIST */}
            <div className="leaderboard-list">
                {rest.map((user, index) => (
                    <div key={user.id} className="leaderboard-list-item">
                        <div className="rank-number">{index + 4}</div>
                        <div className="list-avatar">
                            {user.photo_url ? <img src={user.photo_url} alt={user.name} /> : user.name.charAt(0)}
                        </div>
                        <div className="list-info">
                            <div className="list-name">{user.name}</div>
                            <div className="list-role">{user.role}</div>
                        </div>
                        <div className="list-score">{user.score} XP</div>
                    </div>
                ))}
                {leaders.length === 0 && <div style={{ textAlign: 'center', opacity: 0.5 }}>Aucun classement disponible</div>}
            </div>
        </div>
    );
}

export function BadgesGrid() {
    const [stats, setStats] = useState({ loans_count: 0, notes_count: 0 });
    const [unlocked, setUnlocked] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStatus();
    }, []);

    const fetchStatus = async () => {
        try {
            const res = await axios.get('/api/achievements/status');
            setStats(res.data.stats || { loans_count: 0, notes_count: 0, xp: 0 });
            setUnlocked(res.data.unlocked_badges || []);
        } catch (error) {
            console.error("Failed to fetch achievements", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div>Chargement des badges...</div>;

    // Calculate count based on logic, matching the cards
    const unlockedCount = BADGES.filter(badge => {
        let currentVal = 0;
        if (badge.type === 'loans') currentVal = stats.loans_count;
        else if (badge.type === 'notes') currentVal = stats.notes_count;
        else if (badge.type === 'xp') currentVal = stats.xp || 0;
        return unlocked.includes(badge.id) || currentVal >= badge.target;
    }).length;

    return (
        <div className="badges-grid-container">
            <h3 style={{ marginBottom: '1.5rem' }}>Mes Succès ({unlockedCount}/{BADGES.length})</h3>
            <div className="badges-grid">
                {BADGES.map(badge => {
                    let currentVal = 0;
                    if (badge.type === 'loans') currentVal = stats.loans_count;
                    else if (badge.type === 'notes') currentVal = stats.notes_count;
                    else if (badge.type === 'xp') currentVal = stats.xp || 0;
                    const progress = Math.min(100, Math.round((currentVal / badge.target) * 100));
                    const isUnlocked = unlocked.includes(badge.id) || currentVal >= badge.target;

                    return (
                        <div key={badge.id} className={`badge-card ${isUnlocked ? 'unlocked' : 'locked'}`}>
                            {isUnlocked && <div className="badge-status-icon"><CheckCircle size={16} color="#10b981" /></div>}
                            {!isUnlocked && <div className="badge-status-icon"><Lock size={14} color="var(--text-secondary)" /></div>}

                            <div className="badge-icon">{badge.icon}</div>
                            <div className="badge-name">{badge.name}</div>
                            <div className="badge-desc">{badge.description}</div>

                            <div className="badge-progress">
                                <div className="badge-progress-bar" style={{ width: `${progress}%` }}></div>
                            </div>
                            <div style={{ fontSize: '0.7rem', marginTop: '0.5rem', opacity: 0.6, textAlign: 'right' }}>
                                {currentVal} / {badge.target}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
