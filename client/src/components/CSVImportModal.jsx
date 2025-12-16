import { useState, useRef } from 'react';
import { Upload, FileText, X, AlertTriangle, CheckCircle, Download } from 'lucide-react';
import Modal from './Modal';

export default function CSVImportModal({
    isOpen,
    onClose,
    onImport,
    entityType, // 'employees' or 'products'
    requiredColumns,
    sampleData
}) {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState([]);
    const [errors, setErrors] = useState([]);
    const [importing, setImporting] = useState(false);
    const fileInputRef = useRef(null);

    const parseCSV = (text) => {
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length < 2) return { headers: [], rows: [] };

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const rows = lines.slice(1).map((line, index) => {
            const values = line.split(',').map(v => v.trim());
            const row = {};
            headers.forEach((header, i) => {
                row[header] = values[i] || '';
            });
            row._lineNumber = index + 2;
            return row;
        });

        return { headers, rows };
    };

    const validateData = (headers, rows) => {
        const validationErrors = [];

        // Check required columns
        requiredColumns.forEach(col => {
            if (!headers.includes(col.toLowerCase())) {
                validationErrors.push(`Colonne manquante: "${col}"`);
            }
        });

        // Check each row
        rows.forEach((row, index) => {
            requiredColumns.forEach(col => {
                if (!row[col.toLowerCase()]?.trim()) {
                    validationErrors.push(`Ligne ${row._lineNumber}: "${col}" est vide`);
                }
            });
        });

        return validationErrors;
    };

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;

        if (!selectedFile.name.endsWith('.csv')) {
            setErrors(['Le fichier doit être au format CSV']);
            return;
        }

        setFile(selectedFile);
        setErrors([]);

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target.result;
            const { headers, rows } = parseCSV(text);
            const validationErrors = validateData(headers, rows);

            setErrors(validationErrors);
            setPreview(rows.slice(0, 5)); // Preview first 5 rows
        };
        reader.readAsText(selectedFile);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) {
            const fakeEvent = { target: { files: [droppedFile] } };
            handleFileChange(fakeEvent);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const handleImport = async () => {
        if (!file || errors.length > 0) return;

        setImporting(true);
        const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target.result;
            const { rows } = parseCSV(text);

            try {
                await onImport(rows);
                onClose();
                setFile(null);
                setPreview([]);
                setErrors([]);
            } catch (error) {
                setErrors([error.message || 'Erreur lors de l\'import']);
            } finally {
                setImporting(false);
            }
        };
        reader.readAsText(file);
    };

    const downloadTemplate = () => {
        const headers = requiredColumns.join(',');
        const sample = sampleData || requiredColumns.map(() => 'exemple').join(',');
        const content = `${headers}\n${sample}`;

        const blob = new Blob([content], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `template_${entityType}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleClose = () => {
        setFile(null);
        setPreview([]);
        setErrors([]);
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={`Importer ${entityType === 'employees' ? 'des employés' : 'des produits'}`}
            size="lg"
        >
            <div style={{ padding: '1rem' }}>
                {/* Template download */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '1rem',
                    padding: '1rem',
                    background: 'var(--hover-bg)',
                    borderRadius: '8px'
                }}>
                    <span style={{ color: 'var(--text-secondary)' }}>
                        Colonnes requises: {requiredColumns.join(', ')}
                    </span>
                    <button
                        onClick={downloadTemplate}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.5rem 1rem',
                            background: 'var(--primary-color)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer'
                        }}
                    >
                        <Download size={16} />
                        Template CSV
                    </button>
                </div>

                {/* Drop zone */}
                <div
                    onClick={() => fileInputRef.current?.click()}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    style={{
                        border: '2px dashed var(--border-color)',
                        borderRadius: '12px',
                        padding: '2rem',
                        textAlign: 'center',
                        cursor: 'pointer',
                        background: file ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                        transition: 'all 0.2s'
                    }}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv"
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                    />
                    {file ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                            <FileText size={24} color="#10b981" />
                            <span style={{ color: 'var(--text-color)' }}>{file.name}</span>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setFile(null);
                                    setPreview([]);
                                    setErrors([]);
                                }}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: 'var(--text-secondary)'
                                }}
                            >
                                <X size={16} />
                            </button>
                        </div>
                    ) : (
                        <>
                            <Upload size={32} style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)' }} />
                            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                                Glissez un fichier CSV ou cliquez pour sélectionner
                            </p>
                        </>
                    )}
                </div>

                {/* Errors */}
                {errors.length > 0 && (
                    <div style={{
                        marginTop: '1rem',
                        padding: '1rem',
                        background: 'rgba(239, 68, 68, 0.1)',
                        borderRadius: '8px',
                        maxHeight: '150px',
                        overflowY: 'auto'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <AlertTriangle size={16} color="#ef4444" />
                            <span style={{ color: '#ef4444', fontWeight: 600 }}>Erreurs de validation</span>
                        </div>
                        {errors.slice(0, 10).map((err, i) => (
                            <p key={i} style={{ margin: '0.25rem 0', fontSize: '0.875rem', color: '#ef4444' }}>
                                • {err}
                            </p>
                        ))}
                        {errors.length > 10 && (
                            <p style={{ margin: '0.5rem 0', fontSize: '0.875rem', color: '#ef4444' }}>
                                ...et {errors.length - 10} autres erreurs
                            </p>
                        )}
                    </div>
                )}

                {/* Preview */}
                {preview.length > 0 && errors.length === 0 && (
                    <div style={{ marginTop: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <CheckCircle size={16} color="#10b981" />
                            <span style={{ color: '#10b981', fontWeight: 600 }}>
                                Prévisualisation ({preview.length} premières lignes)
                            </span>
                        </div>
                        <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: 'var(--hover-bg)' }}>
                                        {requiredColumns.map(col => (
                                            <th key={col} style={{
                                                padding: '0.5rem',
                                                textAlign: 'left',
                                                color: 'var(--text-color)',
                                                fontSize: '0.875rem'
                                            }}>
                                                {col}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {preview.map((row, i) => (
                                        <tr key={i}>
                                            {requiredColumns.map(col => (
                                                <td key={col} style={{
                                                    padding: '0.5rem',
                                                    color: 'var(--text-color)',
                                                    fontSize: '0.875rem',
                                                    borderTop: '1px solid var(--border-color)'
                                                }}>
                                                    {row[col.toLowerCase()] || '-'}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '0.5rem',
                    marginTop: '1.5rem'
                }}>
                    <button
                        onClick={handleClose}
                        style={{
                            padding: '0.75rem 1.5rem',
                            background: 'transparent',
                            border: '1px solid var(--border-color)',
                            borderRadius: '8px',
                            color: 'var(--text-color)',
                            cursor: 'pointer'
                        }}
                    >
                        Annuler
                    </button>
                    <button
                        onClick={handleImport}
                        disabled={!file || errors.length > 0 || importing}
                        style={{
                            padding: '0.75rem 1.5rem',
                            background: (!file || errors.length > 0) ? 'var(--hover-bg)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            border: 'none',
                            borderRadius: '8px',
                            color: (!file || errors.length > 0) ? 'var(--text-secondary)' : 'white',
                            cursor: (!file || errors.length > 0) ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        {importing ? 'Import en cours...' : 'Importer'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
