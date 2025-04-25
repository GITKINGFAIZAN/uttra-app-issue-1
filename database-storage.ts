import { IStorage } from "./storage";
import { db } from "./db";
import { 
  users, experts, categories, advices, sessions, messages, bookings, payments, inspirations, feedback,
  User, Expert, Category, Advice, Session, Message, Booking, Payment, Inspiration, Feedback,
  InsertUser, InsertExpert, InsertCategory, InsertAdvice, InsertSession, InsertMessage, InsertBooking, InsertPayment, InsertInspiration, InsertFeedback
} from "@shared/schema";
import { eq, and, desc, asc, sql } from "drizzle-orm";
import crypto from "crypto";
import bcrypt from "bcryptjs";

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Hash the password if it's not already hashed
    let hashedPassword = insertUser.password;
    if (!hashedPassword.startsWith("$2a$")) {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(insertUser.password, salt);
    }

    const userData = {
      ...insertUser,
      password: hashedPassword,
      role: insertUser.role || "user"
    };

    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  // Expert operations
  async getExpert(id: number): Promise<Expert | undefined> {
    const [expert] = await db.select().from(experts).where(eq(experts.id, id));
    return expert || undefined;
  }

  async getExpertByUserId(userId: number): Promise<Expert | undefined> {
    const [expert] = await db.select().from(experts).where(eq(experts.userId, userId));
    return expert || undefined;
  }

  async createExpert(insertExpert: InsertExpert): Promise<Expert> {
    const [expert] = await db.insert(experts).values(insertExpert).returning();
    return expert;
  }

  async updateExpertAvailability(id: number, availability: boolean): Promise<Expert | undefined> {
    const [expert] = await db
      .update(experts)
      .set({ availability, updatedAt: new Date() })
      .where(eq(experts.id, id))
      .returning();
    
    return expert || undefined;
  }

  async getAllExperts(): Promise<Expert[]> {
    return db.select().from(experts);
  }

  async getExpertsByCategory(categoryId: number): Promise<Expert[]> {
    return db.select().from(experts).where(eq(experts.categoryId, categoryId));
  }

  // Category operations
  async getCategory(id: number): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category || undefined;
  }

  async getAllCategories(): Promise<Category[]> {
    return db.select().from(categories);
  }

  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const [category] = await db.insert(categories).values(insertCategory).returning();
    return category;
  }

  // Advice operations
  async getAdvice(id: number): Promise<Advice | undefined> {
    const [advice] = await db.select().from(advices).where(eq(advices.id, id));
    return advice || undefined;
  }

  async getAllAdvices(): Promise<Advice[]> {
    return db.select().from(advices);
  }

  async getAdvicesByExpert(expertId: number): Promise<Advice[]> {
    return db.select().from(advices).where(eq(advices.expertId, expertId));
  }

  async getAdvicesByCategory(categoryId: number): Promise<Advice[]> {
    return db.select().from(advices).where(eq(advices.categoryId, categoryId));
  }

  async createAdvice(insertAdvice: InsertAdvice): Promise<Advice> {
    const [advice] = await db.insert(advices).values(insertAdvice).returning();
    return advice;
  }

  // Session operations (replaces chat operations)
  async getSession(id: number): Promise<Session | undefined> {
    const [session] = await db.select().from(sessions).where(eq(sessions.id, id));
    return session || undefined;
  }

  async getSessionByUserAndExpert(userId: number, expertId: number): Promise<Session | undefined> {
    const [session] = await db.select()
      .from(sessions)
      .where(and(
        eq(sessions.userId, userId),
        eq(sessions.expertId, expertId)
      ))
      .orderBy(desc(sessions.startTime))
      .limit(1);
    
    return session || undefined;
  }

  async getSessionsByUser(userId: number): Promise<Session[]> {
    return db.select()
      .from(sessions)
      .where(eq(sessions.userId, userId))
      .orderBy(desc(sessions.startTime));
  }

  async getSessionsByExpert(expertId: number): Promise<Session[]> {
    return db.select()
      .from(sessions)
      .where(eq(sessions.expertId, expertId))
      .orderBy(desc(sessions.startTime));
  }

  async createSession(insertSession: InsertSession): Promise<Session> {
    const [session] = await db.insert(sessions)
      .values(insertSession)
      .returning();
    
    return session;
  }

  // Message operations
  async getMessage(id: number): Promise<Message | undefined> {
    const [message] = await db.select().from(messages).where(eq(messages.id, id));
    return message || undefined;
  }

  async getMessagesBySession(sessionId: number): Promise<Message[]> {
    return db.select()
      .from(messages)
      .where(eq(messages.sessionId, sessionId))
      .orderBy(asc(messages.timestamp));
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages)
      .values(insertMessage)
      .returning();
    
    return message;
  }

  async markMessagesAsRead(sessionId: number, userId: number): Promise<void> {
    await db.update(messages)
      .set({ isRead: true })
      .where(
        and(
          eq(messages.sessionId, sessionId),
          eq(messages.senderId, userId)
        )
      );
  }

  // Payment operations
  async getPayment(id: number): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.id, id));
    return payment || undefined;
  }

  async getPaymentsByUser(userId: number): Promise<Payment[]> {
    return db.select()
      .from(payments)
      .where(eq(payments.userId, userId))
      .orderBy(desc(payments.timestamp));
  }

  async getPaymentsByExpert(expertId: number): Promise<Payment[]> {
    return db.select()
      .from(payments)
      .where(eq(payments.expertId, expertId))
      .orderBy(desc(payments.timestamp));
  }

  async createPayment(insertPayment: InsertPayment): Promise<Payment> {
    // Generate a transaction ID if not provided
    if (!insertPayment.transactionId) {
      insertPayment.transactionId = `txn_${crypto.randomBytes(8).toString('hex')}`;
    }

    const [payment] = await db.insert(payments)
      .values(insertPayment)
      .returning();
    
    return payment;
  }

  // Booking operations
  async getBooking(id: number): Promise<Booking | undefined> {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
    return booking || undefined;
  }

  async getBookingsByUser(userId: number): Promise<Booking[]> {
    return db.select()
      .from(bookings)
      .where(eq(bookings.userId, userId))
      .orderBy(desc(bookings.sessionTime));
  }

  async getBookingsByExpert(expertId: number): Promise<Booking[]> {
    return db.select()
      .from(bookings)
      .where(eq(bookings.expertId, expertId))
      .orderBy(desc(bookings.sessionTime));
  }

  async createBooking(insertBooking: InsertBooking): Promise<Booking> {
    const [booking] = await db.insert(bookings)
      .values(insertBooking)
      .returning();
    
    return booking;
  }

  async updateBookingStatus(id: number, status: "booked" | "completed" | "canceled"): Promise<Booking | undefined> {
    const [booking] = await db.update(bookings)
      .set({ status, updatedAt: new Date() })
      .where(eq(bookings.id, id))
      .returning();
    
    return booking || undefined;
  }

  // Inspiration operations
  async getRandomInspiration(): Promise<Inspiration | undefined> {
    // Get a random active inspiration
    const inspirationsList = await db.select()
      .from(inspirations)
      .where(eq(inspirations.isActive, true));
    
    if (inspirationsList.length === 0) return undefined;
    
    const randomIndex = Math.floor(Math.random() * inspirationsList.length);
    return inspirationsList[randomIndex];
  }

  async getInspirationsByCategory(categoryId: number): Promise<Inspiration[]> {
    return db.select()
      .from(inspirations)
      .where(
        and(
          eq(inspirations.categoryId, categoryId),
          eq(inspirations.isActive, true)
        )
      );
  }

  async createInspiration(insertInspiration: InsertInspiration): Promise<Inspiration> {
    const [inspiration] = await db.insert(inspirations)
      .values(insertInspiration)
      .returning();
    
    return inspiration;
  }

  // For compatibility with existing code (chats methods)
  async getChat(id: number): Promise<any> {
    const session = await this.getSession(id);
    if (!session) return undefined;
    
    // Convert session to chat format for compatibility
    return {
      id: session.id,
      userId: session.userId,
      expertId: session.expertId,
      lastMessageTime: session.startTime
    };
  }

  async getChatByUserAndExpert(userId: number, expertId: number): Promise<any> {
    const session = await this.getSessionByUserAndExpert(userId, expertId);
    if (!session) return undefined;
    
    // Convert session to chat format for compatibility
    return {
      id: session.id,
      userId: session.userId,
      expertId: session.expertId,
      lastMessageTime: session.startTime
    };
  }

  async getChatsByUser(userId: number): Promise<any[]> {
    const userSessions = await this.getSessionsByUser(userId);
    
    // Convert sessions to chat format for compatibility
    return userSessions.map(session => ({
      id: session.id,
      userId: session.userId,
      expertId: session.expertId,
      lastMessageTime: session.startTime
    }));
  }

  async getChatsByExpert(expertId: number): Promise<any[]> {
    const expertSessions = await this.getSessionsByExpert(expertId);
    
    // Convert sessions to chat format for compatibility
    return expertSessions.map(session => ({
      id: session.id,
      userId: session.userId,
      expertId: session.expertId,
      lastMessageTime: session.startTime
    }));
  }

  async createChat(insertChat: any): Promise<any> {
    // Convert to session format and create a new session
    const insertSession: InsertSession = {
      userId: insertChat.userId,
      expertId: insertChat.expertId,
      type: "chat", // Default to chat type
      startTime: new Date()
    };
    
    const session = await this.createSession(insertSession);
    
    // Convert back to chat format for compatibility
    return {
      id: session.id,
      userId: session.userId,
      expertId: session.expertId,
      lastMessageTime: session.startTime
    };
  }

  async getMessagesByChat(chatId: number): Promise<Message[]> {
    // Get messages by session ID (using chatId as sessionId)
    return this.getMessagesBySession(chatId);
  }

  // Feedback operations
  async getFeedback(id: number): Promise<Feedback | undefined> {
    const [feedbackItem] = await db.select().from(feedback).where(eq(feedback.id, id));
    return feedbackItem || undefined;
  }

  async getFeedbacksByUser(userId: number): Promise<Feedback[]> {
    return db.select()
      .from(feedback)
      .where(eq(feedback.userId, userId))
      .orderBy(desc(feedback.createdAt));
  }

  async getFeedbacksByExpert(expertId: number): Promise<Feedback[]> {
    return db.select()
      .from(feedback)
      .where(eq(feedback.expertId, expertId))
      .orderBy(desc(feedback.createdAt));
  }

  async getFeedbacksBySession(sessionId: number): Promise<Feedback[]> {
    return db.select()
      .from(feedback)
      .where(eq(feedback.sessionId, sessionId))
      .orderBy(desc(feedback.createdAt));
  }

  async createFeedback(insertFeedback: InsertFeedback): Promise<Feedback> {
    const [feedbackItem] = await db.insert(feedback)
      .values(insertFeedback)
      .returning();
    
    return feedbackItem;
  }

  async getAverageRatingForExpert(expertId: number): Promise<number> {
    const results = await db.select({
      averageRating: sql`COALESCE(AVG(${feedback.rating})::numeric(10,1), 0)`
    })
    .from(feedback)
    .where(eq(feedback.expertId, expertId));
    
    return Number(results[0]?.averageRating || 0);
  }
}