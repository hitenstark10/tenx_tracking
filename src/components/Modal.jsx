import { X } from 'lucide-react';
import { useEffect } from 'react';

export default function Modal({ isOpen, onClose, title, children, size = '', footer }) {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div
                className={`modal-content ${size}`}
                onClick={e => e.stopPropagation()}
            >
                <div className="modal-header">
                    <h3>{title}</h3>
                    <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
                </div>
                <div className="modal-body">
                    {children}
                </div>
                {footer && <div className="modal-footer">{footer}</div>}
            </div>
        </div>
    );
}
