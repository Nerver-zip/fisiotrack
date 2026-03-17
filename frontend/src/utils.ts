export const formatDate = (dateStr: string | undefined): string => {
  if (!dateStr) return '';
  // Se já estiver no formato dd/mm/aaaa, retorna
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;
  
  // Tenta converter de YYYY-MM-DD para dd/mm/aaaa
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  }
  
  return dateStr;
};

export const calculateAge = (birthDate: string, evaluationDate: string): number => {
  if (!birthDate || !evaluationDate) return 0;
  const birth = new Date(birthDate + 'T00:00:00'); // Add T00:00:00 to avoid timezone issues
  const evaluation = new Date(evaluationDate + 'T00:00:00');
  
  let age = evaluation.getFullYear() - birth.getFullYear();
  const m = evaluation.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && evaluation.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};