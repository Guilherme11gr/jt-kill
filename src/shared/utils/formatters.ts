/**
 * @fileoverview Funções de formatação para UI
 */

/**
 * Formata valor em centavos para exibição em Reais
 * @param cents - Valor em centavos
 * @returns String formatada (ex: "R$ 150,00")
 */
export function formatPrice(cents: number): string {
  const reais = cents / 100;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(reais);
}

/**
 * Formata telefone para exibição
 * @param phone - Telefone (pode ter ou não formatação)
 * @returns Telefone formatado (XX) XXXXX-XXXX
 */
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  
  // Remove código do país se presente
  const withoutCountry = cleaned.startsWith('55') && cleaned.length > 11
    ? cleaned.slice(2)
    : cleaned;
  
  if (withoutCountry.length === 11) {
    return `(${withoutCountry.slice(0, 2)}) ${withoutCountry.slice(2, 7)}-${withoutCountry.slice(7)}`;
  }
  
  if (withoutCountry.length === 10) {
    return `(${withoutCountry.slice(0, 2)}) ${withoutCountry.slice(2, 6)}-${withoutCountry.slice(6)}`;
  }
  
  return phone;
}

/**
 * Trunca texto com ellipsis
 * @param text - Texto original
 * @param maxLength - Tamanho máximo
 * @returns Texto truncado
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
}

/**
 * Formata número com separador de milhares
 * @param num - Número
 * @returns String formatada
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('pt-BR').format(num);
}

/**
 * Formata porcentagem
 * @param value - Valor decimal (0.15 = 15%)
 * @param decimals - Casas decimais
 * @returns String formatada (ex: "15%")
 */
export function formatPercent(value: number, decimals = 0): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}
