import { describe, it, expect } from 'vitest';
import {
  DomainError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ValidationError,
  ConflictError,
  RateLimitError,
  handleError,
} from './index';

describe('Shared Errors', () => {
  describe('Error Classes', () => {
    it('DomainError should have correct properties', () => {
      const err = new DomainError('msg', 'CODE', 500);
      expect(err.message).toBe('msg');
      expect(err.code).toBe('CODE');
      expect(err.statusCode).toBe(500);
      expect(err.name).toBe('DomainError');
    });

    it('NotFoundError should have correct defaults', () => {
      const err = new NotFoundError('User', '123');
      expect(err.message).toBe('User com ID 123 não encontrado');
      expect(err.code).toBe('NOT_FOUND');
      expect(err.statusCode).toBe(404);
    });

    it('NotFoundError should handle missing id', () => {
      const err = new NotFoundError('User');
      expect(err.message).toBe('User não encontrado');
    });

    it('UnauthorizedError should have correct defaults', () => {
      const err = new UnauthorizedError();
      expect(err.message).toBe('Não autenticado');
      expect(err.code).toBe('UNAUTHORIZED');
      expect(err.statusCode).toBe(401);
    });

    it('ForbiddenError should have correct defaults', () => {
      const err = new ForbiddenError();
      expect(err.message).toBe('Sem permissão para esta ação');
      expect(err.code).toBe('FORBIDDEN');
      expect(err.statusCode).toBe(403);
    });

    it('ValidationError should have correct defaults', () => {
      const details = { field: ['error'] };
      const err = new ValidationError('Invalid', details);
      expect(err.message).toBe('Invalid');
      expect(err.code).toBe('VALIDATION_ERROR');
      expect(err.statusCode).toBe(400);
      expect(err.details).toEqual(details);
    });

    it('ConflictError should have correct defaults', () => {
      const err = new ConflictError('Exists');
      expect(err.message).toBe('Exists');
      expect(err.code).toBe('CONFLICT');
      expect(err.statusCode).toBe(409);
    });

    it('RateLimitError should have correct defaults', () => {
      const err = new RateLimitError();
      expect(err.message).toBe('Muitas requisições, tente novamente mais tarde');
      expect(err.code).toBe('RATE_LIMIT');
      expect(err.statusCode).toBe(429);
    });
  });

  describe('handleError', () => {
    it('should handle DomainError', () => {
      const err = new NotFoundError('Item');
      const result = handleError(err);
      
      expect(result.status).toBe(404);
      expect(result.body.error.code).toBe('NOT_FOUND');
      expect(result.body.error.message).toContain('Item');
    });

    it('should handle ValidationError with details', () => {
      const details = { field: ['Required'] };
      const err = new ValidationError('Invalid data', details);
      const result = handleError(err);
      
      expect(result.status).toBe(400);
      expect(result.body.error.code).toBe('VALIDATION_ERROR');
      expect(result.body.error.details).toEqual(details);
    });

    it('should handle Zod-like errors', () => {
      const zodError = {
        issues: [
          { path: ['user', 'name'], message: 'Required' },
          { path: ['age'], message: 'Too low' },
        ],
      };
      
      const result = handleError(zodError);
      
      expect(result.status).toBe(400);
      expect(result.body.error.code).toBe('VALIDATION_ERROR');
      expect(result.body.error.message).toBe('Dados inválidos');
      expect(result.body.error.details).toEqual({
        'user.name': ['Required'],
        'age': ['Too low'],
      });
    });

    it('should handle unknown errors', () => {
      const err = new Error('Boom');
      const result = handleError(err);
      
      expect(result.status).toBe(500);
      expect(result.body.error.code).toBe('INTERNAL_ERROR');
      expect(result.body.error.message).toBe('Erro interno do servidor');
    });

    it('should handle non-error objects', () => {
      const result = handleError('Something went wrong');
      
      expect(result.status).toBe(500);
      expect(result.body.error.code).toBe('INTERNAL_ERROR');
    });
  });
});
