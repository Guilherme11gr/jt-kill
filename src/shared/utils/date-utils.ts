/**
 * @fileoverview Utilitários de manipulação de datas
 * 
 * ⚠️ CRÍTICO: SEMPRE usar estas funções ao invés de date-fns diretamente!
 * 
 * Regras:
 * - Backend/Banco: SEMPRE UTC
 * - Frontend/UI: SEMPRE timezone local (America/Sao_Paulo)
 * 
 * @see docs/guides/date-handling.md
 */

import { format, parseISO, addDays, startOfDay, endOfDay, isSameDay, isBefore, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

// Constantes
export const TIMEZONE = 'America/Sao_Paulo';
export const UTC_OFFSET_HOURS = -3;

// ============================================================================
// Obter Data Atual
// ============================================================================

/**
 * Retorna a data/hora atual
 */
export function getCurrentDate(): Date {
  return new Date();
}

/**
 * Retorna a data atual no timezone local
 */
export function getCurrentDateLocal(): Date {
  return toZonedTime(new Date(), TIMEZONE);
}

// ============================================================================
// Formatação para Display (UI)
// ============================================================================

/**
 * Formata data para exibição (dd/MM/yyyy)
 */
export function formatDateForDisplay(date: Date | string): string {
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  const zonedDate = toZonedTime(parsedDate, TIMEZONE);
  return format(zonedDate, 'dd/MM/yyyy', { locale: ptBR });
}

/**
 * Formata data e hora para exibição (dd/MM/yyyy HH:mm)
 */
export function formatDateTimeForDisplay(date: Date | string): string {
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  const zonedDate = toZonedTime(parsedDate, TIMEZONE);
  return format(zonedDate, 'dd/MM/yyyy HH:mm', { locale: ptBR });
}

/**
 * Formata hora para exibição (HH:mm)
 */
export function formatTimeForDisplay(date: Date | string): string {
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  const zonedDate = toZonedTime(parsedDate, TIMEZONE);
  return format(zonedDate, 'HH:mm', { locale: ptBR });
}

/**
 * Formata data relativa (hoje, ontem, há X dias)
 */
export function formatRelativeDate(date: Date | string): string {
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  const now = getCurrentDate();
  const diffTime = now.getTime() - parsedDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffTime / (1000 * 60));

  if (diffMinutes < 1) return 'agora';
  if (diffMinutes < 60) return `há ${diffMinutes} min`;
  if (diffHours < 24) return `há ${diffHours}h`;
  if (diffDays === 0) return 'hoje';
  if (diffDays === 1) return 'ontem';
  if (diffDays < 7) return `há ${diffDays} dias`;
  
  return formatDateForDisplay(parsedDate);
}

// ============================================================================
// Formatação para Banco (Backend)
// ============================================================================

/**
 * Formata data para salvar no banco (ISO 8601 UTC)
 */
export function formatDateForDatabase(date: Date): string {
  return date.toISOString();
}

/**
 * Formata apenas a data para queries (yyyy-MM-dd)
 */
export function formatDateOnlyForDatabase(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

// ============================================================================
// Parse de Strings
// ============================================================================

/**
 * Parse de string ISO (do banco)
 */
export function parseDate(dateString: string): Date {
  return parseISO(dateString);
}

/**
 * Parse de string local (input do usuário dd/MM/yyyy)
 */
export function parseDateFromInput(dateString: string): Date {
  const [day, month, year] = dateString.split('/').map(Number);
  const localDate = new Date(year, month - 1, day);
  return fromZonedTime(localDate, TIMEZONE);
}

// ============================================================================
// Manipulação
// ============================================================================

/**
 * Adiciona/subtrai dias
 */
export function addDaysToDate(date: Date, days: number): Date {
  return addDays(date, days);
}

/**
 * Início do dia no timezone local
 */
export function startOfDayLocal(date: Date): Date {
  const zonedDate = toZonedTime(date, TIMEZONE);
  return fromZonedTime(startOfDay(zonedDate), TIMEZONE);
}

/**
 * Início do dia em UTC
 */
export function startOfDayUTC(date: Date): Date {
  return startOfDay(date);
}

/**
 * Fim do dia no timezone local
 */
export function endOfDayLocal(date: Date): Date {
  const zonedDate = toZonedTime(date, TIMEZONE);
  return fromZonedTime(endOfDay(zonedDate), TIMEZONE);
}

/**
 * Fim do dia em UTC
 */
export function endOfDayUTC(date: Date): Date {
  return endOfDay(date);
}

// ============================================================================
// Comparações
// ============================================================================

/**
 * Verifica se duas datas são o mesmo dia
 */
export function isSameDayDate(date1: Date, date2: Date): boolean {
  return isSameDay(date1, date2);
}

/**
 * Verifica se date1 é antes de date2
 */
export function isDateBefore(date1: Date, date2: Date): boolean {
  return isBefore(date1, date2);
}

/**
 * Verifica se date1 é depois de date2
 */
export function isDateAfter(date1: Date, date2: Date): boolean {
  return isAfter(date1, date2);
}
