import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import bcrypt from "bcryptjs";
import { 
  insertUserSchema, 
  insertExpertSchema, 
  insertCategorySchema, 
  insertAdviceSchema, 
  insertSessionSchema,
  insertMessageSchema,
  insertPaymentSchema,
  insertFeedbackSchema
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes prefix
  const apiRouter = express.Router();
  app.use("/api", apiRouter);
  
  // Authentication route
  apiRouter.post("/auth/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }
      
      // Find user by username
      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Validate password using bcrypt
      const isPasswordValid = await bcrypt.compare(password, user.password);
      
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Check if user is expert
      const expert = user.role === "expert" ? await storage.getExpertByUserId(user.id) : null;
      
      // Return user info (without password)
      const { password: _, ...userWithoutPassword } = user;
      
      res.json({
        ...userWithoutPassword,
        isExpert: !!expert,
        expertId: expert?.id
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Authentication failed" });
    }
  });

  // User routes
  apiRouter.post("/users", async (req: Request, res: Response) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.status(201).json(user);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: validationError.message });
      } else {
        res.status(500).json({ message: "Failed to create user" });
      }
    }
  });

  apiRouter.get("/users/:id", async (req: Request, res: Response) => {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  });

  // Expert routes
  apiRouter.get("/experts", async (_req: Request, res: Response) => {
    const experts = await storage.getAllExperts();
    
    // Fetch user info for each expert
    const expertsWithUserInfo = await Promise.all(
      experts.map(async (expert) => {
        const user = await storage.getUser(expert.userId);
        return {
          ...expert,
          name: user?.name,
          avatar: user?.avatar
        };
      })
    );
    
    res.json(expertsWithUserInfo);
  });

  apiRouter.get("/experts/:id", async (req: Request, res: Response) => {
    const expertId = parseInt(req.params.id);
    if (isNaN(expertId)) {
      return res.status(400).json({ message: "Invalid expert ID" });
    }

    const expert = await storage.getExpert(expertId);
    if (!expert) {
      return res.status(404).json({ message: "Expert not found" });
    }

    // Get user information
    const user = await storage.getUser(expert.userId);
    const expertWithUserInfo = {
      ...expert,
      name: user?.name,
      avatar: user?.avatar
    };

    res.json(expertWithUserInfo);
  });

  apiRouter.post("/experts", async (req: Request, res: Response) => {
    try {
      const expertData = insertExpertSchema.parse(req.body);
      const expert = await storage.createExpert(expertData);
      res.status(201).json(expert);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: validationError.message });
      } else {
        res.status(500).json({ message: "Failed to create expert" });
      }
    }
  });
  
  apiRouter.patch("/experts/:id/availability", async (req: Request, res: Response) => {
    const expertId = parseInt(req.params.id);
    if (isNaN(expertId)) {
      return res.status(400).json({ message: "Invalid expert ID" });
    }
    
    const { availability } = req.body;
    if (typeof availability !== 'boolean') {
      return res.status(400).json({ message: "Availability must be a boolean" });
    }
    
    const expert = await storage.updateExpertAvailability(expertId, availability);
    if (!expert) {
      return res.status(404).json({ message: "Expert not found" });
    }
    
    res.json(expert);
  });

  // Category routes
  apiRouter.get("/categories", async (_req: Request, res: Response) => {
    const categories = await storage.getAllCategories();
    res.json(categories);
  });

  apiRouter.get("/categories/:id", async (req: Request, res: Response) => {
    const categoryId = parseInt(req.params.id);
    if (isNaN(categoryId)) {
      return res.status(400).json({ message: "Invalid category ID" });
    }

    const category = await storage.getCategory(categoryId);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.json(category);
  });

  apiRouter.get("/categories/:id/experts", async (req: Request, res: Response) => {
    const categoryId = parseInt(req.params.id);
    if (isNaN(categoryId)) {
      return res.status(400).json({ message: "Invalid category ID" });
    }

    const experts = await storage.getExpertsByCategory(categoryId);
    
    // Fetch user info for each expert
    const expertsWithUserInfo = await Promise.all(
      experts.map(async (expert) => {
        const user = await storage.getUser(expert.userId);
        return {
          ...expert,
          name: user?.name,
          avatar: user?.avatar
        };
      })
    );
    
    res.json(expertsWithUserInfo);
  });

  // Advice routes
  apiRouter.get("/advice", async (_req: Request, res: Response) => {
    const advices = await storage.getAllAdvices();
    res.json(advices);
  });

  apiRouter.get("/advice/:id", async (req: Request, res: Response) => {
    const adviceId = parseInt(req.params.id);
    if (isNaN(adviceId)) {
      return res.status(400).json({ message: "Invalid advice ID" });
    }

    const advice = await storage.getAdvice(adviceId);
    if (!advice) {
      return res.status(404).json({ message: "Advice not found" });
    }

    res.json(advice);
  });

  apiRouter.get("/experts/:expertId/advice", async (req: Request, res: Response) => {
    const expertId = parseInt(req.params.expertId);
    if (isNaN(expertId)) {
      return res.status(400).json({ message: "Invalid expert ID" });
    }

    const advices = await storage.getAdvicesByExpert(expertId);
    res.json(advices);
  });

  apiRouter.get("/categories/:categoryId/advice", async (req: Request, res: Response) => {
    const categoryId = parseInt(req.params.categoryId);
    if (isNaN(categoryId)) {
      return res.status(400).json({ message: "Invalid category ID" });
    }

    const advices = await storage.getAdvicesByCategory(categoryId);
    res.json(advices);
  });

  apiRouter.post("/advice", async (req: Request, res: Response) => {
    try {
      const adviceData = insertAdviceSchema.parse(req.body);
      const advice = await storage.createAdvice(adviceData);
      res.status(201).json(advice);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: validationError.message });
      } else {
        res.status(500).json({ message: "Failed to create advice" });
      }
    }
  });

  // Chat routes
  apiRouter.get("/chats/user/:userId", async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const chats = await storage.getChatsByUser(userId);
    
    // Get expert and last message info for each chat
    const chatsWithDetails = await Promise.all(
      chats.map(async (chat) => {
        const expert = await storage.getExpert(chat.expertId);
        const user = expert ? await storage.getUser(expert.userId) : null;
        
        return {
          ...chat,
          expertName: user?.name,
          expertAvatar: user?.avatar
        };
      })
    );
    
    res.json(chatsWithDetails);
  });

  apiRouter.get("/chats/expert/:expertId", async (req: Request, res: Response) => {
    const expertId = parseInt(req.params.expertId);
    if (isNaN(expertId)) {
      return res.status(400).json({ message: "Invalid expert ID" });
    }

    const chats = await storage.getChatsByExpert(expertId);
    
    // Get user info for each chat
    const chatsWithDetails = await Promise.all(
      chats.map(async (chat) => {
        const user = await storage.getUser(chat.userId);
        
        return {
          ...chat,
          userName: user?.name,
          userAvatar: user?.avatar
        };
      })
    );
    
    res.json(chatsWithDetails);
  });

  apiRouter.get("/chats/:sessionId/messages", async (req: Request, res: Response) => {
    const sessionId = parseInt(req.params.sessionId);
    if (isNaN(sessionId)) {
      return res.status(400).json({ message: "Invalid session ID" });
    }

    const messages = await storage.getMessagesBySession(sessionId);
    res.json(messages);
  });

  apiRouter.post("/chats", async (req: Request, res: Response) => {
    try {
      const sessionData = insertSessionSchema.parse({
        ...req.body,
        type: "chat",
        startTime: new Date()
      });
      
      // Check if chat already exists between user and expert
      const existingChat = await storage.getChatByUserAndExpert(
        sessionData.userId, 
        sessionData.expertId
      );
      
      if (existingChat) {
        return res.json(existingChat);
      }
      
      const chat = await storage.createChat(sessionData);
      res.status(201).json(chat);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: validationError.message });
      } else {
        res.status(500).json({ message: "Failed to create chat" });
      }
    }
  });

  apiRouter.post("/messages", async (req: Request, res: Response) => {
    try {
      const messageData = insertMessageSchema.parse(req.body);
      const message = await storage.createMessage(messageData);
      res.status(201).json(message);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: validationError.message });
      } else {
        res.status(500).json({ message: "Failed to create message" });
      }
    }
  });

  apiRouter.post("/chats/:sessionId/read", async (req: Request, res: Response) => {
    const sessionId = parseInt(req.params.sessionId);
    if (isNaN(sessionId)) {
      return res.status(400).json({ message: "Invalid session ID" });
    }
    
    const { userId } = req.body;
    if (!userId || isNaN(userId)) {
      return res.status(400).json({ message: "Valid user ID required" });
    }
    
    await storage.markMessagesAsRead(sessionId, userId);
    res.json({ success: true });
  });

  // Feedback routes
  apiRouter.post("/feedback", async (req: Request, res: Response) => {
    try {
      const feedbackData = insertFeedbackSchema.parse(req.body);
      const feedback = await storage.createFeedback(feedbackData);
      res.status(201).json(feedback);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: validationError.message });
      } else {
        res.status(500).json({ message: "Failed to create feedback" });
      }
    }
  });
  
  apiRouter.get("/experts/:expertId/feedback", async (req: Request, res: Response) => {
    try {
      const { expertId } = req.params;
      
      if (!expertId) {
        return res.status(400).json({ message: "Expert ID is required" });
      }
      
      const feedback = await storage.getFeedbacksByExpert(parseInt(expertId));
      res.json(feedback);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  apiRouter.get("/experts/:expertId/rating", async (req: Request, res: Response) => {
    try {
      const { expertId } = req.params;
      
      if (!expertId) {
        return res.status(400).json({ message: "Expert ID is required" });
      }
      
      const averageRating = await storage.getAverageRatingForExpert(parseInt(expertId));
      res.json({ rating: averageRating });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  apiRouter.get("/sessions/:sessionId/feedback", async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      
      if (!sessionId) {
        return res.status(400).json({ message: "Session ID is required" });
      }
      
      const feedback = await storage.getFeedbacksBySession(parseInt(sessionId));
      res.json(feedback);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Payment routes
  apiRouter.post("/payments", async (req: Request, res: Response) => {
    try {
      const paymentData = insertPaymentSchema.parse(req.body);
      const payment = await storage.createPayment(paymentData);
      res.status(201).json(payment);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: validationError.message });
      } else {
        res.status(500).json({ message: "Failed to create payment" });
      }
    }
  });

  apiRouter.get("/users/:userId/payments", async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const payments = await storage.getPaymentsByUser(userId);
    res.json(payments);
  });

  apiRouter.get("/experts/:expertId/payments", async (req: Request, res: Response) => {
    const expertId = parseInt(req.params.expertId);
    if (isNaN(expertId)) {
      return res.status(400).json({ message: "Invalid expert ID" });
    }

    const payments = await storage.getPaymentsByExpert(expertId);
    res.json(payments);
  });

  // Create HTTP server
  const httpServer = createServer(app);
  
  // WebSocket connected clients map
  interface WebSocketClient extends WebSocket {
    userId?: string;
    isAlive?: boolean;
  }
  
  const connectedClients: Map<string, WebSocketClient> = new Map();
  
  // Setup WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws: WebSocketClient) => {
    console.log('WebSocket client connected');
    ws.isAlive = true;
    
    // Ping mechanism to detect broken connections
    ws.on('pong', () => {
      ws.isAlive = true;
    });
    
    ws.on('message', (message: Buffer | string) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Handle registration
        if (data.type === 'register' && data.userId) {
          ws.userId = data.userId;
          connectedClients.set(data.userId, ws);
          console.log(`User ${data.userId} registered for WebRTC signaling`);
          return;
        }
        
        // Handle signaling messages
        if (data.type && data.from && data.to) {
          // Find the recipient
          const recipient = connectedClients.get(data.to);
          if (recipient && recipient.readyState === WebSocket.OPEN) {
            recipient.send(message.toString());
          } else {
            // Inform sender that recipient is not available
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'error',
                message: 'Recipient not available',
                from: 'server',
                to: data.from
              }));
            }
          }
        }
      } catch (e) {
        console.error('Error handling WebSocket message:', e);
      }
    });
    
    ws.on('close', () => {
      if (ws.userId) {
        connectedClients.delete(ws.userId);
        console.log(`User ${ws.userId} disconnected from WebRTC signaling`);
      }
    });
  });
  
  // Set up a ping interval to keep connections alive and detect broken ones
  const pingInterval = setInterval(() => {
    wss.clients.forEach((ws: WebSocketClient) => {
      if (ws.isAlive === false) {
        // Connection is dead
        if (ws.userId) {
          connectedClients.delete(ws.userId);
        }
        return ws.terminate();
      }
      
      // Mark as potentially dead until we receive a pong
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000); // Check every 30 seconds
  
  // Clean up interval on close
  wss.on('close', () => {
    clearInterval(pingInterval);
  });
  
  return httpServer;
}
