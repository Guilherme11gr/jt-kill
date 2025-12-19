import { describe, it, expect } from 'vitest';
import {
  uuidSchema,
  slugSchema,
  projectKeySchema,
  paginationSchema,
  createTaskSchema,
  storyPointsSchema,
  safeParse,
} from './validators';

describe('validators', () => {
  describe('uuidSchema', () => {
    it('should validate correct UUID', () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      expect(uuidSchema.safeParse(uuid).success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      expect(uuidSchema.safeParse('invalid-uuid').success).toBe(false);
    });
  });

  describe('slugSchema', () => {
    it('should validate correct slug', () => {
      expect(slugSchema.safeParse('my-slug-123').success).toBe(true);
    });

    it('should reject uppercase', () => {
      expect(slugSchema.safeParse('My-Slug').success).toBe(false);
    });

    it('should reject special chars', () => {
      expect(slugSchema.safeParse('slug!').success).toBe(false);
    });

    it('should enforce min/max length', () => {
      expect(slugSchema.safeParse('a').success).toBe(false);
      expect(slugSchema.safeParse('a'.repeat(51)).success).toBe(false);
    });
  });

  describe('projectKeySchema', () => {
    it('should validate correct key', () => {
      expect(projectKeySchema.safeParse('PROJ1').success).toBe(true);
    });

    it('should reject lowercase', () => {
      expect(projectKeySchema.safeParse('proj').success).toBe(false);
    });

    it('should enforce min/max length', () => {
      expect(projectKeySchema.safeParse('A').success).toBe(false);
      expect(projectKeySchema.safeParse('A'.repeat(11)).success).toBe(false);
    });
  });

  describe('paginationSchema', () => {
    it('should use defaults', () => {
      const result = paginationSchema.parse({});
      expect(result).toEqual({ page: 1, pageSize: 20 });
    });

    it('should validate inputs', () => {
      const result = paginationSchema.parse({ page: '2', pageSize: '50' });
      expect(result).toEqual({ page: 2, pageSize: 50 });
    });

    it('should enforce limits', () => {
      expect(paginationSchema.safeParse({ page: 0 }).success).toBe(false);
      expect(paginationSchema.safeParse({ pageSize: 101 }).success).toBe(false);
    });
  });

  describe('storyPointsSchema', () => {
    it('should accept Fibonacci numbers', () => {
      expect(storyPointsSchema.safeParse(1).success).toBe(true);
      expect(storyPointsSchema.safeParse(3).success).toBe(true);
      expect(storyPointsSchema.safeParse(8).success).toBe(true);
    });

    it('should reject non-Fibonacci numbers', () => {
      expect(storyPointsSchema.safeParse(4).success).toBe(false);
      expect(storyPointsSchema.safeParse(10).success).toBe(false);
    });

    it('should accept null', () => {
      expect(storyPointsSchema.safeParse(null).success).toBe(true);
    });
  });

  describe('createTaskSchema', () => {
    it('should validate valid task', () => {
      const input = {
        featureId: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Valid Task',
        type: 'TASK',
        priority: 'MEDIUM',
      };
      expect(createTaskSchema.safeParse(input).success).toBe(true);
    });

    it('should reject short title', () => {
      const input = {
        featureId: '123e4567-e89b-12d3-a456-426614174000',
        title: 'No',
      };
      expect(createTaskSchema.safeParse(input).success).toBe(false);
    });
  });

  describe('safeParse', () => {
    it('should return success object', () => {
      const result = safeParse(slugSchema, 'valid-slug');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('valid-slug');
      }
    });

    it('should return error object', () => {
      const result = safeParse(slugSchema, 'INVALID');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });
  });
});
