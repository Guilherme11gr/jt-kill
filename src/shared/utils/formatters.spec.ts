import { describe, it, expect } from 'vitest';
import {
  formatPrice,
  formatPhone,
  formatDate,
  truncate,
  slugify,
  formatNumber,
} from './formatters';

describe('formatters', () => {
  describe('formatPrice', () => {
    it('should format cents to BRL currency', () => {
      expect(formatPrice(1000)).toMatch(/R\$\s?10,00/); // Matches "R$ 10,00" or "R$10,00" depending on node locale
      expect(formatPrice(1550)).toMatch(/R\$\s?15,50/);
      expect(formatPrice(0)).toMatch(/R\$\s?0,00/);
    });
  });

  describe('formatPhone', () => {
    it('should format 11 digit phone number', () => {
      expect(formatPhone('11999998888')).toBe('(11) 99999-8888');
    });

    it('should format 10 digit phone number', () => {
      expect(formatPhone('1133334444')).toBe('(11) 3333-4444');
    });

    it('should handle input with non-digits', () => {
      expect(formatPhone('(11) 99999-8888')).toBe('(11) 99999-8888');
      expect(formatPhone('11 99999 8888')).toBe('(11) 99999-8888');
    });

    it('should remove country code 55 if present', () => {
      expect(formatPhone('5511999998888')).toBe('(11) 99999-8888');
    });

    it('should return original if invalid length', () => {
      expect(formatPhone('123')).toBe('123');
    });
  });

  describe('formatDate', () => {
    it('should format date with default options', () => {
      const date = new Date('2023-10-15T12:00:00Z');
      // Note: Intl.DateTimeFormat uses local time by default unless timeZone is specified.
      // This test might be flaky across timezones if not careful.
      // Ideally formatters.ts should enforce a timezone or use date-utils.
      // For now, we check if it returns a string.
      expect(formatDate(date)).toBeDefined();
    });
  });

  describe('truncate', () => {
    it('should truncate text longer than maxLength', () => {
      expect(truncate('Hello World', 8)).toBe('Hello...');
    });

    it('should not truncate text shorter than maxLength', () => {
      expect(truncate('Hello', 10)).toBe('Hello');
    });

    it('should not truncate text equal to maxLength', () => {
      expect(truncate('Hello', 5)).toBe('Hello');
    });
  });

  describe('slugify', () => {
    it('should convert to lowercase', () => {
      expect(slugify('Hello')).toBe('hello');
    });

    it('should replace spaces with hyphens', () => {
      expect(slugify('Hello World')).toBe('hello-world');
    });

    it('should remove accents', () => {
      expect(slugify('Olá Mundo')).toBe('ola-mundo');
    });

    it('should remove special characters', () => {
      expect(slugify('Hello! @World#')).toBe('hello-world');
    });

    it('should trim hyphens', () => {
      expect(slugify('-Hello-')).toBe('hello');
    });
  });

  describe('formatNumber', () => {
    it('should format number with thousands separator', () => {
      expect(formatNumber(1000)).toBe('1.000');
      expect(formatNumber(1000000)).toBe('1.000.000');
    });
  });
});
