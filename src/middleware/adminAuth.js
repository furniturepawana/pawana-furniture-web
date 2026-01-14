// Simple stateless admin authentication with login form
// Uses a simple cookie to remember login - validated against env vars on each request

// Generate a simple auth token from credentials
const generateToken = (adminId, password) => {
  return Buffer.from(`${adminId}:${password}`).toString('base64');
};

// Validate token against environment variables
const validateToken = (token) => {
  if (!token) return false;
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    const [adminId, password] = decoded.split(':');
    const validId = process.env.ADMIN_ID;
    const validPassword = process.env.ADMIN_PASSWORD;
    return adminId === validId && password === validPassword;
  } catch {
    return false;
  }
};

// Check if user is logged in (for showing login form vs dashboard)
export const isAdminLoggedIn = (req) => {
  const token = req.cookies?.adminToken;
  return validateToken(token);
};

// Middleware to check if admin is authenticated
export const requireAdminAuth = (req, res, next) => {
  if (isAdminLoggedIn(req)) {
    return next();
  }
  const adminRoute = process.env.ADMIN_ROUTE || 'admin';
  res.redirect(`/${adminRoute}`);
};

// Validate login credentials and return token if valid
export const validateAdminLogin = (adminId, password) => {
  const validId = process.env.ADMIN_ID;
  const validPassword = process.env.ADMIN_PASSWORD;

  if (adminId === validId && password === validPassword) {
    return generateToken(adminId, password);
  }
  return null;
};

// Set admin cookie
export const setAdminCookie = (res, token) => {
  res.cookie('adminToken', token, {
    httpOnly: true,
    secure: true,  // Always true for HTTPS (required behind Cloudflare)
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax',
    path: '/'  // Ensure cookie is available for all paths
  });
};

// Clear admin cookie
export const clearAdminCookie = (res) => {
  res.clearCookie('adminToken');
};
