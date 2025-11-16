// backend/config/swagger.js
export const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ExportHaven API',
      version: '2.0.0',
      description: 'Professional Export/Import B2B Platform API Documentation',
      contact: {
        name: 'ExportHaven Support',
        email: 'support@exporthaven.com',
      },
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:5002',
        description: 'Development server',
      },
      {
        url: 'https://api.exporthaven.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            role: {
              type: 'string',
              enum: ['exporter', 'manufacturer', 'admin'],
            },
            companyName: { type: 'string' },
            phone: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Ad: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            category: { type: 'string' },
            type: { type: 'string', enum: ['exporter', 'manufacturer'] },
            status: {
              type: 'string',
              enum: ['pending', 'approved', 'rejected'],
            },
            minPrice: { type: 'number' },
            maxPrice: { type: 'number' },
            location: { type: 'string' },
            images: { type: 'array', items: { type: 'string' } },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Order: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            ad: { $ref: '#/components/schemas/Ad' },
            exporter: { $ref: '#/components/schemas/User' },
            manufacturer: { $ref: '#/components/schemas/User' },
            quantity: { type: 'number' },
            status: {
              type: 'string',
              enum: ['Pending', 'Approved', 'Rejected', 'Completed'],
            },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            message: { type: 'string' },
          },
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            data: { type: 'array' },
            currentPage: { type: 'number' },
            totalPages: { type: 'number' },
            total: { type: 'number' },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication endpoints',
      },
      {
        name: 'Users',
        description: 'User management endpoints',
      },
      {
        name: 'Ads',
        description: 'Advertisement management endpoints',
      },
      {
        name: 'Orders',
        description: 'Order management endpoints',
      },
      {
        name: 'Analytics',
        description: 'Analytics and reporting endpoints',
      },
      {
        name: 'Recommendations',
        description: 'AI-powered recommendation endpoints',
      },
      {
        name: 'Bulk Operations',
        description: 'Bulk administrative operations',
      },
      {
        name: 'Export',
        description: 'Data export endpoints (PDF, CSV, Excel)',
      },
      {
        name: 'Health',
        description: 'System health and monitoring endpoints',
      },
    ],
  },
  apis: ['./routes/*.js', './controllers/*.js'],
};
