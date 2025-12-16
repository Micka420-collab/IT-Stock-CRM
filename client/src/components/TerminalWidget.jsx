import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Terminal } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useGamification } from '../context/GamificationContext';
import SnakeGame from './SnakeGame';

const TerminalWidget = () => {
    const [input, setInput] = useState('');
    const [showGame, setShowGame] = useState(false);
    const [output, setOutput] = useState([
        { type: 'info', text: 'CRM_OS v1.0.0 initialized...' },
        { type: 'success', text: 'Welcome, Administrator.' },
        { type: 'info', text: 'Type "help" for available commands.' }
    ]);
    const navigate = useNavigate();
    const { setTheme } = useTheme();
    const { addXp } = useGamification() || { addXp: () => { } };
    const terminalRef = useRef(null);

    useEffect(() => {
        // Scroll to bottom of terminal only, not the page
        if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, [output]);

    const handleCommand = (cmd) => {
        const parts = cmd.trim().toLowerCase().split(' ');
        const command = parts[0];
        const args = parts.slice(1);

        const newOutput = [...output, { type: 'command', text: `> ${cmd}` }];

        switch (command) {
            case 'help':
                newOutput.push(
                    { type: 'info', text: 'Available commands:' },
                    { type: 'info', text: '  status    - Show system status' },
                    { type: 'info', text: '  goto [p]  - Navigate (inv, set, home)' },
                    { type: 'info', text: '  theme [t] - Set theme (neon, vapor, dark)' },
                    { type: 'info', text: '  game      - Launch hidden protocol' },
                    { type: 'info', text: '  xp [amt]  - Add XP (testing)' },
                    { type: 'info', text: '  clear     - Clear terminal' }
                );
                break;
            case 'game':
            case 'snake':
                setShowGame(true);
                newOutput.push({ type: 'success', text: 'Launching SNAKE_PROTOCOL.EXE...' });
                addXp(5, 'Lancement du jeu');
                break;
            case 'clear':
                setOutput([]);
                setInput('');
                return;
            case 'status':
                newOutput.push({ type: 'success', text: 'System Operational. All systems nominal.' });
                addXp(2, 'Vérification système');
                break;
            case 'hello':
                newOutput.push({ type: 'success', text: 'Hello, User! Can I assist you?' });
                break;
            case 'xp':
                // Testing command to add XP
                const amount = parseInt(args[0]) || 10;
                addXp(amount, 'Commande terminal');
                newOutput.push({ type: 'success', text: `+${amount} XP ajouté!` });
                break;
            case 'levelup':
                // Quick level up for testing
                addXp(100, 'Level up test');
                newOutput.push({ type: 'success', text: '+100 XP! Check your level!' });
                break;
            case 'goto':
                if (args[0] === 'inv' || args[0] === 'inventory') {
                    navigate('/inventory');
                    newOutput.push({ type: 'success', text: 'Navigating to Inventory...' });
                    addXp(3, 'Navigation terminal');
                } else if (args[0] === 'set' || args[0] === 'settings') {
                    navigate('/settings');
                    newOutput.push({ type: 'success', text: 'Navigating to Settings...' });
                    addXp(3, 'Navigation terminal');
                } else if (args[0] === 'home' || args[0] === 'dash') {
                    navigate('/');
                    newOutput.push({ type: 'success', text: 'Navigating to Dashboard...' });
                    addXp(3, 'Navigation terminal');
                } else {
                    newOutput.push({ type: 'error', text: 'Unknown destination. Try: inv, set, home' });
                }
                break;
            case 'theme':
                if (args[0]) {
                    setTheme(args[0]);
                    newOutput.push({ type: 'success', text: `Theme set to: ${args[0]}` });
                    addXp(5, 'Changement de thème');
                } else {
                    newOutput.push({ type: 'error', text: 'Usage: theme [name]' });
                }
                break;
            default:
                newOutput.push({ type: 'error', text: `Command not found: ${command}. Type "help".` });
        }

        setOutput(newOutput);
        setInput('');
    };

    return (
        <div className="recent-activity-card widget-large" style={{
            background: '#0a0a0a',
            border: '1px solid #00ff9d',
            fontFamily: 'monospace',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflow: 'hidden',
            position: 'relative' // Needed for overlay
        }}>
            {showGame && <SnakeGame onClose={() => setShowGame(false)} />}

            <div className="card-header-row" style={{ borderBottom: '1px solid #00ff9d33', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
                <h3 style={{ color: '#00ff9d', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Terminal size={16} /> TERMINAL_ACCESS
                </h3>
            </div>

            <div
                ref={terminalRef}
                style={{ flex: 1, overflowY: 'auto', padding: '0.5rem', color: '#e0f2fe' }}
            >
                {output.map((line, i) => (
                    <div key={i} style={{
                        marginBottom: '4px',
                        color: line.type === 'command' ? '#00ff9d' :
                            line.type === 'error' ? '#ef4444' :
                                line.type === 'success' ? '#10b981' : '#a0aec0'
                    }}>
                        {line.text}
                    </div>
                ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', borderTop: '1px solid #00ff9d33', padding: '0.5rem' }}>
                <span style={{ color: '#00ff9d', marginRight: '8px' }}>$</span>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            handleCommand(input);
                        }
                    }}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#00ff9d',
                        flex: 1,
                        fontFamily: 'monospace',
                        outline: 'none'
                    }}
                    placeholder="Type command..."
                    autoFocus
                />
            </div>
        </div>
    );
};

export default TerminalWidget;
