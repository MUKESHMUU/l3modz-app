const mockCookieSet = jest.fn();
const mockFindOne = jest.fn();

jest.mock('@/lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/models/User', () => ({
  __esModule: true,
  default: { findOne: mockFindOne },
}));

jest.mock('@/lib/auth', () => ({
  comparePassword: jest.fn(),
  getAuthCookieOptions: jest.fn(() => ({ httpOnly: true, secure: true, sameSite: 'none', path: '/' })),
  signToken: jest.fn(() => 'test-token'),
}));

jest.mock('next/headers', () => ({
  cookies: jest.fn(async () => ({ set: mockCookieSet })),
}));

jest.mock('@/lib/rateLimit', () => ({
  adminLoginLimiter: {
    check: jest.fn(() => ({ allowed: true })),
    reset: jest.fn(),
  },
  getClientIdentifier: jest.fn(() => 'test-client'),
}));

jest.mock('@/lib/securityLogger', () => ({
  logAdminLoginAttempt: jest.fn(),
  logRateLimitViolation: jest.fn(),
}));

describe('POST /api/auth/admin/password-login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  async function loadRoute() {
    return import('@/app/api/auth/admin/password-login/route');
  }

  function request(email: string, password: string) {
    return new Request('http://localhost/api/auth/admin/password-login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      headers: { 'content-type': 'application/json' },
    });
  }

  it('authenticates an admin using that admin user credentials and persists the session cookie', async () => {
    const { comparePassword } = await import('@/lib/auth');
    mockFindOne.mockResolvedValue({
      _id: 'admin-2',
      name: 'Second Admin',
      email: 'second@example.com',
      role: 'admin',
      password: 'hashed-password',
    });
    (comparePassword as jest.Mock).mockResolvedValue(true);
    const { POST } = await loadRoute();

    const response = await POST(request('SECOND@example.com', 'correct-password'));

    expect(response.status).toBe(200);
    expect(mockFindOne).toHaveBeenCalledWith({
      email: 'second@example.com',
      role: 'admin',
    });
    expect(comparePassword).toHaveBeenCalledWith('correct-password', 'hashed-password');
    expect(mockCookieSet).toHaveBeenCalledWith('token', 'test-token', expect.objectContaining({
      httpOnly: true,
      path: '/',
    }));
    expect(await response.json()).toMatchObject({
      user: { id: 'admin-2', role: 'admin' },
    });
  });

  it('rejects invalid credentials without creating a session', async () => {
    const { comparePassword } = await import('@/lib/auth');
    mockFindOne.mockResolvedValue({
      _id: 'admin-1',
      role: 'admin',
      password: 'hashed-password',
    });
    (comparePassword as jest.Mock).mockResolvedValue(false);
    const { POST } = await loadRoute();

    const response = await POST(request('admin@example.com', 'wrong-password'));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ message: 'Invalid admin credentials' });
    expect(mockCookieSet).not.toHaveBeenCalled();
  });

  it('rejects a non-admin even when the password is valid', async () => {
    const { comparePassword } = await import('@/lib/auth');
    mockFindOne.mockResolvedValue(null);
    (comparePassword as jest.Mock).mockResolvedValue(true);
    const { POST } = await loadRoute();

    const response = await POST(request('user@example.com', 'correct-password'));

    expect(response.status).toBe(401);
    expect(mockCookieSet).not.toHaveBeenCalled();
  });
});
