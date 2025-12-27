import { NextResponse } from 'next/server';
import { logError, logger } from './logger';

// Custom error classes for better error handling
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
    public isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public details?: Record<string, string[]>) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists') {
    super(message, 409, 'CONFLICT');
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

export interface ApiError {
  message: string;
  code?: string;
  details?: any;
}

export function createErrorResponse(
  error: string | Error | ApiError,
  status: number = 500,
  headers?: Record<string, string>
): NextResponse {
  let errorMessage: string;
  let errorCode: string | undefined;
  let errorDetails: any;

  if (typeof error === 'string') {
    errorMessage = error;
  } else if (error instanceof Error) {
    errorMessage = error.message;
    errorCode = error.name;
    errorDetails = process.env.NODE_ENV === 'development' ? error.stack : undefined;
  } else {
    errorMessage = error.message;
    errorCode = error.code;
    errorDetails = error.details;
  }

  const response = {
    error: {
      message: errorMessage,
      code: errorCode,
      ...(errorDetails && { details: errorDetails }),
      timestamp: new Date().toISOString()
    }
  };

  return NextResponse.json(response, { status, headers });
}

export function handleApiError(error: unknown, context?: string): NextResponse {
  const requestId = crypto.randomUUID();
  
  // Log error with context
  if (error instanceof Error) {
    logError(error, { context, requestId });
  } else {
    logger.error('Unknown error type', { error: String(error), context, requestId });
  }

  // Handle custom AppError classes
  if (error instanceof AppError) {
    return createErrorResponse(
      { message: error.message, code: error.code },
      error.statusCode,
      { 'x-request-id': requestId }
    );
  }

  if (error instanceof Error) {
    // Handle specific error types
    if (error.name === 'ValidationError' || error.name === 'ZodError') {
      return createErrorResponse('Invalid input data', 400, { 'x-request-id': requestId });
    }

    if (error.name === 'UnauthorizedError') {
      return createErrorResponse('Authentication required', 401, { 'x-request-id': requestId });
    }

    if (error.name === 'ForbiddenError') {
      return createErrorResponse('Access denied', 403, { 'x-request-id': requestId });
    }

    if (error.name === 'NotFoundError') {
      return createErrorResponse('Resource not found', 404, { 'x-request-id': requestId });
    }

    if (error.message.includes('Unique constraint')) {
      return createErrorResponse('Resource already exists', 409, { 'x-request-id': requestId });
    }

    if (error.message.includes('Foreign key constraint')) {
      return createErrorResponse('Invalid reference', 400, { 'x-request-id': requestId });
    }

    // Prisma errors
    if (error.name === 'PrismaClientKnownRequestError') {
      return createErrorResponse('Database error', 500, { 'x-request-id': requestId });
    }

    // Generic server error
    return createErrorResponse('Internal server error', 500, { 'x-request-id': requestId });
  }

  // Unknown error type
  return createErrorResponse('An unexpected error occurred', 500, { 'x-request-id': requestId });
}

// Wrapper for API route handlers
export function withErrorHandler(
  handler: (request: Request, ...args: any[]) => Promise<NextResponse>
) {
  return async (request: Request, ...args: any[]): Promise<NextResponse> => {
    try {
      return await handler(request, ...args);
    } catch (error) {
      return handleApiError(error, handler.name);
    }
  };
}

// Utility for consistent error boundaries
export function isOperationalError(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}

// Parse error for client consumption (strips sensitive info)
export function sanitizeErrorForClient(error: unknown): { message: string; code?: string } {
  if (error instanceof AppError) {
    return { message: error.message, code: error.code };
  }
  if (error instanceof Error) {
    // Don't leak internal error messages in production
    if (process.env.NODE_ENV === 'production') {
      return { message: 'An error occurred' };
    }
    return { message: error.message };
  }
  return { message: 'An unexpected error occurred' };
}