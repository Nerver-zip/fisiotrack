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
