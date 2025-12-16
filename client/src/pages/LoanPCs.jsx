import { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Laptop, Plus, Send, RotateCcw, Wrench, Trash2, AlertTriangle,
    Clock, User, Calendar, Filter, X, CheckCircle, XCircle, History, Disc, RefreshCw, Download,
    QrCode, Scan, FileText, Printer
} from 'lucide-react';
import QRCodeModal from '../components/QRCodeModal';
import QRScannerModal from '../components/QRScannerModal';
import TutorialButton from '../components/TutorialButton';
import ConfirmModal from '../components/ConfirmModal';
import InputModal from '../components/InputModal';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useGamification } from '../context/GamificationContext';
import LoanCalendar from '../components/LoanCalendar';
import ReservationModal from '../components/ReservationModal';
import { CalendarClock } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function LoanPCs() {
    const { user } = useAuth();
    const { t } = useLanguage();
    const { addXp } = useGamification() || { addXp: () => { } };
    const [pcs, setPcs] = useState([]);
    const [stats, setStats] = useState({ total: 0, available: 0, loaned: 0, outOfService: 0, overdue: [] });
    const [history, setHistory] = useState([]);
    const [reservations, setReservations] = useState([]); // NEW: Reservations state
    const [filter, setFilter] = useState('all');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showLoanModal, setShowLoanModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [selectedPC, setSelectedPC] = useState(null);
    const [newPC, setNewPC] = useState({ name: '', serial_number: '', notes: '' });

    const [loanData, setLoanData] = useState({ user_name: '', reason: '', end_date: '', notes: '' });

    // Modal States
    const [restoreModal, setRestoreModal] = useState(null);
    const [outOfServiceModal, setOutOfServiceModal] = useState(null);
    const [returnModal, setReturnModal] = useState(null);
    const [deleteModal, setDeleteModal] = useState(null);
    const [reservationModal, setReservationModal] = useState(null); // NEW: Reservation modal state

    // QR States
    const [qrPC, setQrPC] = useState(null); // PC to show QR for
    const [showScanner, setShowScanner] = useState(false); // Scanner visibility

    // Report Modal States
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportDateRange, setReportDateRange] = useState({
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });

    // View Mode
    const [viewMode, setViewMode] = useState('list'); // 'list' | 'calendar'


    const handleScanResult = (decodedText) => {
        // Try to find PC by name, ID, or serial number
        const searchText = decodedText.trim();
        let foundPC = pcs.find(p =>
            String(p.id) === searchText ||
            p.serial_number === searchText ||
            p.name === searchText ||
            p.name?.toLowerCase() === searchText.toLowerCase()
        );

        if (foundPC) {
            setShowScanner(false);
            if (foundPC.status === 'available') {
                openLoanModal(foundPC);
            } else if (foundPC.status === 'loaned') {
                setSelectedPC(foundPC);
                setReturnModal(foundPC);
            } else {
                showAlert('info', 'PC Trouvé', `PC ${foundPC.name} trouvé mais il est actuellement ${foundPC.status === 'out_of_service' ? 'hors service' : foundPC.status}`);
            }
        } else {
            showAlert('warning', 'PC Non Trouvé', `Aucun PC trouvé avec le code: "${searchText}"`);
        }
    };

    useEffect(() => {
        fetchData();
        loadHistory();
    }, []);

    // Fetch history when switching to calendar
    // Fetch history when switching to calendar
    useEffect(() => {
        if (viewMode === 'calendar') {
            loadHistory();
        }
    }, [viewMode]);

    const fetchData = async () => {
        try {
            const [pcsRes, statsRes] = await Promise.all([
                axios.get('/api/loan-pcs'),
                axios.get('/api/loan-pcs/stats')
            ]);
            setPcs(pcsRes.data);
            setStats(statsRes.data);
        } catch (error) {
            console.error('Failed to fetch loan PCs', error);
        }
    };

    const loadHistory = async () => {
        try {
            const [historyRes, reservationsRes] = await Promise.all([
                axios.get('/api/loan-history'),
                axios.get('/api/reservations')
            ]);
            setHistory(historyRes.data);
            setReservations(reservationsRes.data);
        } catch (error) {
            console.error('Failed to fetch history/reservations', error);
        }
    };

    const handleOpenHistory = () => {
        loadHistory().then(() => setShowHistoryModal(true));
    };

    const [conflictModal, setConflictModal] = useState(null);
    const [alertData, setAlertData] = useState(null); // { type: 'success'|'error', title, message }

    const showAlert = (type, title, message) => {
        setAlertData({ type, title, message });
    };

    const handleAddPC = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/loan-pcs', newPC);
            setNewPC({ name: '', serial_number: '', notes: '' });
            setShowAddModal(false);
            fetchData();
            addXp(15, 'Nouveau PC ajouté');
            showAlert('success', 'Succès', 'Le PC a été ajouté avec succès.');
        } catch (error) {
            showAlert('error', 'Erreur', error.response?.data?.error || 'Failed to add PC');
        }
    };

    const openLoanModal = (pc) => {
        setSelectedPC(pc);
        setLoanData({ user_name: '', reason: '', end_date: '', notes: '' });
        setShowLoanModal(true);
    };

    const executeLoan = async (overrideReservation = false) => {
        try {
            await axios.post(`/api/loan-pcs/${selectedPC.id}/loan`, {
                ...loanData,
                override_reservation: overrideReservation
            });
            setShowLoanModal(false);
            setConflictModal(null);
            fetchData();
            loadHistory(); // Refresh reservations
            addXp(10, 'PC prêté');
            showAlert('success', 'Prêt enregistré', `Le PC a été prêté à ${loanData.user_name}.`);
        } catch (error) {
            // Handle reservation conflict from server
            if (error.response?.status === 409 && error.response?.data?.is_reservation_conflict) {
                const reservation = error.response.data.reservation;
                setShowLoanModal(false);
                setConflictModal({
                    pc: selectedPC,
                    conflict: reservation,
                    message: `⚠️ RÉSERVATION ACTIVE\n\nCe PC est réservé par ${reservation.user_name} du ${new Date(reservation.start_date).toLocaleDateString('fr-FR')} au ${new Date(reservation.end_date).toLocaleDateString('fr-FR')}.`,
                    subMessage: `Voulez-vous annuler cette réservation et prêter le PC à ${loanData.user_name} ?`,
                    isActiveReservation: true
                });
            } else {
                showAlert('error', 'Erreur de prêt', error.response?.data?.error || 'Failed to loan PC');
            }
        }
    };

    const handleLoan = async (e) => {
        e.preventDefault();

        // Check for future conflict with reservations (date overlap warning)
        if (loanData.end_date && reservations) {
            const conflict = reservations.find(r =>
                r.pc_id === selectedPC.id &&
                new Date(loanData.end_date) > new Date(r.start_date) &&
                new Date() < new Date(r.start_date) // Only if reservation is in the future
            );

            if (conflict) {
                setConflictModal({
                    pc: selectedPC,
                    conflict: conflict,
                    message: `ATTENTION: Ce PC est réservé par ${conflict.user_name} à partir du ${new Date(conflict.start_date).toLocaleDateString()}.\n\n` +
                        `La date de retour prévue (${new Date(loanData.end_date).toLocaleDateString()}) dépasse le début de la réservation.`,
                    subMessage: `Voulez-vous quand même prêter ce PC ? (Il devra être retourné avant la réservation)`,
                    isActiveReservation: false
                });
                return;
            }
        }

        executeLoan();
    };

    const handleReturn = async () => {
        if (!returnModal) return;
        try {
            await axios.post(`/api/loan-pcs/${returnModal.id}/return`);
            setReturnModal(null);
            fetchData();
            addXp(8, 'PC retourné');
            showAlert('success', 'Retour confirmé', `Le PC ${returnModal.name} a été retourné.`);
        } catch (error) {
            showAlert('error', 'Erreur', error.response?.data?.error || 'Failed to return PC');
        }
    };

    const handleOutOfService = async (reason) => {
        if (!outOfServiceModal || !reason) return;
        try {
            await axios.post(`/api/loan-pcs/${outOfServiceModal.id}/out-of-service`, { reason });
            setOutOfServiceModal(null);
            fetchData();
        } catch (error) {
            showAlert('error', 'Erreur', error.response?.data?.error || 'Failed to update PC');
        }
    };

    const handleRestore = async () => {
        if (!restoreModal) return;
        try {
            await axios.post(`/api/loan-pcs/${restoreModal.id}/restore`);
            setRestoreModal(null);
            fetchData();
            addXp(5, 'PC restauré');
        } catch (error) {
            showAlert('error', 'Erreur', error.response?.data?.error || 'Failed to restore PC');
        }
    };

    const handleDeletePC = async () => {
        if (!deleteModal) return;
        try {
            await axios.delete(`/api/loan-pcs/${deleteModal.id}`);
            setDeleteModal(null);
            fetchData();
            showAlert('success', 'PC supprimé', `Le PC ${deleteModal.name} a été supprimé du parc.`);
        } catch (error) {
            showAlert('error', 'Erreur', error.response?.data?.error || 'Impossible de supprimer ce PC');
        }
    };

    const handleRemaster = async (pc) => {
        // Toggle current state
        const newState = !pc.is_remastering;
        try {
            await axios.post(`/api/loan-pcs/${pc.id}/remaster`, { is_remastering: newState });
            fetchData();
        } catch (error) {
            showAlert('error', 'Erreur', error.response?.data?.error || 'Failed to update remaster status');
        }
    };

    const [deleteReservationModal, setDeleteReservationModal] = useState(null);

    const handleCancelReservation = async () => {
        if (!deleteReservationModal) return;
        try {
            await axios.delete(`/api/reservations/${deleteReservationModal.id}`);
            setDeleteReservationModal(null);
            showAlert('success', 'Réservation annulée', 'La réservation a été supprimée.');
            loadHistory(); // Reload calendar events
        } catch (error) {
            showAlert('error', 'Erreur', error.response?.data?.error || 'Failed to delete reservation');
        }
    };

    const handleDelete = async () => {
        if (!deleteModal) return;
        try {
            await axios.delete(`/api/loan-pcs/${deleteModal.id}`);
            setDeleteModal(null);
            fetchData();
        } catch (error) {
            showAlert('error', 'Erreur', error.response?.data?.error || 'Failed to delete PC');
        }
    };

    // Generate comprehensive PDF report for loan history with date filtering
    const handleDownloadLoanReport = async () => {
        try {
            // Ensure we have the latest history
            const [historyRes, reservationsRes] = await Promise.all([
                axios.get('/api/loan-history'),
                axios.get('/api/reservations')
            ]);
            const latestHistory = historyRes.data;
            const latestReservations = reservationsRes.data;

            // Filter history by date range
            const startDate = new Date(reportDateRange.start);
            const endDate = new Date(reportDateRange.end);
            endDate.setHours(23, 59, 59, 999);

            const filteredHistory = latestHistory.filter(h => {
                const histDate = new Date(h.start_date || h.timestamp);
                return histDate >= startDate && histDate <= endDate;
            });

            const doc = new jsPDF();

            // ========== PAGE 1: COVER & FLEET STATUS ==========
            // Header with gradient-like styling
            doc.setFillColor(59, 130, 246);
            doc.rect(0, 0, 220, 45, 'F');

            doc.setFontSize(22);
            doc.setTextColor(255, 255, 255);
            doc.text('RAPPORT COMPLET DU PARC PC', 14, 22);

            doc.setFontSize(11);
            doc.text(`Periode: ${new Date(reportDateRange.start).toLocaleDateString('fr-FR')} - ${new Date(reportDateRange.end).toLocaleDateString('fr-FR')}`, 14, 35);

            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(`Genere le: ${new Date().toLocaleString('fr-FR')}`, 14, 55);
            doc.text(`Par: ${user?.username || 'Utilisateur'}`, 14, 62);

            // Current Fleet Status Summary
            doc.setFontSize(14);
            doc.setTextColor(59, 130, 246);
            doc.text('ETAT ACTUEL DU PARC', 14, 78);

            const remasteringCount = pcs.filter(pc => pc.is_remastering === 1).length;
            const overdueCount = pcs.filter(pc =>
                pc.status === 'loaned' && pc.loan_end_expected && new Date(pc.loan_end_expected) < new Date()
            ).length;

            autoTable(doc, {
                startY: 85,
                head: [['Total PC', 'Disponibles', 'En Pret', 'Hors Service', 'En Remaster', 'Retards']],
                body: [[stats.total, stats.available, stats.loaned, stats.outOfService, remasteringCount, overdueCount]],
                theme: 'grid',
                styles: { fontSize: 11, cellPadding: 6, halign: 'center', fontStyle: 'bold' },
                headStyles: { fillColor: [59, 130, 246] }
            });

            // ========== DETAILED PC INVENTORY ==========
            doc.setFontSize(12);
            doc.setTextColor(71, 85, 105);
            doc.text('INVENTAIRE COMPLET DES PC', 14, doc.lastAutoTable.finalY + 15);

            autoTable(doc, {
                startY: doc.lastAutoTable.finalY + 20,
                head: [['Nom PC', 'N. Serie', 'Statut', 'Utilisateur', 'Retour Prevu', 'Notes']],
                body: pcs.map(pc => {
                    let statusText = '';
                    if (pc.status === 'available') statusText = 'Disponible';
                    else if (pc.status === 'loaned') statusText = 'En pret';
                    else if (pc.status === 'out_of_service') statusText = 'Hors service';
                    if (pc.is_remastering === 1) statusText += ' [REMASTER]';

                    const isOverdue = pc.status === 'loaned' && pc.loan_end_expected && new Date(pc.loan_end_expected) < new Date();
                    if (isOverdue) statusText += ' [RETARD]';

                    return [
                        pc.name,
                        pc.serial_number || '-',
                        statusText,
                        pc.current_user || '-',
                        pc.loan_end_expected ? new Date(pc.loan_end_expected).toLocaleDateString('fr-FR') : '-',
                        (pc.notes || '-').substring(0, 25)
                    ];
                }),
                headStyles: { fillColor: [71, 85, 105], fontSize: 9 },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                styles: { fontSize: 8, cellPadding: 3 }
            });

            // ========== PAGE 2: ACTIVE LOANS ==========
            const currentLoans = pcs.filter(pc => pc.status === 'loaned');
            if (currentLoans.length > 0) {
                doc.addPage();
                doc.setFillColor(245, 158, 11);
                doc.rect(0, 0, 220, 25, 'F');
                doc.setFontSize(16);
                doc.setTextColor(255);
                doc.text('PRETS EN COURS (' + currentLoans.length + ')', 14, 16);

                autoTable(doc, {
                    startY: 32,
                    head: [['PC', 'Emprunteur', 'Raison', 'Debut du Pret', 'Retour Prevu', 'Statut']],
                    body: currentLoans.map(pc => {
                        const isOverdue = pc.loan_end_expected && new Date(pc.loan_end_expected) < new Date();
                        return [
                            pc.name,
                            pc.current_user || '-',
                            pc.loan_reason || '-',
                            pc.loan_start ? new Date(pc.loan_start).toLocaleDateString('fr-FR') : '-',
                            pc.loan_end_expected ? new Date(pc.loan_end_expected).toLocaleDateString('fr-FR') : '-',
                            isOverdue ? 'EN RETARD' : 'OK'
                        ];
                    }),
                    headStyles: { fillColor: [245, 158, 11] },
                    alternateRowStyles: { fillColor: [254, 243, 199] },
                    styles: { fontSize: 9, cellPadding: 4 }
                });
            }

            // ========== REMASTERING IN PROGRESS ==========
            const remasteringPCs = pcs.filter(pc => pc.is_remastering === 1);
            if (remasteringPCs.length > 0) {
                const yPos = doc.lastAutoTable ? doc.lastAutoTable.finalY + 20 : 32;
                if (yPos > 240) doc.addPage();

                doc.setFontSize(12);
                doc.setTextColor(139, 92, 246);
                doc.text('PC EN REMASTERISATION (' + remasteringPCs.length + ')', 14, yPos > 240 ? 20 : yPos);

                autoTable(doc, {
                    startY: yPos > 240 ? 28 : yPos + 6,
                    head: [['Nom PC', 'N. Serie', 'Statut Actuel', 'Notes']],
                    body: remasteringPCs.map(pc => [
                        pc.name,
                        pc.serial_number || '-',
                        pc.status === 'available' ? 'Disponible (Remaster en cours)' : pc.status,
                        pc.notes || '-'
                    ]),
                    headStyles: { fillColor: [139, 92, 246] },
                    alternateRowStyles: { fillColor: [243, 232, 255] },
                    styles: { fontSize: 9, cellPadding: 4 }
                });
            }

            // ========== PAGE 3: FUTURE RESERVATIONS ==========
            const futureRes = latestReservations.filter(r => new Date(r.start_date) >= new Date());
            if (futureRes.length > 0) {
                doc.addPage();
                doc.setFillColor(139, 92, 246);
                doc.rect(0, 0, 220, 25, 'F');
                doc.setFontSize(16);
                doc.setTextColor(255);
                doc.text('RESERVATIONS FUTURES (' + futureRes.length + ')', 14, 16);

                autoTable(doc, {
                    startY: 32,
                    head: [['PC', 'Reserve par', 'Date Debut', 'Date Fin', 'Raison']],
                    body: futureRes.map(r => [
                        pcs.find(p => p.id === r.pc_id)?.name || `PC #${r.pc_id}`,
                        r.user_name,
                        new Date(r.start_date).toLocaleDateString('fr-FR'),
                        new Date(r.end_date).toLocaleDateString('fr-FR'),
                        (r.reason || '-').substring(0, 30)
                    ]),
                    headStyles: { fillColor: [139, 92, 246] },
                    alternateRowStyles: { fillColor: [243, 232, 255] },
                    styles: { fontSize: 9, cellPadding: 4 }
                });
            }

            // ========== HISTORICAL SECTION ==========
            if (filteredHistory.length > 0) {
                doc.addPage();
                doc.setFillColor(59, 130, 246);
                doc.rect(0, 0, 220, 25, 'F');
                doc.setFontSize(16);
                doc.setTextColor(255);
                doc.text(`HISTORIQUE DES OPERATIONS`, 14, 16);

                doc.setFontSize(10);
                doc.setTextColor(100);
                doc.text(`Periode: ${new Date(reportDateRange.start).toLocaleDateString('fr-FR')} - ${new Date(reportDateRange.end).toLocaleDateString('fr-FR')} | ${filteredHistory.length} operations`, 14, 35);

                const actionMap = {
                    'loan': 'Pret',
                    'return': 'Retour',
                    'out_of_service': 'Panne',
                    'repair': 'Panne',
                    'restore': 'Restaure',
                    'remaster': 'Remaster',
                    'remaster_start': 'Debut Remaster',
                    'remaster_end': 'Fin Remaster'
                };

                autoTable(doc, {
                    startY: 42,
                    head: [['Date', 'Type', 'PC', 'Utilisateur', 'Raison', 'Cree par']],
                    body: filteredHistory.map(h => [
                        new Date(h.start_date || h.timestamp).toLocaleDateString('fr-FR'),
                        actionMap[h.action_type] || h.action_type,
                        h.pc_name || '-',
                        h.user_name || '-',
                        (h.reason || h.notes || '-').substring(0, 30),
                        h.created_by_name || '-'
                    ]),
                    headStyles: { fillColor: [59, 130, 246], fontSize: 9 },
                    alternateRowStyles: { fillColor: [248, 250, 252] },
                    styles: { fontSize: 8, cellPadding: 3 },
                    columnStyles: {
                        0: { cellWidth: 22 },
                        1: { cellWidth: 26 },
                        2: { cellWidth: 25 },
                        3: { cellWidth: 30 },
                        4: { cellWidth: 48 },
                        5: { cellWidth: 25 }
                    }
                });
            }

            // ========== SUMMARY STATISTICS ==========
            doc.addPage();
            doc.setFillColor(16, 185, 129);
            doc.rect(0, 0, 220, 25, 'F');
            doc.setFontSize(16);
            doc.setTextColor(255);
            doc.text('RESUME STATISTIQUE', 14, 16);

            // Count actions by type
            const loanCount = filteredHistory.filter(h => h.action_type === 'loan').length;
            const returnCount = filteredHistory.filter(h => h.action_type === 'return').length;
            const remasterCount = filteredHistory.filter(h => h.action_type === 'remaster' || h.action_type === 'remaster_start').length;
            const repairCount = filteredHistory.filter(h => h.action_type === 'out_of_service' || h.action_type === 'repair').length;
            const restoreCount = filteredHistory.filter(h => h.action_type === 'restore').length;

            autoTable(doc, {
                startY: 35,
                head: [['Metrique', 'Valeur']],
                body: [
                    ['Prets effectues', loanCount],
                    ['Retours enregistres', returnCount],
                    ['Remasterisations', remasterCount],
                    ['Mises hors service', repairCount],
                    ['Remises en service', restoreCount],
                    ['Total operations', filteredHistory.length],
                    ['', ''],
                    ['Taux de rotation', `${stats.total > 0 ? ((loanCount / stats.total) * 100).toFixed(1) : 0}%`],
                    ['Reservations futures', futureRes.length]
                ],
                headStyles: { fillColor: [16, 185, 129] },
                styles: { fontSize: 11, cellPadding: 6 },
                columnStyles: { 0: { fontStyle: 'bold' } }
            });

            // Footer on all pages
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150);
                doc.text(`Page ${i} / ${pageCount} - Rapport Parc PC - ${new Date().toLocaleDateString('fr-FR')}`, 14, 290);
            }

            doc.save(`rapport-parc-pc-${reportDateRange.start}-${reportDateRange.end}.pdf`);
            setShowReportModal(false);
            showAlert('success', 'Succes', 'Rapport complet telecharge !');
        } catch (error) {
            console.error('PDF Error:', error);
            showAlert('error', 'Erreur', error.message);
        }
    };


    const getStatusBadge = (pc) => {
        const isOverdue = pc.status === 'loaned' && pc.loan_end_expected && new Date(pc.loan_end_expected) < new Date();

        // Check for active reservation
        const today = new Date().setHours(0, 0, 0, 0);
        const activeRes = reservations.find(r =>
            r.pc_id === pc.id &&
            new Date(r.start_date) <= today &&
            new Date(r.end_date) >= today
        );

        if (activeRes && pc.status !== 'loaned') {
            return (
                <div
                    style={{ display: 'flex', flexDirection: 'column', gap: '4px', cursor: 'pointer' }}
                    onClick={(e) => {
                        e.stopPropagation();
                        setDeleteReservationModal(activeRes);
                    }}
                    title="Cliquer pour annuler la réservation"
                >
                    <span className="status-badge" style={{ background: '#f3e8ff', color: '#8b5cf6', borderColor: '#d8b4fe' }}>
                        <CalendarClock size={12} /> Réservé
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                        Pour {activeRes.user_name}
                    </span>
                </div>
            );
        }

        if (isOverdue) {
            return <span className="status-badge overdue">⚠️ {t('overdue')}</span>;
        }

        switch (pc.status) {
            case 'available':
                // Check for future reservation (soon)
                const futureRes = reservations.find(r =>
                    r.pc_id === pc.id &&
                    new Date(r.start_date) > today
                );
                return (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <span className="status-badge available">🟢 {t('available')}</span>
                        {pc.is_remastering === 1 && (
                            <span className="status-badge remastering">
                                <Disc size={12} /> {t('remastering')}
                            </span>
                        )}
                        {futureRes && (
                            <span
                                title={`Réservé le ${new Date(futureRes.start_date).toLocaleDateString()} - Cliquer pour annuler`}
                                style={{ fontSize: '12px', color: '#8b5cf6', cursor: 'pointer' }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteReservationModal(futureRes);
                                }}
                            >
                                📅
                            </span>
                        )}
                    </div>
                );
            case 'loaned':
                return <span className="status-badge loaned">🟠 {t('loaned')}</span>;
            case 'out_of_service':
                return <span className="status-badge out-of-service">🔴 {t('outOfService')}</span>;
            default:
                return <span className="status-badge">{pc.status}</span>;
        }
    };

    const filteredPCs = pcs.filter(pc => {
        if (filter === 'all') return true;
        if (filter === 'remastering') return pc.is_remastering === 1;
        if (filter === 'overdue') {
            return pc.status === 'loaned' && pc.loan_end_expected && new Date(pc.loan_end_expected) < new Date();
        }
        return pc.status === filter;
    });

    const loanReasons = [
        'Panne PC principal',
        'Réparation en cours',
        'Remplacement temporaire',
        'Nouveau collaborateur',
        'Formation',
        'Déplacement',
        'Autre'
    ];

    return (
        <div className="loan-pcs-page">
            <TutorialButton tutorialKey="loanPC" style={{ bottom: '2rem', right: '2rem' }} />
            <div className="page-header">
                <div>
                    <h1 className="page-title"><Laptop size={28} /> {t('loanPC')}</h1>
                    <p className="page-subtitle">{t('loanPCManagement')}</p>
                </div>
                <div className="header-actions">
                    <div className="view-toggle" style={{ display: 'flex', background: 'var(--bg-secondary)', padding: '4px', borderRadius: '8px', marginRight: '1rem' }}>
                        <button
                            onClick={() => setViewMode('list')}
                            style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                border: 'none',
                                background: viewMode === 'list' ? 'var(--primary-color)' : 'transparent',
                                color: viewMode === 'list' ? 'white' : 'var(--text-secondary)',
                                cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '6px',
                                fontWeight: 500
                            }}
                        >
                            <Laptop size={16} /> Liste
                        </button>
                        <button
                            onClick={() => setViewMode('calendar')}
                            style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                border: 'none',
                                background: viewMode === 'calendar' ? 'var(--primary-color)' : 'transparent',
                                color: viewMode === 'calendar' ? 'white' : 'var(--text-secondary)',
                                cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '6px',
                                fontWeight: 500
                            }}
                        >
                            <Calendar size={16} /> Calendrier
                        </button>
                    </div>

                    <button className="secondary-btn" onClick={() => setShowScanner(true)}>
                        <Scan size={18} />
                        Scan QR
                    </button>

                    <button className="secondary-btn" onClick={handleOpenHistory} title={t('loanHistory')}>
                        <History size={18} />
                    </button>

                    <button className="secondary-btn" onClick={() => setShowReportModal(true)} title="Générer rapport PDF">
                        <FileText size={18} />
                    </button>

                    <button className="add-btn" onClick={() => setShowAddModal(true)}>
                        <Plus size={18} />
                        {t('addPC')}
                    </button>
                </div>
            </div>

            {viewMode === 'list' ? (
                <>
                    {/* Stats Cards */}
                    <div className="stats-row">
                        <div className="stat-card gradient-blue">
                            <div className="stat-icon"><Laptop size={24} /></div>
                            <div className="stat-info">
                                <span className="stat-value">{stats.total}</span>
                                <span className="stat-label">Total</span>
                            </div>
                        </div>
                        <div className="stat-card gradient-green">
                            <div className="stat-icon"><CheckCircle size={24} /></div>
                            <div className="stat-info">
                                <span className="stat-value">{stats.available}</span>
                                <span className="stat-label">{t('available')}</span>
                            </div>
                        </div>
                        <div className="stat-card gradient-orange">
                            <div className="stat-icon"><Send size={24} /></div>
                            <div className="stat-info">
                                <span className="stat-value">{stats.loaned}</span>
                                <span className="stat-label">{t('loaned')}</span>
                            </div>
                        </div>
                        <div className="stat-card gradient-red">
                            <div className="stat-icon"><XCircle size={24} /></div>
                            <div className="stat-info">
                                <span className="stat-value">{stats.outOfService}</span>
                                <span className="stat-label">{t('outOfService')}</span>
                            </div>
                        </div>
                    </div>

                    {/* Overdue Alert */}
                    {stats.overdue?.length > 0 && (
                        <div className="alert alert-error" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <AlertTriangle size={20} />
                            <span><strong>{stats.overdue.length} {t('overdue')}</strong>!</span>
                        </div>
                    )}

                    {/* Filters */}
                    <div className="filter-bar">
                        <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
                            {t('allStatuses')} ({pcs.length})
                        </button>
                        <button className={`filter-btn ${filter === 'available' ? 'active' : ''}`} onClick={() => setFilter('available')}>
                            🟢 {t('available')} ({stats.available})
                        </button>
                        <button className={`filter-btn ${filter === 'loaned' ? 'active' : ''}`} onClick={() => setFilter('loaned')}>
                            🟠 {t('loaned')} ({stats.loaned})
                        </button>
                        <button className={`filter-btn ${filter === 'out_of_service' ? 'active' : ''}`} onClick={() => setFilter('out_of_service')}>
                            🔴 {t('outOfService')} ({stats.outOfService})
                        </button>
                        <button className={`filter-btn ${filter === 'remastering' ? 'active' : ''}`} onClick={() => setFilter('remastering')}>
                            🔵 {t('remastering')} ({stats.remastering || 0})
                        </button>

                        <button className={`filter-btn ${filter === 'overdue' ? 'active' : ''}`} onClick={() => setFilter('overdue')}>
                            ⚠️ {t('overdue')} ({stats.overdue?.length || 0})
                        </button>
                    </div>

                    {/* PC Table */}
                    <div className="card">
                        <div className="table-container">
                            <table className="data-table loan-table">
                                <thead>
                                    <tr>
                                        <th>{t('name')}</th>
                                        <th>{t('serialNumber')}</th>
                                        <th>{t('status')}</th>
                                        <th>{t('user')}</th>
                                        <th>{t('reason')}</th>
                                        <th>{t('date')}</th>
                                        <th>{t('actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredPCs.map(pc => (
                                        <tr key={pc.id} className={pc.status === 'loaned' && pc.loan_end_expected && new Date(pc.loan_end_expected) < new Date() ? 'overdue-row' : ''}>
                                            <td>
                                                <div className="pc-name">
                                                    <Laptop size={16} /> {pc.name}
                                                </div>
                                            </td>
                                            <td>{pc.serial_number || '-'}</td>
                                            <td>{getStatusBadge(pc)}</td>
                                            <td>{pc.current_user || '-'}</td>
                                            <td>{pc.loan_reason || pc.notes || '-'}</td>
                                            <td>
                                                {pc.loan_start && (
                                                    <div className="date-range">
                                                        <span>{new Date(pc.loan_start).toLocaleDateString('fr-FR')}</span>
                                                        {pc.loan_end_expected && (
                                                            <span> → {new Date(pc.loan_end_expected).toLocaleDateString('fr-FR')}</span>
                                                        )}
                                                    </div>
                                                )}
                                                {!pc.loan_start && '-'}
                                            </td>
                                            <td>
                                                <div className="action-buttons">
                                                    {pc.status === 'available' && (
                                                        <>
                                                            <button className="icon-btn loan" title="Prêter" onClick={() => openLoanModal(pc)}>
                                                                <Send size={16} />
                                                            </button>
                                                            <button className="icon-btn reserve" title="Réserver" onClick={() => setReservationModal(pc)}>
                                                                <CalendarClock size={16} />
                                                            </button>
                                                            <button
                                                                className={`icon-btn remaster ${pc.is_remastering ? 'active' : ''}`}
                                                                title={t('remaster')}
                                                                onClick={() => handleRemaster(pc)}
                                                            >
                                                                <Disc size={16} />
                                                            </button>
                                                        </>
                                                    )}
                                                    {pc.status === 'loaned' && (
                                                        <button className="icon-btn return" title="Retour" onClick={() => setReturnModal(pc)}>
                                                            <RotateCcw size={16} />
                                                        </button>
                                                    )}
                                                    {pc.status !== 'out_of_service' && (
                                                        <button className="icon-btn warning" title="Hors service" onClick={() => setOutOfServiceModal(pc)}>
                                                            <Wrench size={16} />
                                                        </button>
                                                    )}
                                                    {pc.status === 'out_of_service' && (
                                                        <button className="icon-btn restore" title={t('restore')} onClick={() => setRestoreModal(pc)}>
                                                            <CheckCircle size={16} />
                                                        </button>
                                                    )}
                                                    {user?.role === 'admin' && (
                                                        <button className="icon-btn danger" title="Supprimer" onClick={() => setDeleteModal(pc)}>
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredPCs.length === 0 && (
                                        <tr>
                                            <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>
                                                {t('noResults')}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Add PC Modal */}
                    {showAddModal && (
                        <div className="modal-overlay">
                            <div className="modal pro-modal">
                                <div className="modal-header">
                                    <div className="modal-icon" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' }}>
                                        <Laptop size={24} />
                                    </div>
                                    <div>
                                        <h2>{t('addPC')}</h2>
                                        <p className="modal-subtitle">{t('fillDetails')}</p>
                                    </div>
                                </div>
                                <form onSubmit={handleAddPC} className="pro-form">
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label><Laptop size={14} /> {t('name')} <span className="required">*</span></label>
                                            <input
                                                required
                                                value={newPC.name}
                                                onChange={e => setNewPC({ ...newPC, name: e.target.value })}
                                                placeholder="LAPTOP-PRET-01"
                                            />
                                            <span className="form-hint">Identifiant unique du PC</span>
                                        </div>
                                        <div className="form-group">
                                            <label>{t('serialNumber')}</label>
                                            <input
                                                value={newPC.serial_number}
                                                onChange={e => setNewPC({ ...newPC, serial_number: e.target.value })}
                                                placeholder="SN123456789"
                                            />
                                            <span className="form-hint">Numéro constructeur</span>
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>{t('description')}</label>
                                        <textarea
                                            rows={3}
                                            value={newPC.notes}
                                            onChange={e => setNewPC({ ...newPC, notes: e.target.value })}
                                            placeholder="Modèle, RAM, stockage, état général..."
                                        />
                                    </div>
                                    <div className="modal-actions">
                                        <button type="button" className="cancel-btn" onClick={() => setShowAddModal(false)}>
                                            {t('cancel')}
                                        </button>
                                        <button type="submit" className="submit-btn pro-submit">
                                            <Plus size={18} />
                                            {t('addPC')}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Loan Modal */}
                    {showLoanModal && selectedPC && (
                        <div className="modal-overlay">
                            <div className="modal pro-modal">
                                <div className="modal-header">
                                    <div className="modal-icon" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}>
                                        <Send size={24} />
                                    </div>
                                    <div>
                                        <h2>{t('loanPC') || 'Prêter le PC'}</h2>
                                        <p className="modal-subtitle">{selectedPC.name}</p>
                                    </div>
                                </div>
                                <form onSubmit={handleLoan} className="pro-form">
                                    <div className="form-group">
                                        <label>{t('borrowerName')} *</label>
                                        <div className="input-affix-wrapper">
                                            <User size={16} className="input-icon-left" />
                                            <input
                                                required
                                                value={loanData.user_name}
                                                onChange={e => setLoanData({ ...loanData, user_name: e.target.value })}
                                                placeholder="ex: Jean Dupont ou PRT4541"
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>{t('reason')}</label>
                                        <select
                                            value={loanData.reason}
                                            onChange={e => setLoanData({ ...loanData, reason: e.target.value })}
                                        >
                                            <option value="">Sélectionner une raison...</option>
                                            {loanReasons.map(r => (
                                                <option key={r} value={r}>{r}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>{t('dueDate')}</label>
                                        <div className="input-affix-wrapper">
                                            <Calendar size={16} className="input-icon-left" />
                                            <input
                                                type="date"
                                                value={loanData.end_date}
                                                onChange={e => setLoanData({ ...loanData, end_date: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>{t('description')}</label>
                                        <textarea
                                            value={loanData.notes}
                                            onChange={e => setLoanData({ ...loanData, notes: e.target.value })}
                                            placeholder="Informations supplémentaires..."
                                        />
                                    </div>
                                    <div className="modal-actions">
                                        <button type="button" className="cancel-btn" onClick={() => setShowLoanModal(false)}>
                                            {t('cancel')}
                                        </button>
                                        <button type="submit" className="submit-btn pro-submit" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}>
                                            <Send size={18} />
                                            {t('confirmLoan')}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* History Modal */}
                    {showHistoryModal && (
                        <div className="modal-overlay">
                            <div className="modal pro-modal" style={{ maxWidth: '1000px' }}>
                                <div className="modal-header">
                                    <div className="modal-icon" style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' }}>
                                        <History size={24} />
                                    </div>
                                    <div>
                                        <h2>{t('loanHistory')}</h2>
                                        <p className="modal-subtitle">{history.length} entrées</p>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
                                        <button
                                            className="secondary-btn"
                                            onClick={() => {
                                                const csvContent = [
                                                    ['PC', 'N° Série', 'Utilisateur', 'Raison', 'Date Début', 'Date Fin Prévue', 'Date Retour', 'Notes', 'Créé par'].join(';'),
                                                    ...history.map(h => [
                                                        h.pc_name,
                                                        h.serial_number || '',
                                                        h.user_name,
                                                        h.reason || '',
                                                        h.start_date ? new Date(h.start_date).toLocaleDateString('fr-FR') : '',
                                                        h.end_date ? new Date(h.end_date).toLocaleDateString('fr-FR') : '',
                                                        h.actual_return_date ? new Date(h.actual_return_date).toLocaleDateString('fr-FR') : 'Non restitué',
                                                        h.notes || '',
                                                        h.created_by_name || ''
                                                    ].join(';'))
                                                ].join('\n');
                                                const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
                                                const link = document.createElement('a');
                                                link.href = URL.createObjectURL(blob);
                                                link.download = `historique_prets_${new Date().toISOString().split('T')[0]}.csv`;
                                                link.click();
                                            }}
                                            style={{ padding: '0.5rem 1rem' }}
                                        >
                                            <Download size={16} /> Exporter CSV
                                        </button>
                                        <button className="close-btn" onClick={() => setShowHistoryModal(false)}>
                                            <X size={20} />
                                        </button>
                                    </div>
                                </div>
                                <div className="table-container" style={{ maxHeight: '500px', overflow: 'auto' }}>
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Type</th>
                                                <th>PC</th>
                                                <th>{t('user')}</th>
                                                <th>{t('reason')}</th>
                                                <th>{t('startDate')}</th>
                                                <th>{t('returnDate')}</th>
                                                <th>Créé par</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {history.map(h => (
                                                <tr key={h.id}>
                                                    <td>
                                                        <span className={`status-badge ${h.action_type === 'loan' ? 'loaned' :
                                                            h.action_type === 'repair' ? 'out-of-service' :
                                                                h.action_type === 'restore' ? 'available' :
                                                                    h.action_type?.includes('remaster') ? 'remastering' : ''
                                                            }`} style={{ fontSize: '0.75rem' }}>
                                                            {h.action_type === 'loan' ? '📋 Prêt' :
                                                                h.action_type === 'repair' ? '🔧 Panne' :
                                                                    h.action_type === 'restore' ? '✅ Restauré' :
                                                                        h.action_type === 'remaster_start' ? '💿 Remaster' :
                                                                            h.action_type === 'remaster_end' ? '✅ Fin Remaster' :
                                                                                h.action_type || 'Prêt'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div style={{ fontWeight: 600 }}>{h.pc_name}</div>
                                                    </td>
                                                    <td>
                                                        {h.user_name !== '-' ? (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                <User size={14} />
                                                                {h.user_name}
                                                            </div>
                                                        ) : '-'}
                                                    </td>
                                                    <td>{h.reason || '-'}</td>
                                                    <td>{new Date(h.start_date).toLocaleDateString('fr-FR')}</td>
                                                    <td>
                                                        {h.action_type === 'loan' ? (
                                                            <span className={`status-badge ${h.actual_return_date ? 'available' : 'loaned'}`}>
                                                                {h.actual_return_date ? new Date(h.actual_return_date).toLocaleDateString('fr-FR') : 'En cours'}
                                                            </span>
                                                        ) : '-'}
                                                    </td>
                                                    <td>
                                                        <span style={{ opacity: 0.7 }}>{h.created_by_name || '-'}</span>
                                                    </td>
                                                </tr>
                                            ))}
                                            {history.length === 0 && (
                                                <tr>
                                                    <td colSpan="7" style={{ textAlign: 'center' }}>{t('noHistoryFound')}</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <div style={{ marginTop: '2rem' }}>
                    <LoanCalendar
                        loans={history}
                        reservations={reservations}
                        onCancelReservation={(res) => setDeleteReservationModal(res)}
                    />
                </div>
            )
            }

            {/* Confirmation Modals */}
            <ReservationModal
                isOpen={!!reservationModal}
                onClose={() => setReservationModal(null)}
                pc={reservationModal}
                onConfirm={() => {
                    loadHistory();
                    fetchData();
                }}
            />

            <ConfirmModal
                isOpen={!!restoreModal}
                onClose={() => setRestoreModal(null)}
                onConfirm={handleRestore}
                title={t('restore')}
                message={t('confirmRestore')}
                confirmText={t('restore')}
                cancelText={t('cancel')}
                type="success"
            />

            {/* NEW: Conflict Modal */}
            <ConfirmModal
                isOpen={!!conflictModal}
                onClose={() => setConflictModal(null)}
                onConfirm={() => {
                    if (conflictModal?.isActiveReservation) {
                        // Active reservation - override it
                        executeLoan(true);
                    } else {
                        // Future conflict warning - proceed without override
                        executeLoan(false);
                    }
                }}
                title={conflictModal?.isActiveReservation ? "⚠️ Réservation Active" : "Conflit de Réservation"}
                message={conflictModal?.message + (conflictModal?.subMessage ? '\n\n' + conflictModal.subMessage : '')}
                confirmText={conflictModal?.isActiveReservation ? "Annuler réservation et Prêter" : "Forcer le Prêt"}
                cancelText="Annuler"
                type="warning"
                isDangerous={conflictModal?.isActiveReservation}
            />

            {/* NEW: Generic Alert Modal */}
            <ConfirmModal
                isOpen={!!alertData}
                onClose={() => setAlertData(null)}
                onConfirm={() => setAlertData(null)}
                title={alertData?.title}
                message={alertData?.message}
                confirmText="OK"
                cancelText={null} // Hide cancel button
                type={alertData?.type || 'info'}
            />

            <ConfirmModal
                isOpen={!!returnModal}
                onClose={() => setReturnModal(null)}
                onConfirm={handleReturn}
                title={t('return')}
                message={`${t('confirmReturn')} ${returnModal?.name} ?`}
                confirmText={t('return')}
                cancelText={t('cancel')}
                type="info"
            />

            <ConfirmModal
                isOpen={!!deleteModal}
                onClose={() => setDeleteModal(null)}
                onConfirm={handleDelete}
                title={t('remove')}
                message={`${t('confirmRemove')} ${deleteModal?.name} ?`}
                confirmText={t('remove')}
                cancelText={t('cancel')}
                isDangerous={true}
                type="danger"
            />

            <InputModal
                isOpen={!!outOfServiceModal}
                onClose={() => setOutOfServiceModal(null)}
                onSubmit={handleOutOfService}
                title="Mettre Hors Service"
                label="Raison (panne, réparation, etc.)"
                placeholder="Ex: Écran cassé"
                confirmText="Valider"
                type="danger"
            />
            {/* NEW: Delete Reservation Modal */}
            <ConfirmModal
                isOpen={!!deleteReservationModal}
                onClose={() => setDeleteReservationModal(null)}
                onConfirm={handleCancelReservation}
                title="Annuler la réservation"
                message={`Voulez-vous vraiment annuler la réservation pour ${deleteReservationModal?.user_name} ?`}
                confirmText="Annuler la réservation"
                cancelText="Garder"
                isDangerous={true}
                type="danger"
            />

            {/* Delete PC Modal */}
            <ConfirmModal
                isOpen={!!deleteModal}
                onClose={() => setDeleteModal(null)}
                onConfirm={handleDeletePC}
                title="Supprimer le PC"
                message={`Voulez-vous vraiment supprimer "${deleteModal?.name}" du parc de prêt ? Cette action est irréversible.`}
                confirmText="Supprimer"
                cancelText="Annuler"
                isDangerous={true}
                type="danger"
            />

            {/* QR Scanner Modal */}
            {showScanner && (
                <QRScannerModal
                    onScan={handleScanResult}
                    onClose={() => setShowScanner(false)}
                />
            )}

            {/* Report Configuration Modal */}
            {showReportModal && (
                <div className="modal-overlay" onClick={() => setShowReportModal(false)} style={{ background: 'rgba(0, 0, 0, 0.9)' }}>
                    <div
                        className="modal-content report-modal"
                        onClick={e => e.stopPropagation()}
                        style={{
                            maxWidth: '520px',
                            background: '#0f172a',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            boxShadow: '0 0 60px rgba(59, 130, 246, 0.3), 0 0 120px rgba(139, 92, 246, 0.2)',
                            borderRadius: '20px',
                            overflow: 'hidden',
                            animation: 'modalGlow 3s ease-in-out infinite alternate'
                        }}
                    >
                        <button
                            className="modal-close"
                            onClick={() => setShowReportModal(false)}
                            style={{
                                position: 'absolute',
                                top: '1rem',
                                right: '1rem',
                                background: 'rgba(255,255,255,0.1)',
                                border: 'none',
                                borderRadius: '50%',
                                width: '36px',
                                height: '36px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                color: 'white',
                                zIndex: 10
                            }}
                        >
                            <X size={20} />
                        </button>

                        {/* Animated Header */}
                        <div style={{
                            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #3b82f6 100%)',
                            backgroundSize: '200% 200%',
                            animation: 'gradientShift 4s ease infinite',
                            padding: '1.75rem',
                            color: 'white',
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

                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', position: 'relative', zIndex: 1 }}>
                                <div style={{
                                    background: 'rgba(255,255,255,0.2)',
                                    borderRadius: '14px',
                                    padding: '0.875rem',
                                    boxShadow: '0 0 20px rgba(255,255,255,0.3)'
                                }}>
                                    <FileText size={32} />
                                </div>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 600, textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>
                                        Générer Rapport du Parc
                                    </h2>
                                    <p style={{ margin: '0.25rem 0 0', opacity: 0.9, fontSize: '0.9rem' }}>
                                        Rapport complet avec historique filtré
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="modal-body" style={{ padding: '1.75rem', background: '#0f172a' }}>
                            {/* Date Range Section */}
                            <div style={{ marginBottom: '2rem' }}>
                                <h4 style={{
                                    marginBottom: '1.5rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    color: '#e2e8f0',
                                    fontSize: '1rem'
                                }}>
                                    <Calendar size={20} style={{ color: '#3b82f6' }} /> Période de l'historique
                                </h4>
                                <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                                    <div className="form-group" style={{ flex: 1, minWidth: '160px' }}>
                                        <label style={{ color: '#94a3b8', marginBottom: '0.5rem', display: 'block' }}>Date de début</label>
                                        <input
                                            type="date"
                                            value={reportDateRange.start}
                                            onChange={(e) => setReportDateRange({ ...reportDateRange, start: e.target.value })}
                                            style={{
                                                width: '100%',
                                                background: '#1e293b',
                                                border: '1px solid #334155',
                                                borderRadius: '10px',
                                                padding: '0.75rem',
                                                color: '#e2e8f0',
                                                fontSize: '0.95rem'
                                            }}
                                        />
                                    </div>
                                    <div className="form-group" style={{ flex: 1, minWidth: '160px' }}>
                                        <label style={{ color: '#94a3b8', marginBottom: '0.5rem', display: 'block' }}>Date de fin</label>
                                        <input
                                            type="date"
                                            value={reportDateRange.end}
                                            onChange={(e) => setReportDateRange({ ...reportDateRange, end: e.target.value })}
                                            style={{
                                                width: '100%',
                                                background: '#1e293b',
                                                border: '1px solid #334155',
                                                borderRadius: '10px',
                                                padding: '0.75rem',
                                                color: '#e2e8f0',
                                                fontSize: '0.95rem'
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Report Contents Preview */}
                            <div style={{
                                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1))',
                                borderRadius: '14px',
                                padding: '1.25rem',
                                marginBottom: '1.75rem',
                                border: '1px solid rgba(59, 130, 246, 0.2)'
                            }}>
                                <h4 style={{ marginBottom: '0.875rem', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    📊 Le rapport inclura :
                                </h4>
                                <ul style={{
                                    margin: 0,
                                    paddingLeft: '1.25rem',
                                    color: '#94a3b8',
                                    lineHeight: 2,
                                    fontSize: '0.9rem'
                                }}>
                                    <li>📦 État actuel du parc (disponibles, prêtés, hors service)</li>
                                    <li>💻 Inventaire complet de tous les PC</li>
                                    <li>🟠 Prêts en cours avec ⚠️ statut de retard</li>
                                    <li>💿 PC en remasterisation</li>
                                    <li>📅 Réservations futures</li>
                                    <li>📜 Historique des opérations (période sélectionnée)</li>
                                    <li>📈 Statistiques récapitulatives</li>
                                </ul>
                            </div>

                            {/* Action Buttons */}
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                                <button
                                    className="secondary-btn"
                                    onClick={() => setShowReportModal(false)}
                                    style={{
                                        background: '#1e293b',
                                        color: '#94a3b8',
                                        border: '1px solid #334155',
                                        padding: '0.75rem 1.5rem',
                                        borderRadius: '10px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    Annuler
                                </button>
                                <button
                                    className="add-btn"
                                    onClick={handleDownloadLoanReport}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                                        color: 'white',
                                        border: 'none',
                                        padding: '0.75rem 1.5rem',
                                        borderRadius: '10px',
                                        cursor: 'pointer',
                                        fontWeight: 500,
                                        boxShadow: '0 4px 20px rgba(59, 130, 246, 0.4)',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <Download size={18} />
                                    Générer le PDF
                                </button>
                            </div>
                        </div>

                        {/* CSS Animations */}
                        <style>{`
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
                            .report-modal input[type="date"]::-webkit-calendar-picker-indicator {
                                filter: invert(0.8);
                            }
                        `}</style>
                    </div>
                </div>
            )}
        </div >
    );
}
