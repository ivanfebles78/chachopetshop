import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Une clases de Tailwind resolviendo conflictos. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export const eur = (value: number | null | undefined): string =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value ?? 0);
