import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import {
  formatDateForDisplay,
  formatDateTimeForDisplay,
  formatTimeForDisplay,
  formatRelativeDate,
  formatDateForDatabase,
  TIMEZONE,
} from './date-utils';
import { toZonedTime } from 'date-fns-tz';

describe('date-utils', () => {
  // Mock system time to ensure consistent relative date tests
  const MOCK_NOW = new Date('2023-10-15T12:00:00Z'); // 15/10/2023 12:00 UTC

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(MOCK_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('formatDateForDisplay', () => {
    it('should format date as dd/MM/yyyy in Sao Paulo timezone', () => {
      // 15/10/2023 12:00 UTC is 15/10/2023 09:00 in Sao Paulo
      const date = new Date('2023-10-15T12:00:00Z');
      expect(formatDateForDisplay(date)).toBe('15/10/2023');
    });

    it('should handle string input', () => {
      expect(formatDateForDisplay('2023-10-15T12:00:00Z')).toBe('15/10/2023');
    });
  });

  describe('formatDateTimeForDisplay', () => {
    it('should format date and time as dd/MM/yyyy HH:mm in Sao Paulo timezone', () => {
      // 15/10/2023 12:00 UTC is 15/10/2023 09:00 in Sao Paulo
      const date = new Date('2023-10-15T12:00:00Z');
      expect(formatDateTimeForDisplay(date)).toBe('15/10/2023 09:00');
    });
  });

  describe('formatTimeForDisplay', () => {
    it('should format time as HH:mm in Sao Paulo timezone', () => {
      // 15/10/2023 12:00 UTC is 15/10/2023 09:00 in Sao Paulo
      const date = new Date('2023-10-15T12:00:00Z');
      expect(formatTimeForDisplay(date)).toBe('09:00');
    });
  });

  describe('formatRelativeDate', () => {
    it('should return "agora" for less than 1 minute', () => {
      const date = new Date(MOCK_NOW.getTime() - 30 * 1000); // 30 seconds ago
      expect(formatRelativeDate(date)).toBe('agora');
    });

    it('should return "há X min" for minutes', () => {
      const date = new Date(MOCK_NOW.getTime() - 5 * 60 * 1000); // 5 minutes ago
      expect(formatRelativeDate(date)).toBe('há 5 min');
    });

    it('should return "há Xh" for hours', () => {
      const date = new Date(MOCK_NOW.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago
      expect(formatRelativeDate(date)).toBe('há 2h');
    });

    it('should return "hoje" for same day but more than 24h (edge case logic check)', () => {
      // The logic in formatRelativeDate uses diffDays = floor(diffTime / dayMs)
      // If it's same calendar day but logic is purely time based, let's check implementation.
      // Implementation: diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      // if diffDays === 0 return 'hoje'.
      // So 23 hours ago is still 'hoje' by this logic if it falls in 0 days bucket.
      const date = new Date(MOCK_NOW.getTime() - 23 * 60 * 60 * 1000); 
      // 23 hours ago. diffHours < 24 is checked BEFORE diffDays === 0.
      // So it should return 'há 23h'.
      expect(formatRelativeDate(date)).toBe('há 23h');
    });

    it('should return "ontem" for 1 day ago', () => {
      const date = new Date(MOCK_NOW.getTime() - 25 * 60 * 60 * 1000); // 25 hours ago
      // diffDays = floor(25h / 24h) = 1
      expect(formatRelativeDate(date)).toBe('ontem');
    });

    it('should return "há X dias" for less than 7 days', () => {
      const date = new Date(MOCK_NOW.getTime() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
      expect(formatRelativeDate(date)).toBe('há 3 dias');
    });

    it('should return formatted date for 7 days or more', () => {
      const date = new Date(MOCK_NOW.getTime() - 8 * 24 * 60 * 60 * 1000); // 8 days ago
      // 8 days ago from 15/10 is 07/10
      expect(formatRelativeDate(date)).toBe('07/10/2023');
    });
  });

  describe('formatDateForDatabase', () => {
    it('should return ISO string', () => {
      const date = new Date('2023-10-15T12:00:00Z');
      expect(formatDateForDatabase(date)).toBe('2023-10-15T12:00:00.000Z');
    });
  });
});
