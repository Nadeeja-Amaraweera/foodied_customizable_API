import { Router } from 'express';
import { ChatController } from '../controllers/chat.controller';

const router = Router();

// POST /api/v1/chat - Public endpoint for food ordering AI assistant
router.post('/', ChatController.sendMessage);

export default router;

