import React, { useState, useEffect } from 'react';
import Modal from './Modal';

export default function InputModal({
    isOpen,
    onClose,
    onSubmit,
    title,
    label,
    placeholder,
    defaultValue = '',
    confirmText = 'Valider',
    type = 'primary'
}) {
    const [value, setValue] = useState(defaultValue);

    useEffect(() => {
        if (isOpen) setValue(defaultValue);
    }, [isOpen, defaultValue]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(value);
        onClose();
    };

    const gradientRedWrapper = {
        background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
        border: 'none',
        color: 'white',
        padding: '0.75rem 1.5rem',
        borderRadius: '8px',
        fontWeight: 600,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        boxShadow: '0 4px 6px -1px rgba(220, 38, 38, 0.2)'
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            size="md"
        >
            <form onSubmit={handleSubmit} id="input-modal-form">
                <div className="form-group">
                    <label>{label}</label>
                    <div className="input-icon">
                        <input
                            type="text"
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            placeholder={placeholder}
                            autoFocus
                            style={{ paddingLeft: '1rem' }}
                        />
                    </div>
                </div>
            </form>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" className="secondary-btn" onClick={onClose}>Annuler</button>
                <button
                    type="submit"
                    form="input-modal-form"
                    className={type !== 'danger' ? "primary-btn" : undefined}
                    style={type === 'danger' ? gradientRedWrapper : {}}
                >
                    {confirmText}
                </button>
            </div>
        </Modal>
    );
}
