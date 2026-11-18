import { Request, Response } from 'express';
import { ChatService, ChatHistoryMessage } from '../service/chat.service';

export class ChatController {
  public static async sendMessage(req: Request, res: Response): Promise<void> {
    try {
      const { message, history } = req.body;

      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        res.status(400).json({
          status: 'error',
          message: 'Please provide a valid question or message for the food assistant.',
        });
        return;
      }

      const trimmedMessage = message.trim();
      if (trimmedMessage.length > 1000) {
        res.status(400).json({
          status: 'error',
          message: 'Your message is a bit too long. Please keep it under 1000 characters.',
        });
        return;
      }

      // Validate history if supplied
      let validatedHistory: ChatHistoryMessage[] = [];
      if (Array.isArray(history)) {
        validatedHistory = history
          .filter(
            (item: any) =>
              item &&
              (item.role === 'user' || item.role === 'model') &&
              typeof item.text === 'string' &&
              item.text.trim().length > 0
          )
          .map((item: any) => ({
            role: item.role as 'user' | 'model',
            text: String(item.text).slice(0, 1500),
          }));
      }

      const reply = await ChatService.generateResponse(trimmedMessage, validatedHistory);

      res.status(200).json({
        status: 'success',
        data: {
          reply,
        },
      });
    } catch (error: any) {
      console.error('ChatController error:', error.message || error);
      res.status(500).json({
        status: 'error',
        message:
          error.message ||
          'Our AI food assistant encountered a hiccup. Please try asking again shortly!',
      });
    }
  }
}

