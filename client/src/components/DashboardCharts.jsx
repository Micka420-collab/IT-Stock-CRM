import React from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    Filler
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    Filler
);

export default function DashboardCharts({ stats, loading }) {
    if (loading || !stats) {
        return <div className="p-4 text-center">Chargement des graphiques...</div>;
    }

    // Theme colors helper
    const getThemeColor = (variable) => getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
    const textColor = getThemeColor('--text-color') || '#ffffff';
    const textSecondary = getThemeColor('--text-secondary') || '#94a3b8';
    const gridColor = getThemeColor('--border-color') || 'rgba(255,255,255,0.05)';

    // DATA: Activity (Line Chart)
    const activityData = {
        labels: stats.activity.map(d => new Date(d.date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })),
        datasets: [
            {
                label: 'Prêts effectués',
                data: stats.activity.map(d => d.count),
                borderColor: '#8b5cf6', // Violet Neon
                backgroundColor: 'rgba(139, 92, 246, 0.2)', // Violet transparent
                tension: 0.4,
                fill: true,
                pointBackgroundColor: getThemeColor('--card-bg'),
                pointBorderColor: '#8b5cf6',
                pointRadius: 4
            },
        ],
    };

    const lineOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: getThemeColor('--card-bg'),
                titleColor: textColor,
                bodyColor: textColor,
                borderColor: gridColor,
                borderWidth: 1,
                padding: 10,
                cornerRadius: 8,
            },
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: { stepSize: 1, color: textSecondary },
                grid: { color: gridColor }
            },
            x: {
                ticks: { color: textSecondary },
                grid: { display: false }
            }
        }
    };

    // DATA: Distribution (Doughnut)
    const distributionData = {
        labels: ['Disponible', 'En remasterisation', 'Prêts en cours', 'Hors Service'],
        datasets: [
            {
                data: [
                    stats.distribution.available,
                    stats.distribution.remastering,
                    stats.distribution.loaned,
                    stats.distribution.out_of_service
                ],
                backgroundColor: [
                    '#10b981', // Emerald (Available)
                    '#3b82f6', // Blue (Remastering)
                    '#f59e0b', // Amber (Loaned)
                    '#ef4444', // Red (Out)
                ],
                borderWidth: 0,
                hoverOffset: 4
            },
        ],
    };

    const doughnutOptions = {
        responsive: true,
        plugins: {
            legend: {
                position: 'right',
                labels: { color: textColor, font: { size: 12 } }
            }
        },
        cutout: '70%', // Donut thickness
    };

    return (
        <div className="charts-container" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginTop: '1rem' }}>
            {/* Line Chart */}
            <div className="card" style={{ padding: '1.5rem', background: 'var(--bg-secondary)', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>
                <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 600 }}>Activité Récente (7 jours)</h3>
                <div style={{ height: '300px' }}>
                    <Line data={activityData} options={lineOptions} />
                </div>
            </div>

            {/* Doughnut Chart */}
            <div className="card" style={{ padding: '1.5rem', background: 'var(--bg-secondary)', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>
                <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 600 }}>État du Parc ({stats.distribution.total} PCs)</h3>
                <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Doughnut data={distributionData} options={doughnutOptions} />
                </div>
            </div>
        </div>
    );
}
