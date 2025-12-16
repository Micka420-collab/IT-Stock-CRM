import React from 'react';
import QRCode from 'react-qr-code';
import { X, Printer } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function QRCodeModal({ data, title, onClose }) {
    const { theme } = useTheme();

    const handlePrint = () => {
        const printWindow = window.open('', '', 'width=600,height=600');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Print QR Code</title>
                    <style>
                        body { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif; }
                        h2 { margin-bottom: 20px; }
                        .qr-code { border: 2px solid #000; padding: 20px; }
                    </style>
                </head>
                <body>
                    <h2>${title}</h2>
                    <div class="qr-code">
                        ${document.getElementById('qr-code-svg').outerHTML}
                    </div>
                    <p>${data}</p>
                    <script>
                        window.onload = function() { window.print(); window.close(); }
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', textAlign: 'center' }}>
                <button className="modal-close" onClick={onClose}><X size={20} /></button>
                <div className="modal-header">
                    <h2>QR Code</h2>
                </div>
                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', padding: '20px' }}>
                    <p style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{title}</p>
                    <div style={{ background: 'white', padding: '16px', borderRadius: '8px' }} id="qr-code-wrapper">
                        <QRCode
                            id="qr-code-svg"
                            value={String(data)}
                            size={200}
                            fgColor="#000000"
                            bgColor="#ffffff"
                            level="H"
                        />
                    </div>
                    <p style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{data}</p>
                </div>
                <div className="modal-footer" style={{ justifyContent: 'center' }}>
                    <button className="btn-primary" onClick={handlePrint}>
                        <Printer size={18} /> Imprimer
                    </button>
                </div>
            </div>
        </div>
    );
}
