import React, { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X, Scan, Camera, QrCode } from 'lucide-react';

export default function QRScannerModal({ onScan, onClose }) {
    const [scanResult, setScanResult] = useState(null);
    const [isScanning, setIsScanning] = useState(false);

    useEffect(() => {
        setIsScanning(true);
        const scanner = new Html5QrcodeScanner(
            "qr-reader",
            {
                fps: 10,
                qrbox: { width: 220, height: 220 },
                aspectRatio: 1,
                showTorchButtonIfSupported: true,
                showZoomSliderIfSupported: true
            },
            false
        );

        scanner.render((decodedText, decodedResult) => {
            scanner.clear();
            setScanResult(decodedText);
            setIsScanning(false);
            onScan(decodedText);
        }, (error) => {
            // Scanning in progress
        });

        return () => {
            scanner.clear().catch(error => console.error("Failed to clear scanner", error));
        };
    }, [onScan]);

    return (
        <div className="modal-overlay" onClick={onClose} style={{ background: 'rgba(0, 0, 0, 0.85)' }}>
            <div
                className="modal-content qr-scanner-modal"
                onClick={e => e.stopPropagation()}
                style={{
                    maxWidth: '420px',
                    borderRadius: '20px',
                    overflow: 'hidden',
                    background: '#1e293b',
                    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                }}
            >
                {/* Modern Header */}
                <div style={{
                    background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                    padding: '1.5rem',
                    color: 'white',
                    position: 'relative'
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            position: 'absolute',
                            top: '1rem',
                            right: '1rem',
                            background: 'rgba(255,255,255,0.2)',
                            border: 'none',
                            borderRadius: '50%',
                            width: '36px',
                            height: '36px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: 'white',
                            transition: 'all 0.2s'
                        }}
                    >
                        <X size={20} />
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                            background: 'rgba(255,255,255,0.2)',
                            borderRadius: '12px',
                            padding: '0.75rem'
                        }}>
                            <QrCode size={28} />
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Scanner QR Code</h2>
                            <p style={{ margin: 0, opacity: 0.9, fontSize: '0.85rem' }}>Scannez un PC pour le prêter ou le retourner</p>
                        </div>
                    </div>
                </div>

                {/* Scanner Area */}
                <div style={{ padding: '1.5rem', background: '#0f172a' }}>
                    <div style={{
                        background: '#1e293b',
                        borderRadius: '16px',
                        padding: '1rem',
                        position: 'relative',
                        overflow: 'hidden',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                        {/* Scanning Animation Overlay */}
                        {isScanning && (
                            <div style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                height: '3px',
                                background: 'linear-gradient(90deg, transparent, #3b82f6, transparent)',
                                animation: 'scanLine 2s linear infinite',
                                zIndex: 10
                            }} />
                        )}

                        <div
                            id="qr-reader"
                            style={{
                                width: '100%',
                                borderRadius: '12px',
                                overflow: 'hidden'
                            }}
                        />
                    </div>

                    {/* Instructions */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        marginTop: '1.25rem',
                        padding: '1rem',
                        background: 'rgba(59, 130, 246, 0.15)',
                        borderRadius: '12px',
                        border: '1px solid rgba(59, 130, 246, 0.3)'
                    }}>
                        <div style={{
                            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                            borderRadius: '10px',
                            padding: '0.5rem',
                            color: 'white'
                        }}>
                            <Camera size={20} />
                        </div>
                        <div>
                            <p style={{ margin: 0, fontWeight: 500, color: '#f1f5f9' }}>
                                Pointez la caméra vers le QR Code
                            </p>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>
                                Le scan est automatique dès détection
                            </p>
                        </div>
                    </div>

                    {/* Tips */}
                    <div style={{
                        marginTop: '1rem',
                        display: 'flex',
                        gap: '0.5rem',
                        flexWrap: 'wrap'
                    }}>
                        <span style={{
                            fontSize: '0.75rem',
                            padding: '0.25rem 0.75rem',
                            background: '#334155',
                            borderRadius: '20px',
                            color: '#e2e8f0'
                        }}>
                            💡 Bonne luminosité
                        </span>
                        <span style={{
                            fontSize: '0.75rem',
                            padding: '0.25rem 0.75rem',
                            background: '#334155',
                            borderRadius: '20px',
                            color: '#e2e8f0'
                        }}>
                            📏 Distance ~20cm
                        </span>
                        <span style={{
                            fontSize: '0.75rem',
                            padding: '0.25rem 0.75rem',
                            background: '#334155',
                            borderRadius: '20px',
                            color: '#e2e8f0'
                        }}>
                            🎯 Centrez le QR
                        </span>
                    </div>
                </div>

                {/* CSS for scanning animation */}
                <style>{`
                    @keyframes scanLine {
                        0% { top: 0; }
                        50% { top: calc(100% - 3px); }
                        100% { top: 0; }
                    }
                    .qr-scanner-modal #qr-reader video {
                        border-radius: 12px !important;
                    }
                    .qr-scanner-modal #qr-reader__scan_region {
                        border-radius: 12px !important;
                        overflow: hidden;
                    }
                    .qr-scanner-modal #qr-reader__dashboard {
                        padding: 0.75rem !important;
                        border-radius: 8px !important;
                        margin-top: 0.5rem !important;
                    }
                    .qr-scanner-modal #qr-reader__dashboard_section_csr button {
                        background: linear-gradient(135deg, #3b82f6, #8b5cf6) !important;
                        border: none !important;
                        padding: 0.75rem 1.5rem !important;
                        border-radius: 8px !important;
                        color: white !important;
                        font-weight: 500 !important;
                        cursor: pointer !important;
                        transition: all 0.2s !important;
                    }
                    .qr-scanner-modal #qr-reader__dashboard_section_csr button:hover {
                        transform: scale(1.02) !important;
                        box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4) !important;
                    }
                `}</style>
            </div>
        </div>
    );
}
