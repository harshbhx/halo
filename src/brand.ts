/** The product's name and words live in one place: brand.config.json at the repo root. */
import brand from '../brand.config.json';

export const BRAND = brand as { name: string; slug: string; tagline: string; description: string; url: string };
