import React, { useState, useEffect, useRef } from 'react';

const Screensaver = () => {
    const [active, setActive] = useState(false);
    const canvasRef = useRef(null);
    const timeoutRef = useRef(null);

    const IDLE_TIME = 5 * 60 * 1000; // 5 minutes

    const resetTimer = () => {
        setActive(false);
        clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setActive(true), IDLE_TIME);
    };

    useEffect(() => {
        const events = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart'];
        events.forEach(e => window.addEventListener(e, resetTimer));

        resetTimer(); // Start timer

        return () => {
            events.forEach(e => window.removeEventListener(e, resetTimer));
            clearTimeout(timeoutRef.current);
        };
    }, []);

    // Animation Loop
    useEffect(() => {
        if (!active) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let animationId;

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        let x = Math.random() * (canvas.width - 100);
        let y = Math.random() * (canvas.height - 50);
        let dx = 2;
        let dy = 2;
        const width = 150;
        const height = 80;
        let colorIndex = 0;
        const colors = ['#00ff9d', '#ff00ff', '#00ffff', '#ffff00', '#ff0000'];

        const drawDVD = () => {
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.font = 'bold 30px monospace';
            ctx.fillStyle = colors[colorIndex];
            ctx.fillText('CRM SVR', x + 10, y + 50);

            ctx.strokeStyle = colors[colorIndex];
            ctx.lineWidth = 4;
            ctx.strokeRect(x, y, width, height);

            if (x + width > canvas.width || x < 0) {
                dx = -dx;
                colorIndex = (colorIndex + 1) % colors.length;
            }
            if (y + height > canvas.height || y < 0) {
                dy = -dy;
                colorIndex = (colorIndex + 1) % colors.length;
            }

            x += dx;
            y += dy;

            animationId = requestAnimationFrame(drawDVD);
        };

        drawDVD();

        return () => cancelAnimationFrame(animationId);
    }, [active]);

    if (!active) return null;

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                zIndex: 100000,
                cursor: 'none'
            }}
        />
    );
};

export default Screensaver;
