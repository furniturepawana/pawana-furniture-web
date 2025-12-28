import session from 'express-session';

// Session configuration
export const sessionMiddleware = session({
  secret: process.env.ADMIN_PASSWORD || 'fallback-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    httpOnly: true,
    maxAge: 2 * 60 * 60 * 1000 // 2 hours
  }
});

// Middleware to check if admin is authenticated
export const requireAdminAuth = (req, res, next) => {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  const adminRoute = process.env.ADMIN_ROUTE || 'admin';
  res.redirect(`/${adminRoute}`);
};

// Validate login credentials
export const validateAdminLogin = (adminId, password) => {
  const validId = process.env.ADMIN_ID;
  const validPassword = process.env.ADMIN_PASSWORD;

  return adminId === validId && password === validPassword;
};
