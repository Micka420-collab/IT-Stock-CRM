import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useGamification } from '../context/GamificationContext';

const SnakeGame = ({ onClose }) => {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(() => {
        return parseInt(localStorage.getItem('snakeHighScore') || '0');
    });
    const [gameOver, setGameOver] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [gameStarted, setGameStarted] = useState(false);
    const gamification = useGamification();
    const addXp = gamification?.addXp || (() => { });

    // Smaller game for terminal
    const COLS = 16;
    const ROWS = 10;
    const CELL_SIZE = 14;
    const SPEED = 120;

    const gameStateRef = useRef({
        snake: [{ x: 8, y: 5 }],
        direction: { dx: 0, dy: 0 },
        nextDirection: { dx: 0, dy: 0 },
        food: { x: 12, y: 5 },
        paused: false,
        over: false
    });

    const resetGame = useCallback(() => {
        gameStateRef.current = {
            snake: [{ x: 8, y: 5 }],
            direction: { dx: 0, dy: 0 },
            nextDirection: { dx: 0, dy: 0 },
            food: { x: 12, y: 5 },
            paused: false,
            over: false
        };
        setScore(0);
        setGameOver(false);
        setIsPaused(false);
        setGameStarted(false);
    }, []);

    // Focus container on mount
    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.focus();
        }
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let gameLoop;

        const placeFood = () => {
            const state = gameStateRef.current;
            let valid = false;
            let attempts = 0;
            while (!valid && attempts < 100) {
                state.food = {
                    x: Math.floor(Math.random() * COLS),
                    y: Math.floor(Math.random() * ROWS)
                };
                valid = !state.snake.some(p => p.x === state.food.x && p.y === state.food.y);
                attempts++;
            }
        };

        const draw = () => {
            const state = gameStateRef.current;

            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Snake
            state.snake.forEach((part, index) => {
                ctx.fillStyle = index === 0 ? '#00ff9d' : '#00cc7a';
                ctx.fillRect(
                    part.x * CELL_SIZE + 1,
                    part.y * CELL_SIZE + 1,
                    CELL_SIZE - 2,
                    CELL_SIZE - 2
                );
            });

            // Food
            ctx.fillStyle = '#ff00ff';
            ctx.beginPath();
            ctx.arc(
                state.food.x * CELL_SIZE + CELL_SIZE / 2,
                state.food.y * CELL_SIZE + CELL_SIZE / 2,
                CELL_SIZE / 2 - 2,
                0,
                Math.PI * 2
            );
            ctx.fill();
        };

        const update = () => {
            const state = gameStateRef.current;

            if (state.over || state.paused) {
                draw();
                return;
            }
            if (state.nextDirection.dx === 0 && state.nextDirection.dy === 0) {
                draw();
                return;
            }

            state.direction = { ...state.nextDirection };

            const head = {
                x: state.snake[0].x + state.direction.dx,
                y: state.snake[0].y + state.direction.dy
            };

            if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
                state.over = true;
                setGameOver(true);
                if (score > highScore) {
                    localStorage.setItem('snakeHighScore', score.toString());
                    setHighScore(score);
                }
                if (score >= 50) addXp(10, 'Snake Master!');
                else if (score >= 20) addXp(5, 'Bon Snake');
                draw();
                return;
            }

            for (let i = 0; i < state.snake.length; i++) {
                if (head.x === state.snake[i].x && head.y === state.snake[i].y) {
                    state.over = true;
                    setGameOver(true);
                    if (score > highScore) {
                        localStorage.setItem('snakeHighScore', score.toString());
                        setHighScore(score);
                    }
                    if (score >= 50) addXp(10, 'Snake Master!');
                    else if (score >= 20) addXp(5, 'Bon Snake');
                    draw();
                    return;
                }
            }

            state.snake.unshift(head);

            if (head.x === state.food.x && head.y === state.food.y) {
                setScore(s => s + 10);
                placeFood();
            } else {
                state.snake.pop();
            }

            draw();
        };

        draw();
        gameLoop = setInterval(update, SPEED);

        return () => {
            clearInterval(gameLoop);
        };
    }, [score, highScore, addXp]);

    // Keyboard handler on container
    const handleKeyDown = (e) => {
        const state = gameStateRef.current;
        const key = e.key;

        // Always prevent default for game keys
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Escape',
            'z', 'Z', 'q', 'Q', 's', 'S', 'd', 'D', 'w', 'W', 'a', 'A'].includes(key)) {
            e.preventDefault();
            e.stopPropagation();
        }

        if (state.over) return;

        // Pause
        if (key === ' ') {
            state.paused = !state.paused;
            setIsPaused(state.paused);
            return;
        }

        // Exit
        if (key === 'Escape') {
            onClose();
            return;
        }

        const keyLower = key.toLowerCase();

        // Up
        if ((key === 'ArrowUp' || keyLower === 'z' || keyLower === 'w') && state.direction.dy !== 1) {
            state.nextDirection = { dx: 0, dy: -1 };
            setGameStarted(true);
        }
        // Down
        else if ((key === 'ArrowDown' || keyLower === 's') && state.direction.dy !== -1) {
            state.nextDirection = { dx: 0, dy: 1 };
            setGameStarted(true);
        }
        // Left
        else if ((key === 'ArrowLeft' || keyLower === 'q' || keyLower === 'a') && state.direction.dx !== 1) {
            state.nextDirection = { dx: -1, dy: 0 };
            setGameStarted(true);
        }
        // Right
        else if ((key === 'ArrowRight' || keyLower === 'd') && state.direction.dx !== -1) {
            state.nextDirection = { dx: 1, dy: 0 };
            setGameStarted(true);
        }
    };

    return (
        <div
            ref={containerRef}
            tabIndex={0}
            onKeyDown={handleKeyDown}
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: '#0a0a0a',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 100,
                fontFamily: 'monospace',
                color: '#00ff9d',
                padding: '10px',
                outline: 'none'
            }}
        >
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: COLS * CELL_SIZE,
                marginBottom: '6px',
                fontSize: '11px'
            }}>
                <span>🐍 SNAKE</span>
                <span style={{ color: '#666' }}>Best: {highScore}</span>
                <button
                    onClick={onClose}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#666',
                        cursor: 'pointer',
                        fontSize: '10px',
                        padding: '2px 6px'
                    }}
                >
                    [ESC]
                </button>
            </div>

            {/* Game Canvas */}
            <div style={{
                border: '1px solid #00ff9d',
                background: '#000'
            }}>
                <canvas
                    ref={canvasRef}
                    width={COLS * CELL_SIZE}
                    height={ROWS * CELL_SIZE}
                    style={{ display: 'block' }}
                />
            </div>

            {/* Footer */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: COLS * CELL_SIZE,
                marginTop: '6px',
                fontSize: '10px'
            }}>
                <span>Score: {score}</span>
                {isPaused && <span style={{ color: '#ff9800' }}>PAUSE</span>}
                {!gameStarted && !gameOver && (
                    <span style={{ color: '#555' }}>ZQSD / Flèches</span>
                )}
                {gameOver && (
                    <button
                        onClick={resetGame}
                        style={{
                            background: '#00ff9d',
                            border: 'none',
                            color: '#000',
                            padding: '3px 10px',
                            cursor: 'pointer',
                            fontFamily: 'monospace',
                            fontSize: '10px',
                            borderRadius: '3px'
                        }}
                    >
                        Rejouer
                    </button>
                )}
            </div>
        </div>
    );
};

export default SnakeGame;
