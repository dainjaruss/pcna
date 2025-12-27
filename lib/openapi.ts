/**
 * OpenAPI Specification for Pop Culture News App
 * This file defines the API documentation for the application
 */

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Pop Culture News App API',
    description: `
      API for the Pop Culture News aggregation and recommendation platform.
      
      ## Features
      - Article aggregation from multiple sources
      - AI-powered recommendations based on user preferences
      - User ratings and interactions
      - Source management with credibility scoring
      - Email digest functionality
      
      ## Authentication
      Most endpoints require authentication via JWT tokens.
      Use the /api/auth/login endpoint to obtain tokens.
    `,
    version: '1.0.0',
    contact: {
      name: 'API Support',
      email: 'support@example.com',
    },
  },
  servers: [
    {
      url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      description: 'Current server',
    },
  ],
  tags: [
    { name: 'Articles', description: 'Article management endpoints' },
    { name: 'Authentication', description: 'User authentication endpoints' },
    { name: 'Sources', description: 'News source management' },
    { name: 'Ratings', description: 'User ratings and interactions' },
    { name: 'Settings', description: 'User settings and preferences' },
    { name: 'System', description: 'System health and monitoring' },
  ],
  paths: {
    '/api/articles': {
      get: {
        tags: ['Articles'],
        summary: 'Get articles',
        description: 'Retrieve a paginated list of articles with optional filtering and recommendations',
        parameters: [
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', default: 1 },
            description: 'Page number for pagination',
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', default: 20, maximum: 100 },
            description: 'Number of articles per page',
          },
          {
            name: 'cursor',
            in: 'query',
            schema: { type: 'string' },
            description: 'Cursor for cursor-based pagination',
          },
          {
            name: 'recommended',
            in: 'query',
            schema: { type: 'boolean', default: false },
            description: 'Enable AI-powered recommendations',
          },
          {
            name: 'source',
            in: 'query',
            schema: { type: 'string' },
            description: 'Filter by source ID',
          },
          {
            name: 'celebrity',
            in: 'query',
            schema: { type: 'string' },
            description: 'Filter by celebrity name',
          },
        ],
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    articles: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Article' },
                    },
                    pagination: { $ref: '#/components/schemas/Pagination' },
                  },
                },
              },
            },
          },
          '429': { description: 'Rate limit exceeded' },
          '500': { description: 'Internal server error' },
        },
      },
      post: {
        tags: ['Articles'],
        summary: 'Create article',
        description: 'Save a web search result to the database',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ArticleCreate' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Article created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Article' },
              },
            },
          },
          '400': { description: 'Invalid input' },
          '409': { description: 'Article already exists' },
        },
      },
    },
    '/api/articles/{id}': {
      get: {
        tags: ['Articles'],
        summary: 'Get article by ID',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Article' },
              },
            },
          },
          '404': { description: 'Article not found' },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'User login',
        description: 'Authenticate user and receive access tokens',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    user: { $ref: '#/components/schemas/User' },
                  },
                },
              },
            },
          },
          '401': { description: 'Invalid credentials' },
          '429': { description: 'Too many login attempts' },
        },
      },
    },
    '/api/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'User registration',
        description: 'Create a new user account',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'name'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 },
                  name: { type: 'string', minLength: 2 },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Registration successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    user: { $ref: '#/components/schemas/User' },
                  },
                },
              },
            },
          },
          '400': { description: 'Invalid input' },
          '409': { description: 'Email already exists' },
        },
      },
    },
    '/api/ratings': {
      post: {
        tags: ['Ratings'],
        summary: 'Rate an article',
        description: 'Submit a user rating for an article',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['articleId', 'rating'],
                properties: {
                  articleId: { type: 'string' },
                  rating: { type: 'integer', minimum: 1, maximum: 5 },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Rating saved' },
          '401': { description: 'Authentication required' },
        },
      },
    },
    '/api/sources': {
      get: {
        tags: ['Sources'],
        summary: 'Get news sources',
        description: 'Retrieve list of available news sources',
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Source' },
                },
              },
            },
          },
        },
      },
    },
    '/api/health': {
      get: {
        tags: ['System'],
        summary: 'Health check',
        description: 'Check system health status including database and cache connectivity',
        responses: {
          '200': {
            description: 'System healthy',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthStatus' },
              },
            },
          },
          '503': { description: 'System degraded' },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      Article: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          summary: { type: 'string' },
          content: { type: 'string' },
          url: { type: 'string', format: 'uri' },
          imageUrl: { type: 'string', format: 'uri', nullable: true },
          credibilityRating: { type: 'number', minimum: 0, maximum: 10 },
          publishDate: { type: 'string', format: 'date-time' },
          categories: { type: 'array', items: { type: 'string' } },
          celebrities: { type: 'array', items: { type: 'string' } },
          source: { $ref: '#/components/schemas/Source' },
          userRatings: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                rating: { type: 'integer' },
                createdAt: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
      },
      ArticleCreate: {
        type: 'object',
        required: ['title', 'url'],
        properties: {
          title: { type: 'string' },
          summary: { type: 'string' },
          content: { type: 'string' },
          url: { type: 'string', format: 'uri' },
          publishDate: { type: 'string', format: 'date-time' },
          categories: { type: 'array', items: { type: 'string' } },
          celebrities: { type: 'array', items: { type: 'string' } },
        },
      },
      Source: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          url: { type: 'string', format: 'uri' },
          credibilityRating: { type: 'number', minimum: 0, maximum: 10 },
          credibilityReason: { type: 'string', nullable: true },
          enabled: { type: 'boolean' },
          type: { type: 'string', enum: ['rss', 'api', 'scrape'] },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          email: { type: 'string', format: 'email' },
          name: { type: 'string' },
        },
      },
      Pagination: {
        type: 'object',
        properties: {
          page: { type: 'integer' },
          limit: { type: 'integer' },
          total: { type: 'integer' },
          totalPages: { type: 'integer' },
          nextCursor: { type: 'string', nullable: true },
        },
      },
      HealthStatus: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['ok', 'degraded', 'error'] },
          db: { type: 'string', enum: ['ok', 'error'] },
          redis: { type: 'string', enum: ['ok', 'error', 'unknown'] },
          cache: {
            type: 'object',
            properties: {
              connected: { type: 'boolean' },
              keys: { type: 'integer' },
              memory: { type: 'string' },
            },
          },
          uptime: { type: 'integer' },
          timestamp: { type: 'string', format: 'date-time' },
          version: { type: 'string' },
        },
      },
    },
  },
};
