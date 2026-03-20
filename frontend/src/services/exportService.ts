import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Patient } from '../types';
import { formatDate } from '../utils';

export const exportToJSON = (patient: Patient) => {
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

export const exportToPDF = (patient: Patient) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  const addFooter = (pageNum: number, totalPages: number) => {
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Página ${pageNum} de ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    doc.text('FisioTrack - Sistema de Gestão de Clínica de Fisioterapia', 20, pageHeight - 10);
  };

  doc.setFillColor(0, 153, 93);
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('PRONTUÁRIO CLÍNICO', pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Paciente: ${patient.name?.toUpperCase()}`, pageWidth / 2, 30, { align: 'center' });

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

  doc.setFontSize(14);
  doc.setTextColor(0, 153, 93);
  doc.setFont('helvetica', 'bold');
  doc.text('2. HISTÓRICO DE EVOLUÇÕES CLÍNICAS', 20, currentY);
  doc.line(20, currentY + 2, pageWidth - 20, currentY + 2);
  
  currentY += 12;

  if (patient.evaluations && patient.evaluations.length > 0) {
    patient.evaluations.forEach((evalItem, index) => {
      if (currentY > pageHeight - 60) {
        doc.addPage();
        currentY = 20;
      }

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
        { label: 'PLANO DE TRATAMENTO', value: evalItem.treatment_plan }
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
  }

  currentY = pageHeight - 40;
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(pageWidth / 2 - 40, currentY, pageWidth / 2 + 40, currentY);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('ASSINATURA DO PROFISSIONAL', pageWidth / 2, currentY + 5, { align: 'center' });

  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    addFooter(i, pageCount);
  }

  doc.save(`prontuario_${patient.name?.replace(/\s+/g, '_').toLowerCase()}.pdf`);
};
