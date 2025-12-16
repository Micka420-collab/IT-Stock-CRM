import React from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    Filler
} from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    Filler
);

export default function PhoneStatsCharts({ stats, loading }) {
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
                label: 'Mouvements',
                data: stats.activity.map(d => d.count),
                borderColor: '#06b6d4', // Cyan
                backgroundColor: 'rgba(6, 182, 212, 0.2)', // Cyan transparent
                tension: 0.4,
                fill: true,
                pointBackgroundColor: getThemeColor('--card-bg'),
                pointBorderColor: '#06b6d4',
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
        labels: ['Disponible', 'Assigné', 'Hors Service'],
        datasets: [
            {
                data: [
                    stats.distribution.available,
                    stats.distribution.assigned,
                    stats.distribution.out_of_service
                ],
                backgroundColor: [
                    '#10b981', // Emerald (Available)
                    '#f59e0b', // Amber (Assigned)
                    '#ef4444', // Red (Out)
                ],
                borderWidth: 0,
                hoverOffset: 4
            },
        ],
    };

    const doughnutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'right',
                labels: { color: textColor, font: { size: 12 } }
            }
        },
        cutout: '70%',
    };

    // DATA: Conditions (Bar Chart)
    const conditionLabels = Object.keys(stats.conditions || {});
    const conditionValues = Object.values(stats.conditions || {});

    const conditionData = {
        labels: conditionLabels,
        datasets: [
            {
                label: 'Téléphones',
                data: conditionValues,
                backgroundColor: conditionLabels.map(c =>
                    c === 'Neuf' ? '#8b5cf6' :
                        c === 'Bon' ? '#10b981' :
                            c === 'Usé' ? '#f59e0b' : '#ef4444'
                ),
                borderRadius: 4,
            }
        ]
    };

    const barOptions = {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
            y: {
                beginAtZero: true,
                ticks: { color: textSecondary, stepSize: 1 },
                grid: { color: gridColor }
            },
            x: {
                ticks: { color: textSecondary },
                grid: { display: false }
            }
        }
    };

    return (
        <div className="charts-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
            {/* Line Chart: Activity */}
            <div className="card" style={{ padding: '1.5rem', background: 'var(--bg-secondary)', borderRadius: '1rem', border: '1px solid var(--border-color)', minHeight: '340px' }}>
                <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 600 }}>Activité Récente (7 jours)</h3>
                <div style={{ height: '250px' }}>
                    <Line data={activityData} options={lineOptions} />
                </div>
            </div>

            {/* Doughnut Chart: Distribution */}
            <div className="card" style={{ padding: '1.5rem', background: 'var(--bg-secondary)', borderRadius: '1rem', border: '1px solid var(--border-color)', minHeight: '340px' }}>
                <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 600 }}>Disponibilité ({stats.distribution.total} Tél)</h3>
                <div style={{ height: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Doughnut data={distributionData} options={doughnutOptions} />
                </div>
            </div>

            {/* Bar Chart: Conditions */}
            <div className="card" style={{ padding: '1.5rem', background: 'var(--bg-secondary)', borderRadius: '1rem', border: '1px solid var(--border-color)', minHeight: '340px' }}>
                <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 600 }}>État du Parc</h3>
                <div style={{ height: '250px' }}>
                    <Bar data={conditionData} options={barOptions} />
                </div>
            </div>
        </div>
    );
}
