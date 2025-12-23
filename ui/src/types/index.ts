
export interface Question {
  id: string;
  userId: string;
  subject: string;
  question: string;
  files: string[];
  status: 'pending' | 'answered' | 'expert_assigned';
  response?: string;
  expertId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessage {
  id: string;
  userId: string;
  subject: string;
  message: string;
  response: string;
  createdAt: Date;
}

export interface ApiErrorResponse {
  statusCode: number;
  message: string;
  error?: string;
}