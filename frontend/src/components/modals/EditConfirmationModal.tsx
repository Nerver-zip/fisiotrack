import React from 'react';
import './Modal.css';

interface EditConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  changedFields: string[];
  fieldLabels: { [key: string]: string };
  title?: string;
}

const EditConfirmationModal: React.FC<EditConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  changedFields,
  fieldLabels,
  title = "Confirmar Alterações"
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div className="modal-content" style={{ borderTop: '5px solid #f0ad4e' }}>
        <h2 className="modal-title" style={{ color: '#8a6d3b' }}>{title}</h2>
        
        <div className="modal-body-scroll" style={{ marginTop: '1rem' }}>
          <p>Você está prestes a salvar alterações permanentemente.</p>
          <p><strong>Esta ação não pode ser desfeita.</strong></p>
          
          <div style={{ marginTop: '1.5rem', backgroundColor: '#fcf8e3', padding: '1rem', borderRadius: '4px', border: '1px solid #faebcc' }}>
            <p style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: '#8a6d3b' }}>Campos alterados:</p>
            <ul style={{ paddingLeft: '1.5rem', margin: 0 }}>
              {changedFields.map(field => (
                <li key={field} style={{ color: '#8a6d3b', fontSize: '0.9rem' }}>
                  {fieldLabels[field] || field}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="modal-actions footer-actions">
          <button className="btn-cancel" onClick={onClose}>Voltar</button>
          <button 
            className="btn-confirm-danger" 
            style={{ backgroundColor: '#f0ad4e' }} 
            onClick={onConfirm}
          >
            Confirmar Alterações
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditConfirmationModal;
