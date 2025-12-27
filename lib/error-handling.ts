import { NextResponse } from 'next/server';

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
  console.error(`API Error${context ? ` in ${context}` : ''}:`, error);

  if (error instanceof Error) {
    // Handle specific error types
    if (error.name === 'ValidationError') {
      return createErrorResponse('Invalid input data', 400);
    }

    if (error.name === 'UnauthorizedError') {
      return createErrorResponse('Authentication required', 401);
    }

    if (error.name === 'ForbiddenError') {
      return createErrorResponse('Access denied', 403);
    }

    if (error.name === 'NotFoundError') {
      return createErrorResponse('Resource not found', 404);
    }

    if (error.message.includes('Unique constraint')) {
      return createErrorResponse('Resource already exists', 409);
    }

    if (error.message.includes('Foreign key constraint')) {
      return createErrorResponse('Invalid reference', 400);
    }

    // Generic server error
    return createErrorResponse('Internal server error', 500);
  }

  // Unknown error type
  return createErrorResponse('An unexpected error occurred', 500);
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