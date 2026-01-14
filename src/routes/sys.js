import express from 'express';
const router = express.Router();

router.get('/', (req, res) => {
  res.set('X-Robots-Tag', 'noindex, nofollow');
  res.render('pages/sys', {
    pageTitle: 'Developer Credits | Pawana® Furniture',
    pageDescription: 'Development credits and acknowledgments',
    noIndex: true
  });
});

export default router;
