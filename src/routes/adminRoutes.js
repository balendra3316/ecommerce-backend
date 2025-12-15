import express from 'express';
import { loginAdmin, getAdminMe, logoutAdmin, createSeedAdmin } from '../controllers/adminController.js';
import { protectAdmin } from '../middlewares/adminMiddleware.js';

const router = express.Router();

router.post('/login', loginAdmin);
//router.post('/seed', createSeedAdmin); // Remove this in production after creating first admin
router.get('/me', protectAdmin, getAdminMe);
router.get('/logout',protectAdmin, logoutAdmin);

export default router;