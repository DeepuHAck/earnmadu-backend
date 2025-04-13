import { Request } from 'express';
import { Document } from 'mongoose';

// Auth Types
export interface AuthRequest extends Request {
  user?: any;
}

export interface JwtPayload {
  id: string;
  role: string;
}

// Response Types
export interface ApiResponse<T = any> {
  status: 'success' | 'error';
  message?: string;
  data?: T;
  error?: any;
}

// Video Types
export interface VideoMetadata {
  id: string;
  title: string;
  description: string;
  duration: number;
  thumbnail: string;
}

// Wallet Types
export interface WalletTransaction {
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  reference?: string;
}

// Payment Types
export type PaymentMethod = 'phonePe' | 'googlePay' | 'paytm' | 'paypal' | 'bank';

export interface PaymentDetails {
  method: PaymentMethod;
  details: Record<string, string>;
}

// Admin Types
export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalVideos: number;
  totalEarnings: number;
  pendingWithdrawals: number;
  completedWithdrawals: number;
  dailyActiveUsers: number;
}

// Error Types
export class AppError extends Error {
  statusCode: number;
  status: string;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Utility Types
export type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;
export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> =
  Pick<T, Exclude<keyof T, Keys>> & {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
  }[Keys]; 