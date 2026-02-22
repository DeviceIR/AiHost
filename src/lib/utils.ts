import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function truncate(value: string, length = 48) {
  if (value.length <= length) {
    return value;
  }
  return `${value.slice(0, length)}...`;
}
