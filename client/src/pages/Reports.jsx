import { useState, useEffect } from 'react';
import axios from 'axios';
import { FileText, Download, Calendar, Package, TrendingDown, TrendingUp, Printer, Activity, BarChart3 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import TutorialButton from '../components/TutorialButton';


export default function Reports() {
    const { t, language } = useLanguage();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        try {
            const { data } = await axios.get('/api/logs');
            setLogs(data);
        } catch (error) {
            console.error('Failed to fetch logs', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredLogs = logs.filter(log => {
        const logDate = new Date(log.timestamp).toISOString().split('T')[0];
        return logDate >= dateRange.start && logDate <= dateRange.end;
    });

    // Helper to humanize action names
    const humanizeAction = (action) => {
        const actionMap = {
            'ADD_PRODUCT': language === 'fr' ? '📦 Ajout produit' : '📦 Add Product',
            'UPDATE_STOCK': language === 'fr' ? '🔄 Mise à jour stock' : '🔄 Stock Update',
            'DELETE_PRODUCT': language === 'fr' ? '🗑️ Suppression' : '🗑️ Delete',
            'ASSIGN_EQUIPMENT': language === 'fr' ? '👤 Attribution' : '👤 Assignment',
            'RETURN_EQUIPMENT': language === 'fr' ? '↩️ Retour' : '↩️ Return',
        };
        return actionMap[action] || action.replace(/_/g, ' ');
    };

    const stats = {
        entries: filteredLogs.filter(l => l.quantity_change > 0).reduce((sum, l) => sum + l.quantity_change, 0),
        exits: Math.abs(filteredLogs.filter(l => l.quantity_change < 0).reduce((sum, l) => sum + l.quantity_change, 0)),
        operations: filteredLogs.length
    };

    // Net balance calculation
    const netBalance = stats.entries - stats.exits;

    const handlePrint = () => {
        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>${language === 'fr' ? 'Rapport Inventaire' : 'Inventory Report'} - ${dateRange.start} → ${dateRange.end}</title>
                <style>
                    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; color: #1a1a1a; }
                    h1 { color: #3b82f6; border-bottom: 3px solid #3b82f6; padding-bottom: 10px; }
                    .period { background: #f0f9ff; padding: 12px 20px; border-radius: 8px; margin: 20px 0; font-size: 1.1em; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; }
                    th { background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; font-weight: 600; }
                    tr:nth-child(even) { background-color: #f8fafc; }
                    tr:hover { background-color: #e0f2fe; }
                    .stats { display: flex; gap: 20px; margin: 25px 0; flex-wrap: wrap; }
                    .stat-box { padding: 20px; background: linear-gradient(135deg, #f0f9ff, #e0f2fe); border-radius: 12px; min-width: 140px; text-align: center; border: 1px solid #bae6fd; }
                    .stat-value { font-size: 28px; font-weight: 700; }
                    .stat-label { font-size: 14px; color: #64748b; margin-top: 5px; }
                    .positive { color: #10b981; }
                    .negative { color: #ef4444; }
                    .neutral { color: #3b82f6; }
                    .summary { background: #fef3c7; padding: 15px 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b; }
                    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 12px; }
                </style>
            </head>
            <body>
                <h1>📊 ${language === 'fr' ? 'Rapport d\'Inventaire IT' : 'IT Inventory Report'}</h1>
                
                <div class="period">
                    <strong>${language === 'fr' ? 'Période analysée' : 'Analysis Period'}:</strong> 
                    ${new Date(dateRange.start).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} 
                    → ${new Date(dateRange.end).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
                
                <div class="stats">
                    <div class="stat-box">
                        <div class="stat-value positive">+${stats.entries}</div>
                        <div class="stat-label">${language === 'fr' ? 'Entrées Stock' : 'Stock In'}</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-value negative">-${stats.exits}</div>
                        <div class="stat-label">${language === 'fr' ? 'Sorties Stock' : 'Stock Out'}</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-value ${netBalance >= 0 ? 'positive' : 'negative'}">${netBalance >= 0 ? '+' : ''}${netBalance}</div>
                        <div class="stat-label">${language === 'fr' ? 'Balance Nette' : 'Net Balance'}</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-value neutral">${stats.operations}</div>
                        <div class="stat-label">${language === 'fr' ? 'Total Opérations' : 'Total Operations'}</div>
                    </div>
                </div>

                <div class="summary">
                    <strong>${language === 'fr' ? 'Résumé' : 'Summary'}:</strong> 
                    ${language === 'fr'
                ? `Durant cette période, ${stats.entries} unités ont été ajoutées et ${stats.exits} unités ont été retirées du stock, pour un solde net de ${netBalance >= 0 ? '+' : ''}${netBalance} unités.`
                : `During this period, ${stats.entries} units were added and ${stats.exits} units were removed from stock, for a net balance of ${netBalance >= 0 ? '+' : ''}${netBalance} units.`
            }
                </div>

                <h2>${language === 'fr' ? 'Détail des Opérations' : 'Operations Detail'}</h2>
                <table>
                    <thead>
                        <tr>
                            <th>${language === 'fr' ? 'Date & Heure' : 'Date & Time'}</th>
                            <th>${language === 'fr' ? 'Type d\'Opération' : 'Operation Type'}</th>
                            <th>${language === 'fr' ? 'Description' : 'Description'}</th>
                            <th>${language === 'fr' ? 'Quantité' : 'Quantity'}</th>
                            <th>${language === 'fr' ? 'Effectué par' : 'Performed by'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredLogs.map(log => `
                            <tr>
                                <td>${new Date(log.timestamp).toLocaleString(language === 'fr' ? 'fr-FR' : 'en-US')}</td>
                                <td>${humanizeAction(log.action)}</td>
                                <td>${log.details}</td>
                                <td class="${log.quantity_change > 0 ? 'positive' : log.quantity_change < 0 ? 'negative' : ''}" style="font-weight: 600;">
                                    ${log.quantity_change > 0 ? '+' : ''}${log.quantity_change || '-'}
                                </td>
                                <td>${log.username}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <div class="footer">
                    <strong>${language === 'fr' ? 'Rapport généré le' : 'Report generated on'}:</strong> 
                    ${new Date().toLocaleString(language === 'fr' ? 'fr-FR' : 'en-US')}
                </div>
            </body>
            </html>
        `;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.print();
    };

    const handleDownloadPDF = () => {
        try {
            const doc = new jsPDF();

            // Header
            doc.setFontSize(22);
            doc.setTextColor(59, 130, 246);
            doc.text(language === 'fr' ? 'Rapport d\'Inventaire IT' : 'IT Inventory Report', 14, 22);

            doc.setFontSize(11);
            doc.setTextColor(100);
            const startFormatted = new Date(dateRange.start).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US');
            const endFormatted = new Date(dateRange.end).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US');
            doc.text(`${language === 'fr' ? 'Période' : 'Period'}: ${startFormatted} → ${endFormatted}`, 14, 32);
            doc.text(`${language === 'fr' ? 'Généré le' : 'Generated'}: ${new Date().toLocaleString(language === 'fr' ? 'fr-FR' : 'en-US')}`, 14, 38);

            // Stats Summary
            autoTable(doc, {
                startY: 48,
                head: [[
                    language === 'fr' ? 'Entrées' : 'Stock In',
                    language === 'fr' ? 'Sorties' : 'Stock Out',
                    language === 'fr' ? 'Balance Nette' : 'Net Balance',
                    language === 'fr' ? 'Opérations' : 'Operations'
                ]],
                body: [[`+${stats.entries}`, `-${stats.exits}`, `${netBalance >= 0 ? '+' : ''}${netBalance}`, stats.operations]],
                theme: 'grid',
                styles: { fontSize: 11, cellPadding: 4, halign: 'center' },
                headStyles: { fillColor: [59, 130, 246], fontStyle: 'bold' }
            });

            // Main Table
            autoTable(doc, {
                startY: doc.lastAutoTable.finalY + 15,
                head: [[
                    language === 'fr' ? 'Date & Heure' : 'Date & Time',
                    language === 'fr' ? 'Opération' : 'Operation',
                    language === 'fr' ? 'Description' : 'Description',
                    language === 'fr' ? 'Qté' : 'Qty',
                    language === 'fr' ? 'Utilisateur' : 'User'
                ]],
                body: filteredLogs.map(log => [
                    new Date(log.timestamp).toLocaleString(language === 'fr' ? 'fr-FR' : 'en-US', { dateStyle: 'short', timeStyle: 'short' }),
                    log.action.replace(/_/g, ' '),
                    (log.details || '-').substring(0, 40) + (log.details?.length > 40 ? '...' : ''),
                    (log.quantity_change > 0 ? '+' : '') + (log.quantity_change || '-'),
                    log.username
                ]),
                headStyles: { fillColor: [59, 130, 246] },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                styles: { fontSize: 9, cellPadding: 3 },
                columnStyles: {
                    0: { cellWidth: 35 },
                    1: { cellWidth: 30 },
                    2: { cellWidth: 'auto' },
                    3: { cellWidth: 15, halign: 'center' },
                    4: { cellWidth: 25 }
                }
            });

            doc.save(`rapport-inventaire-${dateRange.start}-${dateRange.end}.pdf`);
        } catch (error) {
            console.error("PDF Error:", error);
            alert((language === 'fr' ? "Erreur PDF: " : "PDF Error: ") + error.message);
        }
    };

    return (
        <div className="reports-page">
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <h1 className="page-title"><BarChart3 size={28} /> {language === 'fr' ? 'Rapports d\'Inventaire' : 'Inventory Reports'}</h1>
                    <TutorialButton tutorialKey="reports" />
                </div>
            </div>

            {/* Date Range Selector */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <h2><Calendar size={20} /> {language === 'fr' ? 'Sélectionner la période d\'analyse' : 'Select Analysis Period'}</h2>
                <div className="date-range-selector" style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', alignItems: 'flex-end' }}>
                    <div className="form-group" style={{ marginRight: '2rem' }}>
                        <label>{language === 'fr' ? 'Date de début' : 'Start Date'}</label>
                        <input
                            type="date"
                            value={dateRange.start}
                            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                            style={{ minWidth: '180px', padding: '0.75rem' }}
                        />
                    </div>
                    <div className="form-group" style={{ marginRight: '2rem' }}>
                        <label>{language === 'fr' ? 'Date de fin' : 'End Date'}</label>
                        <input
                            type="date"
                            value={dateRange.end}
                            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                            style={{ minWidth: '180px', padding: '0.75rem' }}
                        />
                    </div>
                    <div className="btn-group" style={{ display: 'flex', gap: '0.75rem' }}>
                        <button className="secondary-btn" onClick={handlePrint}>
                            <Printer size={18} />
                            {language === 'fr' ? 'Imprimer' : 'Print'}
                        </button>
                        <button className="add-btn" onClick={handleDownloadPDF}>
                            <Download size={18} />
                            {language === 'fr' ? 'Télécharger PDF' : 'Download PDF'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats Summary */}
            <div className="stats-row" style={{ marginBottom: '1.5rem' }}>
                <div className="stat-card gradient-green">
                    <div className="stat-icon"><TrendingUp size={24} /></div>
                    <div className="stat-info">
                        <span className="stat-value">+{stats.entries}</span>
                        <span className="stat-label">{language === 'fr' ? 'Entrées Stock' : 'Stock In'}</span>
                    </div>
                </div>
                <div className="stat-card gradient-red">
                    <div className="stat-icon"><TrendingDown size={24} /></div>
                    <div className="stat-info">
                        <span className="stat-value">-{stats.exits}</span>
                        <span className="stat-label">{language === 'fr' ? 'Sorties Stock' : 'Stock Out'}</span>
                    </div>
                </div>
                <div className="stat-card" style={{ background: netBalance >= 0 ? 'linear-gradient(135deg, #10b981 0%, #047857 100%)' : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}>
                    <div className="stat-icon"><Activity size={24} /></div>
                    <div className="stat-info">
                        <span className="stat-value">{netBalance >= 0 ? '+' : ''}{netBalance}</span>
                        <span className="stat-label">{language === 'fr' ? 'Balance Nette' : 'Net Balance'}</span>
                    </div>
                </div>
                <div className="stat-card gradient-blue">
                    <div className="stat-icon"><Package size={24} /></div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.operations}</span>
                        <span className="stat-label">{language === 'fr' ? 'Total Opérations' : 'Total Operations'}</span>
                    </div>
                </div>
            </div>

            {/* Operations Table */}
            <div className="card">
                <h2>{language === 'fr' ? 'Détail des Opérations' : 'Operations Detail'}</h2>
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>{language === 'fr' ? 'Date & Heure' : 'Date & Time'}</th>
                                <th>{language === 'fr' ? 'Type' : 'Type'}</th>
                                <th>{language === 'fr' ? 'Description' : 'Description'}</th>
                                <th>{language === 'fr' ? 'Qté' : 'Qty'}</th>
                                <th>{language === 'fr' ? 'Effectué par' : 'By'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLogs.map(log => (
                                <tr key={log.id}>
                                    <td style={{ whiteSpace: 'nowrap' }}>
                                        {new Date(log.timestamp).toLocaleString(language === 'fr' ? 'fr-FR' : 'en-US', { dateStyle: 'short', timeStyle: 'short' })}
                                    </td>
                                    <td><span className={`action-badge ${log.action}`}>{humanizeAction(log.action)}</span></td>
                                    <td>{log.details}</td>
                                    <td className={log.quantity_change > 0 ? 'positive' : log.quantity_change < 0 ? 'negative' : ''} style={{ fontWeight: 600, textAlign: 'center' }}>
                                        {log.quantity_change > 0 ? '+' : ''}{log.quantity_change || '-'}
                                    </td>
                                    <td>{log.username}</td>
                                </tr>
                            ))}
                            {filteredLogs.length === 0 && (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                        {language === 'fr' ? 'Aucune donnée pour cette période' : 'No data for this period'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

