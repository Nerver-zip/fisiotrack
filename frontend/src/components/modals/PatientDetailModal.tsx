import React, { useState } from 'react';
import { Patient, Evaluation } from '../../types';
import { formatDate, calculateAge } from '../../utils';
import { FileJson, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import './Modal.css';

interface PatientDetailModalProps {
  isOpen: boolean;
  patient: Patient | null;
  onClose: () => void;
  onAddEvaluation: (patientId: number) => void;
  onEditPatient: (patient: Patient) => void;
  onEditEvaluation: (evaluation: Evaluation) => void;
  onDeleteEvaluation: (evaluation: Evaluation) => void;
}

const PatientDetailModal: React.FC<PatientDetailModalProps> = ({ 
  isOpen, 
  patient, 
  onClose, 
  onAddEvaluation, 
  onEditPatient,
  onEditEvaluation,
  onDeleteEvaluation
}) => {
  const [selectedEvalId, setSelectedEvalId] = useState<number | null>(null);

  if (!isOpen || !patient) return null;

  const currentEval = selectedEvalId 
    ? patient.evaluations?.find(e => e.id === selectedEvalId) 
    : patient.evaluations?.[0];

  const handleExportJSON = () => {
    const orderedPatient = {
      id: patient.id,
      name: patient.name,
      birth_date: patient.birth_date,
      cpf: patient.cpf,
      healthcare_id: patient.healthcare_id,
      gender: patient.gender,
      profession: patient.profession,
      phone: patient.phone,
      address: patient.address,
      mom_name: patient.mom_name,
      evaluations: patient.evaluations?.map(e => ({
        id: e.id,
        patient_id: e.patient_id,
        evaluation_date: e.evaluation_date,
        doctor: e.doctor,
        medical_diagnosis: e.medical_diagnosis,
        chief_complaint: e.chief_complaint,
        history_present_illness: e.history_present_illness,
        past_medical_history: e.past_medical_history,
        medications: e.medications,
        habits_activities: e.habits_activities,
        physical_exam: e.physical_exam,
        treatment_plan: e.treatment_plan
      }))
    };

    const dataStr = JSON.stringify(orderedPatient, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const exportFileDefaultName = `paciente_${patient.name?.replace(/\s+/g, '_').toLowerCase()}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', url);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Função auxiliar para rodapé
    const addFooter = (pageNum: number, totalPages: number) => {
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Página ${pageNum} de ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
      doc.text('FisioTrack - Sistema de Gestão de Clínica de Fisioterapia', 20, pageHeight - 10);
    };

    // --- Header ---
    doc.setFillColor(0, 153, 93); // Unimed Green
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('PRONTUÁRIO CLÍNICO', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Paciente: ${patient.name?.toUpperCase()}`, pageWidth / 2, 30, { align: 'center' });

    // --- Dados Cadastrais ---
    let currentY = 55;
    doc.setFontSize(14);
    doc.setTextColor(0, 153, 93);
    doc.setFont('helvetica', 'bold');
    doc.text('1. DADOS CADASTRAIS', 20, currentY);
    
    doc.setDrawColor(0, 153, 93);
    doc.setLineWidth(0.5);
    doc.line(20, currentY + 2, pageWidth - 20, currentY + 2);

    autoTable(doc, {
      startY: currentY + 8,
      body: [
        ['Nome Completo:', patient.name || '', 'CPF:', patient.cpf || ''],
        ['Nascimento:', formatDate(patient.birth_date), 'Sexo:', patient.gender || ''],
        ['ID Convênio:', patient.healthcare_id || '', 'Profissão:', patient.profession || ''],
        ['Mãe:', patient.mom_name || '', 'Telefone:', Array.isArray(patient.phone) ? patient.phone.join(', ') : (patient.phone || '')],
        ['Endereço:', { content: patient.address || '', colSpan: 3 }]
      ],
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 35 },
        2: { fontStyle: 'bold', cellWidth: 35 }
      },
      margin: { left: 20, right: 20 }
    });

    currentY = (doc as any).lastAutoTable.finalY + 15;

    // --- Histórico de Evoluções ---
    doc.setFontSize(14);
    doc.setTextColor(0, 153, 93);
    doc.setFont('helvetica', 'bold');
    doc.text('2. HISTÓRICO DE EVOLUÇÕES CLÍNICAS', 20, currentY);
    doc.line(20, currentY + 2, pageWidth - 20, currentY + 2);
    
    currentY += 12;

    if (patient.evaluations && patient.evaluations.length > 0) {
      patient.evaluations.forEach((evalItem, index) => {
        // Verificar espaço na página
        if (currentY > pageHeight - 60) {
          doc.addPage();
          currentY = 20;
        }

        // Box de Título da Evolução
        doc.setFillColor(245, 245, 245);
        doc.rect(20, currentY, pageWidth - 40, 10, 'F');
        doc.setFontSize(11);
        doc.setTextColor(50);
        doc.setFont('helvetica', 'bold');
        doc.text(`EVOLUÇÃO #${patient.evaluations!.length - index} - DATA: ${formatDate(evalItem.evaluation_date)}`, 25, currentY + 7);
        
        currentY += 15;
        doc.setFontSize(10);
        doc.setTextColor(0);

        const sections = [
          { label: 'MÉDICO ASSISTENTE', value: evalItem.doctor },
          { label: 'DIAGNÓSTICO MÉDICO', value: evalItem.medical_diagnosis },
          { label: 'QUEIXA PRINCIPAL', value: evalItem.chief_complaint },
          { label: 'HISTÓRIA DA DOENÇA ATUAL', value: evalItem.history_present_illness },
          { label: 'HISTÓRIA PATOLÓGICA PREGRESSA', value: evalItem.past_medical_history },
          { label: 'PLANO DE TRATAMENTO', value: evalItem.treatment_plan, isHighlight: true }
        ];

        sections.forEach(s => {
          if (s.value) {
            if (currentY > pageHeight - 30) {
              doc.addPage();
              currentY = 20;
            }
            doc.setFont('helvetica', 'bold');
            doc.text(`${s.label}:`, 25, currentY);
            doc.setFont('helvetica', 'normal');
            
            const textLines = doc.splitTextToSize(s.value, pageWidth - 60);
            doc.text(textLines, 30, currentY + 5);
            currentY += (textLines.length * 5) + 10;
          }
        });

        currentY += 5;
        doc.setDrawColor(200);
        doc.setLineWidth(0.2);
        doc.line(20, currentY, pageWidth - 20, currentY);
        currentY += 15;
      });
    } else {
      doc.setFontSize(10);
      doc.setTextColor(150);
      doc.setFont('helvetica', 'italic');
      doc.text('Nenhuma evolução registrada para este paciente.', 25, currentY);
    }

    // --- Assinatura ---
    if (currentY > pageHeight - 40) {
      doc.addPage();
      currentY = 40;
    } else {
      currentY = pageHeight - 40;
    }

    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.line(pageWidth / 2 - 40, currentY, pageWidth / 2 + 40, currentY);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('ASSINATURA DO PROFISSIONAL', pageWidth / 2, currentY + 5, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('CRM/CREFITO', pageWidth / 2, currentY + 10, { align: 'center' });

    // Adicionar numeração de páginas ao final
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      addFooter(i, pageCount);
    }

    doc.save(`prontuario_${patient.name?.replace(/\s+/g, '_').toLowerCase()}.pdf`);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content detail-modal">
        <div className="modal-header">
          <h2 className="modal-title">Prontuário do Paciente</h2>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>
        
        <div className="modal-body-scroll">
          <section className="detail-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ borderLeft: '4px solid var(--unimed-green)', paddingLeft: '10px' }}>📍 Dados Cadastrais</h3>
              <button 
                className="btn-edit" 
                onClick={() => onEditPatient(patient)}
              >
                ✏️ Editar Dados
              </button>
            </div>
            <div className="detail-grid">
              <p><strong>Nome:</strong> {patient.name || ''}</p>
              <p><strong>CPF:</strong> {patient.cpf || ''}</p>
              <p><strong>ID Convênio:</strong> {patient.healthcare_id || ''}</p>
              <p><strong>Nome da Mãe:</strong> {patient.mom_name || ''}</p>
              <p><strong>Nascimento:</strong> {formatDate(patient.birth_date)}</p>
              <p><strong>Sexo:</strong> {patient.gender || ''}</p>
              <p><strong>Profissão:</strong> {patient.profession || ''}</p>
              <p><strong>Telefone:</strong> {Array.isArray(patient.phone) ? patient.phone.join(', ') : (patient.phone || '')}</p>
            </div>
            <p style={{ marginTop: '0.5rem' }}><strong>Endereço:</strong> {patient.address || ''}</p>
          </section>

          <section className="detail-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ borderLeft: '4px solid var(--unimed-green)', paddingLeft: '10px' }}>📅 Histórico de Entradas</h3>
              <button 
                className="btn-primary" 
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                onClick={() => patient.id && onAddEvaluation(patient.id)}
              >
                + Nova Entrada
              </button>
            </div>
            
            {patient.evaluations && patient.evaluations.length > 0 ? (
              <div className="evaluation-tabs">
                {patient.evaluations.map(e => (
                  <button 
                    key={e.id || e.evaluation_date}
                    className={`tab-item ${((selectedEvalId === null && patient.evaluations?.[0].id === e.id) || selectedEvalId === e.id) ? 'active' : ''}`}
                    onClick={() => e.id && setSelectedEvalId(e.id)}
                  >
                    {formatDate(e.evaluation_date)}
                  </button>
                ))}
              </div>
            ) : (
              <p>Nenhuma avaliação registrada.</p>
            )}
          </section>

          {currentEval && (
            <div className="evaluation-content">
              <section className="detail-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ borderLeft: '4px solid var(--unimed-green)', paddingLeft: '10px' }}>🏥 Informações da Entrada ({formatDate(currentEval.evaluation_date)})</h3>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      className="btn-edit" 
                      onClick={() => onEditEvaluation(currentEval)}
                    >
                      ✏️ Editar
                    </button>
                    <button 
                      className="btn-confirm-danger" 
                      style={{ minWidth: '80px', fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                      onClick={() => onDeleteEvaluation(currentEval)}
                    >
                      🗑️ Excluir
                    </button>
                  </div>
                </div>
                <div className="detail-grid">
                  <p><strong>Médico:</strong> {currentEval.doctor || ''}</p>
                  <p><strong>Idade na data:</strong> {calculateAge(patient.birth_date, currentEval.evaluation_date)} anos</p>
                  <p><strong>Diagnóstico Médico:</strong> {currentEval.medical_diagnosis || ''}</p>
                </div>
              </section>

              <section className="detail-section">
                <p><strong>Queixa Principal:</strong></p>
                <div className="text-box">{currentEval.chief_complaint || ''}</div>
                
                <p><strong>História da Doença Atual (HDA):</strong></p>
                <div className="text-box">{currentEval.history_present_illness || ''}</div>

                <p><strong>História Patológica Pregressa (HPP):</strong></p>
                <div className="text-box">{currentEval.past_medical_history || ''}</div>

                <p><strong>Medicamentos em uso:</strong></p>
                <div className="text-box">{currentEval.medications || ''}</div>

                <p><strong>Atividades e Hábitos:</strong></p>
                <div className="text-box">{currentEval.habits_activities || ''}</div>

                <p><strong>Exame Físico / Complementares:</strong></p>
                <div className="text-box">{currentEval.physical_exam || ''}</div>
                
                <p><strong>Plano de Tratamento:</strong></p>
                <div className="text-box highlight">{currentEval.treatment_plan || ''}</div>
              </section>
            </div>
          )}
        </div>

        <div className="modal-actions footer-actions" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn-edit" onClick={handleExportJSON} title="Exportar para JSON" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <FileJson size={18} /> JSON
            </button>
            <button className="btn-edit" onClick={handleExportPDF} title="Exportar para PDF" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <FileText size={18} /> PDF
            </button>
          </div>
          <button className="btn-primary" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  );
};

export default PatientDetailModal;
