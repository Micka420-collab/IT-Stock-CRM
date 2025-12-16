import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, User, Laptop, ZoomIn, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import Modal from './Modal';

export default function LoanCalendar({ loans, reservations, onCancelReservation }) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDay, setSelectedDay] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Quick helpers (native Date)
    const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year, month) => {
        const day = new Date(year, month, 1).getDay();
        return day === 0 ? 6 : day - 1; // Adjust for Monday start (0=Mon, 6=Sun)
    };

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const monthNames = [
        "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
        "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
    ];

    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month); // 0 = Mon

    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
    const goToToday = () => setCurrentDate(new Date());

    // Process loans AND reservations to find those active in this month
    const activeEvents = useMemo(() => {
        const events = [];
        const monthStart = new Date(year, month, 1);
        const monthEnd = new Date(year, month, daysInMonth, 23, 59, 59);

        // Process Loans
        if (loans) {
            loans.forEach(loan => {
                if (loan.action_type !== 'loan') return;
                const start = new Date(loan.start_date);
                const end = loan.actual_return_date ? new Date(loan.actual_return_date) : new Date(loan.end_date);
                // Adjust windows to inclusive days
                const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
                const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59);

                if (startDay <= monthEnd && endDay >= monthStart) {
                    events.push({ ...loan, type: 'loan', startDateObj: startDay, endDateObj: endDay });
                }
            });
        }

        // Process Reservations
        if (reservations) {
            reservations.forEach(res => {
                const start = new Date(res.start_date);
                const end = new Date(res.end_date);
                // Adjust windows
                const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
                const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59);

                if (startDay <= monthEnd && endDay >= monthStart) {
                    events.push({ ...res, type: 'reservation', startDateObj: startDay, endDateObj: endDay });
                }
            });
        }
        return events;
    }, [loans, reservations, year, month, daysInMonth]);

    const handleDayClick = (day) => {
        const date = new Date(year, month, day);

        // Filter events for this specific day
        const dayEvents = activeEvents.filter(event => {
            const thisDayStart = new Date(year, month, day, 0, 0, 0);
            const thisDayEnd = new Date(year, month, day, 23, 59, 59);
            return event.startDateObj <= thisDayEnd && event.endDateObj >= thisDayStart;
        });

        setSelectedDay({ date, events: dayEvents });
        setIsModalOpen(true);
    };

    // Generate Calendar Grid
    const generateGrid = () => {
        const grid = [];
        // Empty cells for previous month
        for (let i = 0; i < firstDay; i++) {
            grid.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
        }

        // Days
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const isToday = new Date().toDateString() === date.toDateString();

            // Find events active on this specific day for display preview
            const dayEvents = activeEvents.filter(event => {
                const thisDayStart = new Date(year, month, day, 0, 0, 0);
                const thisDayEnd = new Date(year, month, day, 23, 59, 59);
                return event.startDateObj <= thisDayEnd && event.endDateObj >= thisDayStart;
            });

            grid.push(
                <div
                    key={day}
                    className={`calendar-day ${isToday ? 'today' : ''}`}
                    onClick={() => handleDayClick(day)}
                >
                    <div className="day-header">
                        <span className="day-number">{day}</span>
                        <div className="day-zoom-icon"><ZoomIn size={12} /></div>
                    </div>

                    <div className="day-events">
                        {dayEvents.slice(0, 3).map((event, idx) => (
                            <div
                                key={`${event.type}-${event.id}`}
                                className={`event-bar ${event.type === 'reservation' ? 'reserved' : (event.actual_return_date ? 'returned' : 'active')}`}
                                title={`${event.type === 'reservation' ? '[RÉSERVÉ] ' : ''}${event.pc_name} - ${event.user_name}`}
                                onClick={(e) => {
                                    e.stopPropagation(); // Prevent opening zoom
                                    if (event.type === 'reservation' && onCancelReservation) {
                                        onCancelReservation(event);
                                    } else {
                                        handleDayClick(day); // Or specific event detail if prefered
                                    }
                                }}
                            >
                                <span className="event-pc">{event.pc_name}</span>
                            </div>
                        ))}
                        {dayEvents.length > 3 && (
                            <div className="more-events">+{dayEvents.length - 3} autres</div>
                        )}
                    </div>
                </div>
            );
        }
        return grid;
    };

    return (
        <div className="loan-calendar fade-in">
            {/* ... header ... */}
            <div className="calendar-header">
                <div className="calendar-nav">
                    <button className="nav-btn" onClick={prevMonth}><ChevronLeft size={20} /></button>
                    <h2 className="current-month">
                        <CalendarIcon size={24} className="mr-2" style={{ color: 'var(--primary-color)' }} />
                        {monthNames[month]} {year}
                    </h2>
                    <button className="nav-btn" onClick={nextMonth}><ChevronRight size={20} /></button>
                </div>
                <button className="today-btn" onClick={goToToday}>Aujourd'hui</button>
            </div>

            <div className="calendar-grid-header">
                <div>Lun</div><div>Mar</div><div>Mer</div><div>Jeu</div><div>Ven</div><div>Sam</div><div>Dim</div>
            </div>

            <div className="calendar-grid">
                {generateGrid()}
            </div>

            {/* Day Detail Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={selectedDay ? `Détails du ${selectedDay.date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}` : 'Détails du jour'}
                size="lg"
            >
                {selectedDay && (
                    <div className="day-detail-content">
                        {selectedDay.events.length === 0 ? (
                            <div className="empty-day-state">
                                <CalendarIcon size={48} className="text-gray-500 mb-2" />
                                <p>Aucun événement pour ce jour.</p>
                            </div>
                        ) : (
                            <div className="events-list">
                                {selectedDay.events.map(event => {
                                    const isStart = new Date(event.start_date).toDateString() === selectedDay.date.toDateString();
                                    const isEnd = (event.actual_return_date ? new Date(event.actual_return_date) : new Date(event.end_date)).toDateString() === selectedDay.date.toDateString();
                                    const status = event.type === 'reservation' ? 'Réservé' : (event.actual_return_date ? 'Terminé' : 'En cours');

                                    return (
                                        <div key={`${event.type}-${event.id}`} className={`detail-card ${event.type}`}>
                                            <div className="detail-header">
                                                <div className="detail-title">
                                                    <Laptop size={18} />
                                                    <span className="pc-name">{event.pc_name}</span>
                                                    <span className={`status-badge ${status.toLowerCase().replace(' ', '-')}`}>{status}</span>
                                                </div>
                                                <div className="detail-user">
                                                    <User size={16} /> {event.user_name}
                                                </div>
                                            </div>
                                            <div className="detail-body">
                                                <div className="time-info">
                                                    <div className={`time-block ${isStart ? 'highlight' : ''}`}>
                                                        <span className="label">Début:</span>
                                                        <span className="value">{new Date(event.start_date).toLocaleString()}</span>
                                                    </div>
                                                    <div className="arrow">→</div>
                                                    <div className={`time-block ${isEnd ? 'highlight' : ''}`}>
                                                        <span className="label">Fin:</span>
                                                        <span className="value">
                                                            {event.actual_return_date
                                                                ? new Date(event.actual_return_date).toLocaleString()
                                                                : new Date(event.end_date).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                </div>
                                                {event.notes && <div className="event-notes">📝 {event.notes}</div>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </Modal>

            <style>
                {`
                /* ... styles ... */
                .loan-calendar {
                    background: var(--bg-secondary);
                    border-radius: 1rem;
                    padding: 1.5rem;
                    border: 1px solid var(--border-color);
                }
                .calendar-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1.5rem;
                }
                .calendar-nav {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }
                .current-month {
                    display: flex;
                    align-items: center;
                    font-size: 1.5rem;
                    font-weight: 600;
                    min-width: 200px;
                    justify-content: center;
                    gap: 0.5rem;
                }
                .nav-btn {
                    background: var(--bg-primary);
                    border: 1px solid var(--border-color);
                    color: var(--text-primary);
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .nav-btn:hover {
                    background: var(--primary-color);
                    color: white;
                    border-color: var(--primary-color);
                }
                .today-btn {
                    background: rgba(16, 185, 129, 0.1);
                    color: #10b981;
                    border: none;
                    padding: 0.5rem 1rem;
                    border-radius: 0.5rem;
                    font-weight: 600;
                    cursor: pointer;
                }
                .calendar-grid-header {
                    display: grid;
                    grid-template-columns: repeat(7, 1fr);
                    margin-bottom: 0.5rem;
                    text-align: center;
                    font-weight: 600;
                    color: var(--text-secondary);
                    font-size: 0.9rem;
                }
                .calendar-grid {
                    display: grid;
                    grid-template-columns: repeat(7, 1fr);
                    gap: 0.5rem;
                }
                .calendar-day {
                    background: var(--bg-primary);
                    border: 1px solid var(--border-color);
                    border-radius: 0.5rem;
                    min-height: 120px;
                    padding: 0.5rem;
                    display: flex;
                    flex-direction: column;
                    gap: 0.25rem;
                    cursor: pointer; /* Change cursor to indicate clickability */
                    transition: all 0.2s ease;
                    position: relative;
                }
                .calendar-day:hover {
                    border-color: var(--primary-color);
                    background: rgba(59, 130, 246, 0.05);
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                }
                .calendar-day.empty {
                    background: transparent;
                    border: none;
                    cursor: default;
                    pointer-events: none;
                }
                .calendar-day.today {
                    border: 2px solid var(--primary-color);
                    background: rgba(16, 185, 129, 0.02);
                }
                .day-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 0.25rem;
                }
                .day-number {
                    font-weight: 600;
                    color: var(--text-secondary);
                }
                .day-zoom-icon {
                    opacity: 0;
                    transition: opacity 0.2s;
                    color: var(--primary-color);
                }
                .calendar-day:hover .day-zoom-icon {
                    opacity: 1;
                }
                .day-events {
                    display: flex;
                    flex-direction: column;
                    gap: 0.25rem;
                    overflow: hidden;
                }
                .more-events {
                    font-size: 0.7rem;
                    color: var(--text-secondary);
                    text-align: center;
                    background: rgba(255,255,255,0.05);
                    border-radius: 4px;
                    padding: 2px;
                }
                .event-bar {
                    font-size: 0.75rem;
                    padding: 0.2rem 0.4rem;
                    border-radius: 4px;
                    display: flex;
                    justify-content: space-between;
                    gap: 0.5rem;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .event-bar.active {
                    background: rgba(245, 158, 11, 0.15);
                    color: #f59e0b;
                    border-left: 3px solid #f59e0b;
                }
                .event-bar.returned {
                    background: rgba(107, 114, 128, 0.1);
                    color: #9ca3af;
                    text-decoration: line-through;
                }
                .event-bar.reserved {
                    background: repeating-linear-gradient(
                        45deg,
                        rgba(139, 92, 246, 0.1),
                        rgba(139, 92, 246, 0.1) 10px,
                        rgba(139, 92, 246, 0.2) 10px,
                        rgba(139, 92, 246, 0.2) 20px
                    );
                    color: #8b5cf6;
                    border: 1px solid rgba(139, 92, 246, 0.3);
                }
                .event-pc {
                    font-weight: 600;
                }

                /* Modal Detail Styles */
                .day-detail-content {
                    min-height: 200px;
                }
                .empty-day-state {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 200px;
                    color: var(--text-secondary);
                }
                .events-list {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }
                .detail-card {
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid var(--border-color);
                    border-radius: 12px;
                    padding: 1rem;
                    transition: background 0.2s;
                }
                .detail-card:hover {
                    background: rgba(255, 255, 255, 0.05);
                }
                .detail-card.reservation { border-left: 4px solid #8b5cf6; }
                .detail-card.loan { border-left: 4px solid #f59e0b; }
                
                .detail-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 0.75rem;
                    padding-bottom: 0.75rem;
                    border-bottom: 1px solid rgba(255,255,255,0.05);
                }
                .detail-title {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    font-size: 1.1rem;
                    font-weight: 600;
                    color: var(--text-primary);
                }
                .status-badge {
                    font-size: 0.75rem;
                    padding: 0.2rem 0.6rem;
                    border-radius: 100px;
                    text-transform: uppercase;
                    font-weight: 700;
                    letter-spacing: 0.5px;
                }
                .status-badge.réservé { background: rgba(139, 92, 246, 0.2); color: #a78bfa; }
                .status-badge.en-cours { background: rgba(245, 158, 11, 0.2); color: #fbbf24; }
                .status-badge.terminé { background: rgba(16, 185, 129, 0.2); color: #34d399; }

                .detail-user {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    color: var(--text-secondary);
                    font-weight: 500;
                }
                .time-info {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    font-size: 0.9rem;
                    color: var(--text-secondary);
                    flex-wrap: wrap;
                }
                .time-block {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.4rem 0.8rem;
                    background: rgba(0,0,0,0.2);
                    border-radius: 8px;
                }
                .time-block.highlight {
                    background: rgba(59, 130, 246, 0.1);
                    border: 1px solid rgba(59, 130, 246, 0.3);
                    color: var(--primary-color);
                }
                .label { font-size: 0.8rem; opacity: 0.7; }
                .value { font-weight: 600; }
                .event-notes {
                    margin-top: 0.75rem;
                    font-style: italic;
                    color: var(--text-secondary);
                    background: rgba(255,255,0,0.05);
                    padding: 0.5rem;
                    border-radius: 4px;
                }
                `}
            </style>
        </div>
    );
}
