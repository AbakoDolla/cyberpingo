import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merges conditional class names while keeping Tailwind conflicts resolved. */
export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs));
