import React from 'react';
import { CheckCircle, ArrowRight } from 'lucide-react';
import './Modal.css';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  buttonText: string;
}

const SuccessModal: React.FC<SuccessModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  buttonText
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content success-animation" style={{ textAlign: 'center', padding: '2.5rem' }}>
        <div style={{
          display: 'flex',
          margin: '0 auto 1.5rem auto',
          alignItems: 'center',
          justifyContent: 'center',
          width: '80px',
          height: '80px',
          backgroundColor: '#e6f7ed',
          borderRadius: '50%',
          color: '#2ecc71'
        }}>
          <CheckCircle size={48} />
        </div>

        <h2 style={{ color: 'var(--unimed-green)', marginBottom: '1rem' }}>{title}</h2>
        <p style={{ color: '#666', marginBottom: '2rem', fontSize: '1.1rem', lineHeight: '1.5' }}>
          {message}
        </p>

        <button
          onClick={onClose}
          className="btn-primary"
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            fontSize: '1rem',
            padding: '1rem'
          }}
        >
          {buttonText} <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
};

export default SuccessModal;
