import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { extractAuthenticatedTenant, requireRole } from './auth.helpers';
import { UnauthorizedError, ForbiddenError } from '@/shared/errors';

describe('Auth Helpers', () => {
  const mockSingle = vi.fn();
  const mockEq = vi.fn(() => ({ single: mockSingle }));
  const mockSelect = vi.fn(() => ({ eq: mockEq }));
  const mockFrom = vi.fn(() => ({ select: mockSelect }));
  const mockGetUser = vi.fn();

  const mockSupabase = {
    auth: { getUser: mockGetUser },
    from: mockFrom,
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset env var if needed, though we can't easily change process.env in vitest without setup
    // Assuming DEV_MOCK_AUTH is false by default or we can mock it if we could.
    // Since the code reads process.env.DEV_MOCK_AUTH at module level, it's hard to change it dynamically 
    // without reloading the module. We will assume it is false for these tests.
  });

  describe('extractAuthenticatedTenant', () => {
    it('should return userId and tenantId when authenticated and has profile', async () => {
      const mockUser = { id: 'user-123' };
      const mockProfile = { org_id: 'org-456' };

      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockSingle.mockResolvedValue({ data: mockProfile, error: null });

      const result = await extractAuthenticatedTenant(mockSupabase);

      expect(result).toEqual({
        userId: 'user-123',
        tenantId: 'org-456',
      });

      expect(mockGetUser).toHaveBeenCalled();
      expect(mockFrom).toHaveBeenCalledWith('user_profiles');
      expect(mockSelect).toHaveBeenCalledWith('org_id');
      expect(mockEq).toHaveBeenCalledWith('id', 'user-123');
    });

    it('should throw UnauthorizedError when getUser fails', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Auth error' } });

      await expect(extractAuthenticatedTenant(mockSupabase))
        .rejects.toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError when user is null', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

      await expect(extractAuthenticatedTenant(mockSupabase))
        .rejects.toThrow(UnauthorizedError);
    });

    it('should throw ForbiddenError when profile fetch fails', async () => {
      const mockUser = { id: 'user-123' };
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockSingle.mockResolvedValue({ data: null, error: { message: 'Profile error' } });

      await expect(extractAuthenticatedTenant(mockSupabase))
        .rejects.toThrow(ForbiddenError);
    });

    it('should throw ForbiddenError when profile is null', async () => {
      const mockUser = { id: 'user-123' };
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockSingle.mockResolvedValue({ data: null, error: null });

      await expect(extractAuthenticatedTenant(mockSupabase))
        .rejects.toThrow(ForbiddenError);
    });
  });

  describe('requireRole', () => {
    it('should resolve when user has allowed role', async () => {
      const mockProfile = { role: 'ADMIN' };
      mockSingle.mockResolvedValue({ data: mockProfile, error: null });

      await expect(requireRole(mockSupabase, 'user-123', ['ADMIN', 'OWNER']))
        .resolves.not.toThrow();
      
      expect(mockFrom).toHaveBeenCalledWith('user_profiles');
      expect(mockSelect).toHaveBeenCalledWith('role');
      expect(mockEq).toHaveBeenCalledWith('id', 'user-123');
    });

    it('should throw ForbiddenError when user does not have allowed role', async () => {
      const mockProfile = { role: 'MEMBER' };
      mockSingle.mockResolvedValue({ data: mockProfile, error: null });

      await expect(requireRole(mockSupabase, 'user-123', ['ADMIN', 'OWNER']))
        .rejects.toThrow(ForbiddenError);
    });

    it('should throw ForbiddenError when profile not found', async () => {
      mockSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } });

      await expect(requireRole(mockSupabase, 'user-123', ['ADMIN']))
        .rejects.toThrow(ForbiddenError);
    });
  });
});
