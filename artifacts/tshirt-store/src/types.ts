export type Page = 'workshop' | 'gallery' | 'dashboard' | 'orders' | 'admin' | 'login';

export interface UserProfile {
  uid: string;
  name: string;
  avatar: string;
  email: string;
  tokens: number;
  accumulatedDiscount: number;
  totalSales: number;
  points: number;
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

export interface GalleryOrder {
  id: string;
  artworkUrl: string | null;
  style: string;
  uid: string | null;
  customerEmail: string;
  status: string;
  shareInGallery: boolean;
  createdAt: string;
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
