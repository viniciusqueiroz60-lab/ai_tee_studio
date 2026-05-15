export type Page = 'workshop' | 'gallery' | 'dashboard' | 'login';

export interface UserProfile {
  uid: string;
  name: string;
  avatar: string;
  email: string;
  tokens: number;
  accumulatedDiscount: number;
  totalSales: number;
}

export interface Design {
  id: string;
  ownerId: string;
  parentDesignId?: string;
  title: string;
  createdAt: any;
  image: string;
  prompt: string;
  originalPrompt: string;
  style: string;
  color: string;
  sales: number;
}

export interface Foundation {
  id: string;
  name: string;
  image: string;
  stylePrompt: string;
}

export interface ColorOption {
  id: string;
  name: string;
  hex: string;
  filename: string;
}
