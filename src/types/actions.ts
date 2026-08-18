/**
 * Standardisation des types de réponse pour les Server Actions — SBC App
 */

export interface ActionResponse<T = void> {
  success: boolean;
  data?: T;
  error: string | null;
  message?: string;
}

export interface PaginatedActionResponse<T> {
  success: boolean;
  data: T[];
  totalCount: number;
  error: string | null;
}
