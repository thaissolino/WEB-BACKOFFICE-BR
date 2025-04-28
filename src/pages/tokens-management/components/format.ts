export function formatCurrency(value: number, decimals: number = 2, currency: string = 'USD'): string {
    if (isNaN(value)) value = 0;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value);
  }
  
  export function formatDate(dateStr: string): string {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR').toUpperCase();
  }
  
  export function formatDateTime(dateStr: string): string {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('pt-BR');
  }
  