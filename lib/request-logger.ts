import { NextRequest, NextResponse } from 'next/server';
import { logRequest, logPerformance, logError } from './logger';
import { recordRequest } from './metrics';

type RouteHandler = (
  request: NextRequest,
  context?: { params: Record<string, string> }
) => Promise<NextResponse>;

interface RequestLoggingOptions {
  logBody?: boolean;
  logHeaders?: boolean;
  sensitiveFields?: string[];
}

/**
 * Higher-order function to wrap API routes with logging
 */
export function withRequestLogging(
  handler: RouteHandler,
  options: RequestLoggingOptions = {}
): RouteHandler {
  return async (request: NextRequest, context?: { params: Record<string, string> }) => {
    const startTime = Date.now();
    const requestId = crypto.randomUUID();
    const method = request.method;
    const path = request.nextUrl.pathname;
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               'unknown';

    // Log request start
    const requestContext: Record<string, unknown> = {
      requestId,
      ip,
      userAgent,
      query: Object.fromEntries(request.nextUrl.searchParams),
    };

    // Optionally log headers (excluding sensitive ones)
    if (options.logHeaders) {
      const headers: Record<string, string> = {};
      const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
      request.headers.forEach((value, key) => {
        if (!sensitiveHeaders.includes(key.toLowerCase())) {
          headers[key] = value;
        }
      });
      requestContext.headers = headers;
    }

    try {
      const response = await handler(request, context);
      const duration = Date.now() - startTime;
      const statusCode = response.status;

      // Log the request
      logRequest(method, path, statusCode, duration, requestContext);

      // Log performance metrics
      logPerformance({
        route: path,
        method,
        statusCode,
        responseTime: duration,
        ip,
        userAgent,
      });

      // Record metrics
      recordRequest(duration, statusCode >= 200 && statusCode < 400);

      // Add request ID to response headers
      const newHeaders = new Headers(response.headers);
      newHeaders.set('x-request-id', requestId);

      return new NextResponse(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logError(error instanceof Error ? error : new Error(String(error)), {
        requestId,
        method,
        path,
        duration,
        ...requestContext,
      });

      // Record failed request
      recordRequest(duration, false);

      // Return error response
      return NextResponse.json(
        { 
          error: 'Internal Server Error',
          requestId,
        },
        { 
          status: 500,
          headers: { 'x-request-id': requestId },
        }
      );
    }
  };
}

/**
 * Sanitize request body by removing sensitive fields
 */
export function sanitizeBody(
  body: Record<string, unknown>,
  sensitiveFields: string[] = ['password', 'token', 'secret', 'apiKey', 'creditCard']
): Record<string, unknown> {
  const sanitized = { ...body };
  
  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  // Recursively sanitize nested objects
  for (const [key, value] of Object.entries(sanitized)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizeBody(value as Record<string, unknown>, sensitiveFields);
    }
  }
  
  return sanitized;
}

/**
 * Extract user info from request for logging
 */
export function extractUserInfo(request: NextRequest): { userId?: string; email?: string } {
  // Try to get user info from auth header or cookie
  const authHeader = request.headers.get('authorization');
  const userIdHeader = request.headers.get('x-user-id');
  
  return {
    userId: userIdHeader || undefined,
  };
}
