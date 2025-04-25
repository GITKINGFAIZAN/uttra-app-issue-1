import { 
  users, categories, experts, advices, sessions, messages, payments, bookings, inspirations, feedback,
  type User, type InsertUser, 
  type Expert, type InsertExpert,
  type Category, type InsertCategory,
  type Advice, type InsertAdvice,
  type Session, type InsertSession,
  type Message, type InsertMessage,
  type Payment, type InsertPayment,
  type Booking, type InsertBooking,
  type Inspiration, type InsertInspiration,
  type Feedback, type InsertFeedback
} from "@shared/schema";
import { DatabaseStorage } from './database-storage';

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Expert operations
  getExpert(id: number): Promise<Expert | undefined>;
  getExpertByUserId(userId: number): Promise<Expert | undefined>;
  createExpert(expert: InsertExpert): Promise<Expert>;
  updateExpertAvailability(id: number, availability: boolean): Promise<Expert | undefined>;
  getAllExperts(): Promise<Expert[]>;
  getExpertsByCategory(categoryId: number): Promise<Expert[]>;
  
  // Category operations
  getCategory(id: number): Promise<Category | undefined>;
  getAllCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;
  
  // Advice operations
  getAdvice(id: number): Promise<Advice | undefined>;
  getAllAdvices(): Promise<Advice[]>;
  getAdvicesByExpert(expertId: number): Promise<Advice[]>;
  getAdvicesByCategory(categoryId: number): Promise<Advice[]>;
  createAdvice(advice: InsertAdvice): Promise<Advice>;
  
  // Session operations (replaces chat operations)
  getSession(id: number): Promise<Session | undefined>;
  getSessionByUserAndExpert(userId: number, expertId: number): Promise<Session | undefined>;
  getSessionsByUser(userId: number): Promise<Session[]>;
  getSessionsByExpert(expertId: number): Promise<Session[]>;
  createSession(session: InsertSession): Promise<Session>;
  
  // For backward compatibility with chat-based code
  getChat(id: number): Promise<any | undefined>;
  getChatByUserAndExpert(userId: number, expertId: number): Promise<any | undefined>;
  getChatsByUser(userId: number): Promise<any[]>;
  getChatsByExpert(expertId: number): Promise<any[]>;
  createChat(chat: any): Promise<any>;
  
  // Message operations
  getMessage(id: number): Promise<Message | undefined>;
  getMessagesByChat(chatId: number): Promise<Message[]>;
  getMessagesBySession(sessionId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  markMessagesAsRead(sessionId: number, userId: number): Promise<void>;
  
  // Payment operations
  getPayment(id: number): Promise<Payment | undefined>;
  getPaymentsByUser(userId: number): Promise<Payment[]>;
  getPaymentsByExpert(expertId: number): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  
  // Booking operations
  getBooking(id: number): Promise<Booking | undefined>;
  getBookingsByUser(userId: number): Promise<Booking[]>;
  getBookingsByExpert(expertId: number): Promise<Booking[]>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBookingStatus(id: number, status: "booked" | "completed" | "canceled"): Promise<Booking | undefined>;
  
  // Inspiration operations
  getRandomInspiration(): Promise<Inspiration | undefined>;
  getInspirationsByCategory(categoryId: number): Promise<Inspiration[]>;
  createInspiration(inspiration: InsertInspiration): Promise<Inspiration>;
  
  // Feedback operations
  getFeedback(id: number): Promise<Feedback | undefined>;
  getFeedbacksByUser(userId: number): Promise<Feedback[]>;
  getFeedbacksByExpert(expertId: number): Promise<Feedback[]>;
  getFeedbacksBySession(sessionId: number): Promise<Feedback[]>;
  createFeedback(feedback: InsertFeedback): Promise<Feedback>;
  getAverageRatingForExpert(expertId: number): Promise<number>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private experts: Map<number, Expert>;
  private categories: Map<number, Category>;
  private advices: Map<number, Advice>;
  private chats: Map<number, Chat>;
  private messages: Map<number, Message>;
  private payments: Map<number, Payment>;
  
  currentUserId: number;
  currentExpertId: number;
  currentCategoryId: number;
  currentAdviceId: number;
  currentChatId: number;
  currentMessageId: number;
  currentPaymentId: number;

  constructor() {
    this.users = new Map();
    this.experts = new Map();
    this.categories = new Map();
    this.advices = new Map();
    this.chats = new Map();
    this.messages = new Map();
    this.payments = new Map();
    
    this.currentUserId = 1;
    this.currentExpertId = 1;
    this.currentCategoryId = 1;
    this.currentAdviceId = 1;
    this.currentChatId = 1;
    this.currentMessageId = 1;
    this.currentPaymentId = 1;
    
    // Initialize with sample data
    this.initializeSampleData();
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Expert operations
  async getExpert(id: number): Promise<Expert | undefined> {
    return this.experts.get(id);
  }
  
  async getExpertByUserId(userId: number): Promise<Expert | undefined> {
    return Array.from(this.experts.values()).find(
      (expert) => expert.userId === userId,
    );
  }
  
  async createExpert(insertExpert: InsertExpert): Promise<Expert> {
    const id = this.currentExpertId++;
    const expert: Expert = { ...insertExpert, id };
    this.experts.set(id, expert);
    return expert;
  }
  
  async updateExpertAvailability(id: number, availability: boolean): Promise<Expert | undefined> {
    const expert = this.experts.get(id);
    if (!expert) return undefined;
    
    const updatedExpert = { ...expert, availability };
    this.experts.set(id, updatedExpert);
    return updatedExpert;
  }
  
  async getAllExperts(): Promise<Expert[]> {
    return Array.from(this.experts.values());
  }
  
  async getExpertsByCategory(categoryId: number): Promise<Expert[]> {
    const advicesInCategory = await this.getAdvicesByCategory(categoryId);
    const expertIds = [...new Set(advicesInCategory.map(advice => advice.expertId))];
    
    return expertIds.reduce<Expert[]>((experts, expertId) => {
      const expert = this.experts.get(expertId);
      if (expert) experts.push(expert);
      return experts;
    }, []);
  }
  
  // Category operations
  async getCategory(id: number): Promise<Category | undefined> {
    return this.categories.get(id);
  }
  
  async getAllCategories(): Promise<Category[]> {
    return Array.from(this.categories.values());
  }
  
  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const id = this.currentCategoryId++;
    const category: Category = { ...insertCategory, id };
    this.categories.set(id, category);
    return category;
  }
  
  // Advice operations
  async getAdvice(id: number): Promise<Advice | undefined> {
    return this.advices.get(id);
  }
  
  async getAllAdvices(): Promise<Advice[]> {
    return Array.from(this.advices.values());
  }
  
  async getAdvicesByExpert(expertId: number): Promise<Advice[]> {
    return Array.from(this.advices.values()).filter(
      (advice) => advice.expertId === expertId,
    );
  }
  
  async getAdvicesByCategory(categoryId: number): Promise<Advice[]> {
    return Array.from(this.advices.values()).filter(
      (advice) => advice.categoryId === categoryId,
    );
  }
  
  async createAdvice(insertAdvice: InsertAdvice): Promise<Advice> {
    const id = this.currentAdviceId++;
    const advice: Advice = { ...insertAdvice, id };
    this.advices.set(id, advice);
    return advice;
  }
  
  // Chat operations
  async getChat(id: number): Promise<Chat | undefined> {
    return this.chats.get(id);
  }
  
  async getChatByUserAndExpert(userId: number, expertId: number): Promise<Chat | undefined> {
    return Array.from(this.chats.values()).find(
      (chat) => chat.userId === userId && chat.expertId === expertId,
    );
  }
  
  async getChatsByUser(userId: number): Promise<Chat[]> {
    return Array.from(this.chats.values()).filter(
      (chat) => chat.userId === userId,
    );
  }
  
  async getChatsByExpert(expertId: number): Promise<Chat[]> {
    return Array.from(this.chats.values()).filter(
      (chat) => chat.expertId === expertId,
    );
  }
  
  async createChat(insertChat: InsertChat): Promise<Chat> {
    const id = this.currentChatId++;
    const chat: Chat = { ...insertChat, id };
    this.chats.set(id, chat);
    return chat;
  }
  
  // Message operations
  async getMessage(id: number): Promise<Message | undefined> {
    return this.messages.get(id);
  }
  
  async getMessagesByChat(chatId: number): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter((message) => message.chatId === chatId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }
  
  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = this.currentMessageId++;
    const message: Message = { ...insertMessage, id };
    this.messages.set(id, message);
    
    // Update last message in chat
    const chat = this.chats.get(message.chatId);
    if (chat) {
      const updatedChat = { 
        ...chat, 
        lastMessage: message.content, 
        lastMessageTime: message.timestamp 
      };
      this.chats.set(chat.id, updatedChat);
    }
    
    return message;
  }
  
  async markMessagesAsRead(chatId: number, userId: number): Promise<void> {
    const chatMessages = await this.getMessagesByChat(chatId);
    
    chatMessages.forEach(message => {
      if (message.senderId !== userId && !message.isRead) {
        const updatedMessage = { ...message, isRead: true };
        this.messages.set(message.id, updatedMessage);
      }
    });
  }
  
  // Payment operations
  async getPayment(id: number): Promise<Payment | undefined> {
    return this.payments.get(id);
  }
  
  async getPaymentsByUser(userId: number): Promise<Payment[]> {
    return Array.from(this.payments.values()).filter(
      (payment) => payment.userId === userId,
    );
  }
  
  async getPaymentsByExpert(expertId: number): Promise<Payment[]> {
    return Array.from(this.payments.values()).filter(
      (payment) => payment.expertId === expertId,
    );
  }
  
  async createPayment(insertPayment: InsertPayment): Promise<Payment> {
    const id = this.currentPaymentId++;
    const payment: Payment = { ...insertPayment, id };
    this.payments.set(id, payment);
    return payment;
  }
  
  // Initialize sample data
  private initializeSampleData() {
    // Create sample categories
    const categories: InsertCategory[] = [
      { 
        name: "Life Advice", 
        description: "Get guidance on personal life decisions and challenges", 
        icon: "heart" 
      },
      { 
        name: "Career Guidance", 
        description: "Professional advice for career growth and decisions", 
        icon: "briefcase" 
      },
      { 
        name: "Family Matters", 
        description: "Advice on family relationships and parenting", 
        icon: "users" 
      },
      { 
        name: "Health & Wellness", 
        description: "Guidance for physical and mental wellbeing", 
        icon: "activity" 
      },
      { 
        name: "Financial Planning", 
        description: "Expert advice on managing your finances", 
        icon: "dollar-sign" 
      },
      { 
        name: "Spiritual Guidance", 
        description: "Find your path with spiritual and philosophical advice", 
        icon: "compass" 
      }
    ];
    
    categories.forEach(async (category) => {
      await this.createCategory(category);
    });
    
    // Create sample users (including experts)
    const users: InsertUser[] = [
      {
        username: "user1",
        password: "password123",
        name: "Rahul Singh",
        email: "rahul@example.com",
        avatar: "https://randomuser.me/api/portraits/men/32.jpg",
        isExpert: false
      },
      {
        username: "priyanka_expert",
        password: "password123",
        name: "Priyanka Sharma",
        email: "priyanka@example.com",
        avatar: "https://randomuser.me/api/portraits/women/44.jpg",
        isExpert: true
      },
      {
        username: "amit_expert",
        password: "password123",
        name: "Amit Patel",
        email: "amit@example.com",
        avatar: "https://randomuser.me/api/portraits/men/62.jpg",
        isExpert: true
      },
      {
        username: "ananya_expert",
        password: "password123",
        name: "Ananya Desai",
        email: "ananya@example.com",
        avatar: "https://randomuser.me/api/portraits/women/65.jpg",
        isExpert: true
      },
      {
        username: "vikram_expert",
        password: "password123",
        name: "Vikram Reddy",
        email: "vikram@example.com",
        avatar: "https://randomuser.me/api/portraits/men/45.jpg",
        isExpert: true
      }
    ];
    
    // Create users and experts
    users.forEach(async (userData) => {
      const isExpert = userData.isExpert;
      const user = await this.createUser(userData);
      
      if (isExpert) {
        const expertData: InsertExpert = {
          userId: user.id,
          bio: `Experienced advisor with over 8 years helping people find their path.`,
          specialization: "Life Coaching",
          experience: 8,
          rating: 4,
          hourlyRate: 1000,
          availability: true,
          languages: ["English", "Hindi"]
        };
        
        // Customize expert details
        if (user.username === "priyanka_expert") {
          expertData.specialization = "Life Advice & Family Counseling";
          expertData.experience = 10;
          expertData.rating = 5;
        } else if (user.username === "amit_expert") {
          expertData.specialization = "Career & Financial Planning";
          expertData.experience = 12;
          expertData.hourlyRate = 1500;
        } else if (user.username === "ananya_expert") {
          expertData.specialization = "Spiritual & Wellness Guidance";
          expertData.experience = 7;
        } else if (user.username === "vikram_expert") {
          expertData.specialization = "Career Development";
          expertData.experience = 15;
          expertData.hourlyRate = 2000;
          expertData.rating = 5;
        }
        
        await this.createExpert(expertData);
      }
    });
    
    // Create sample advice entries for each category
    setTimeout(async () => {
      // Get the experts and categories we've created
      const expertsList = Array.from(this.experts.values());
      const categoriesList = Array.from(this.categories.values());
      
      // Life Advice (Category 1)
      const lifeAdviceCategory = categoriesList.find(cat => cat.name === "Life Advice");
      const priyankaExpert = expertsList.find(exp => exp.userId === 2); // Priyanka
      
      if (lifeAdviceCategory && priyankaExpert) {
        await this.createAdvice({
          title: "Finding Balance in Daily Life",
          description: "Focus on creating structured routines and dedicated time for self-care. Try the 5-minute meditation technique each morning to center yourself.",
          expertId: priyankaExpert.id,
          categoryId: lifeAdviceCategory.id,
          rating: 5
        });
        
        await this.createAdvice({
          title: "Dealing with Difficult Decisions",
          description: "When facing difficult choices, use the 'pros and cons' method but add a column for your emotional response to each outcome. Your feelings matter as much as logical factors.",
          expertId: priyankaExpert.id,
          categoryId: lifeAdviceCategory.id,
          rating: 4
        });
      }
      
      // Career Guidance (Category 2)
      const careerCategory = categoriesList.find(cat => cat.name === "Career Guidance");
      const vikramExpert = expertsList.find(exp => exp.userId === 5); // Vikram
      
      if (careerCategory && vikramExpert) {
        await this.createAdvice({
          title: "Transitioning to a New Career",
          description: "Start with skills assessment first. Identify transferable skills from your current role, then build a transition plan with achievable milestones over 6-12 months.",
          expertId: vikramExpert.id,
          categoryId: careerCategory.id,
          rating: 5
        });
        
        await this.createAdvice({
          title: "Negotiating Salary Effectively",
          description: "Research industry standards thoroughly before negotiations. Present your value with specific achievements and be ready with a minimum acceptable figure plus ideal compensation package.",
          expertId: vikramExpert.id,
          categoryId: careerCategory.id,
          rating: 5
        });
      }
      
      // Financial Planning (Category 5)
      const financialCategory = categoriesList.find(cat => cat.name === "Financial Planning");
      const amitExpert = expertsList.find(exp => exp.userId === 3); // Amit
      
      if (financialCategory && amitExpert) {
        await this.createAdvice({
          title: "Starting Your Investment Journey",
          description: "Begin with building an emergency fund of 6 months' expenses. Then allocate investments across fixed deposits, mutual funds, and stocks based on your risk profile and financial goals.",
          expertId: amitExpert.id,
          categoryId: financialCategory.id,
          rating: 4
        });
        
        await this.createAdvice({
          title: "Planning for Early Retirement",
          description: "Calculate your retirement corpus based on 25-30 times your annual expenses. Create multiple income streams with dividends, rental income, and systematic withdrawal plans.",
          expertId: amitExpert.id,
          categoryId: financialCategory.id,
          rating: 5
        });
      }
      
      // Spiritual Guidance (Category 6)
      const spiritualCategory = categoriesList.find(cat => cat.name === "Spiritual Guidance");
      const ananyaExpert = expertsList.find(exp => exp.userId === 4); // Ananya
      
      if (spiritualCategory && ananyaExpert) {
        await this.createAdvice({
          title: "Finding Inner Peace",
          description: "Practice mindfulness daily by focusing on your breath for just 10 minutes. Try walking meditation where you concentrate on each step, becoming fully present in the moment.",
          expertId: ananyaExpert.id,
          categoryId: spiritualCategory.id,
          rating: 5
        });
        
        await this.createAdvice({
          title: "Connecting with Your Purpose",
          description: "Write your own eulogy as if you lived your ideal life. What would you want people to say about your contributions and character? This reveals your deepest values and direction.",
          expertId: ananyaExpert.id,
          categoryId: spiritualCategory.id,
          rating: 4
        });
      }
      
      // Family Matters (Category 3)
      const familyCategory = categoriesList.find(cat => cat.name === "Family Matters");
      if (familyCategory && priyankaExpert) {
        await this.createAdvice({
          title: "Improving Communication with Teenagers",
          description: "Create regular 'no-tech' time where phones are put away. Ask open-ended questions about their interests rather than their day, and practice active listening without judgment.",
          expertId: priyankaExpert.id,
          categoryId: familyCategory.id,
          rating: 5
        });
        
        await this.createAdvice({
          title: "Navigating Family Conflicts",
          description: "Use the 'speaker-listener' technique where one person speaks without interruption while others listen, then roles reverse. Focus on 'I feel' statements rather than accusations.",
          expertId: priyankaExpert.id,
          categoryId: familyCategory.id,
          rating: 4
        });
      }
      
      // Health & Wellness (Category 4)
      const healthCategory = categoriesList.find(cat => cat.name === "Health & Wellness");
      if (healthCategory && ananyaExpert) {
        await this.createAdvice({
          title: "Creating Sustainable Fitness Habits",
          description: "Start with just 5 minutes of exercise daily, focusing on consistency over intensity. Add active habits to existing routines, like squats while brushing teeth or walking during phone calls.",
          expertId: ananyaExpert.id,
          categoryId: healthCategory.id,
          rating: 4
        });
        
        await this.createAdvice({
          title: "Managing Stress Naturally",
          description: "Try 4-7-8 breathing: inhale for 4 counts, hold for 7, exhale for 8. Practice progressive muscle relaxation before bed, tensing and releasing each muscle group from toes to head.",
          expertId: ananyaExpert.id,
          categoryId: healthCategory.id,
          rating: 5
        });
      }
    }, 500); // Small delay to ensure categories and experts are created first
  }
}

// Use DatabaseStorage implementation instead of MemStorage
export const storage = new DatabaseStorage();
