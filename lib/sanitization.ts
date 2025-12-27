// Input sanitization utilities
export function sanitizeString(input: string, options: { maxLength?: number; allowHtml?: boolean } = {}): string {
  if (typeof input !== 'string') return '';

  let sanitized = input.trim();

  // Remove null bytes and other control characters
  sanitized = sanitized.replace(/[\x00-\x1F\x7F-\x9F]/g, '');

  // Limit length
  if (options.maxLength) {
    sanitized = sanitized.substring(0, options.maxLength);
  }

  // Basic HTML sanitization if not allowed
  if (!options.allowHtml) {
    sanitized = sanitized
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  return sanitized;
}

export function sanitizeEmail(email: string): string {
  return sanitizeString(email, { maxLength: 254 }).toLowerCase();
}

export function sanitizePassword(password: string): string {
  // Don't trim passwords as leading/trailing spaces might be intentional
  return password.substring(0, 128); // Reasonable max length
}

export function sanitizeSearchQuery(query: string): string {
  return sanitizeString(query, { maxLength: 200 });
}

export function sanitizeUrl(url: string): string {
  return sanitizeString(url, { maxLength: 2000 });
}

export function validateAndSanitizeArticleData(data: any) {
  const sanitized = { ...data };

  if (sanitized.title) {
    sanitized.title = sanitizeString(sanitized.title, { maxLength: 500 });
  }

  if (sanitized.summary) {
    sanitized.summary = sanitizeString(sanitized.summary, { maxLength: 2000 });
  }

  if (sanitized.content) {
    sanitized.content = sanitizeString(sanitized.content, { maxLength: 10000 });
  }

  if (sanitized.url) {
    sanitized.url = sanitizeUrl(sanitized.url);
  }

  if (sanitized.categories && Array.isArray(sanitized.categories)) {
    sanitized.categories = sanitized.categories
      .slice(0, 10) // Max 10 categories
      .map((cat: string) => sanitizeString(cat, { maxLength: 50 }));
  }

  if (sanitized.celebrities && Array.isArray(sanitized.celebrities)) {
    sanitized.celebrities = sanitized.celebrities
      .slice(0, 20) // Max 20 celebrities
      .map((celeb: string) => sanitizeString(celeb, { maxLength: 100 }));
  }

  return sanitized;
}