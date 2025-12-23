import { API_BASE } from '@/constants';
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getHTMLText(html: string): string {
  return html.replace(/<[^>]+>/g, ' ');;
}

export const getFileUrl = (key: string) => {
  return `${API_BASE}/storage/file/${key}`;
};