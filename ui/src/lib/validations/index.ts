import { z } from "zod";

// Question submission validation
export const questionSchema = z.object({
  subject: z.string(),
  question: z.string().min(10, "Question must be at least 10 characters long"),
  files: z.array(z.instanceof(File)).optional(),
});

export type QuestionFormData = z.infer<typeof questionSchema>;

// AI Chat validation
export const chatSchema = z.object({
  subject: z.number(),
  message: z.string().min(1, "Message cannot be empty"),
});

export type ChatFormData = z.infer<typeof chatSchema>;

// Blog creation validation
export const blogSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required"),
  content: z.string().min(1, "Content is required"),
  excerpt: z.string().min(1, "Excerpt is required"),
  category: z.string().min(1, "Category is required"),
  tags: z.array(z.string()).optional(),
  featuredImage: z.string().optional(),
  isFeatured: z.boolean().default(false),
  isPinned: z.boolean().default(false),
});

export type BlogFormData = z.infer<typeof blogSchema>;

// Subject creation validation
export const subjectSchema = z.object({
  name: z.string().min(1, "Subject name is required"),
  slug: z.string().min(1, "Slug is required"),
  description: z.string().min(1, "Description is required"),
  icon: z.string().optional(),
  aiPrompt: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type SubjectFormData = z.infer<typeof subjectSchema>;

// Page creation validation
export const pageSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required"),
  content: z.string().min(1, "Content is required"),
  type: z.enum(["subject", "general", "blog_hub", "blog_detail"]),
  subjectId: z.string().optional(),
  isPublished: z.boolean().default(true),
});

export type PageFormData = z.infer<typeof pageSchema>;

// Subscription validation
export const subscriptionSchema = z.object({
  name: z.string().min(1, "Subscription name is required"),
  price: z.number().min(0, "Price must be positive"),
  interval: z.enum(["month", "year"]),
  features: z.array(z.string()),
  fileUploadLimit: z.number().min(1, "File upload limit must be at least 1"),
  hasAiChat: z.boolean().default(false),
  stripeProductId: z.string().min(1, "Stripe product ID is required"),
  stripePriceId: z.string().min(1, "Stripe price ID is required"),
  isActive: z.boolean().default(true),
});

export type SubscriptionFormData = z.infer<typeof subscriptionSchema>;

// Admin settings validation
export const adminSettingsSchema = z.object({
  fileUploadLimit: z.number().min(1, "File upload limit must be at least 1"),
  allowedFileTypes: z.array(z.string()),
  maxFileSize: z.number().min(1, "Max file size must be positive"),
  siteName: z.string().min(1, "Site name is required"),
  siteDescription: z.string().min(1, "Site description is required"),
  contactEmail: z.string().email("Please enter a valid email address"),
});

export type AdminSettingsFormData = z.infer<typeof adminSettingsSchema>;