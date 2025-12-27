'use client';

import dynamic from 'next/dynamic';
import 'swagger-ui-react/swagger-ui.css';

const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false });

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto">
        <div className="py-4 px-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            API Documentation
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Interactive API documentation for the Pop Culture News App.
          </p>
        </div>
        <SwaggerUI 
          url="/api/docs" 
          docExpansion="list"
          defaultModelsExpandDepth={-1}
          persistAuthorization={true}
        />
      </div>
    </div>
  );
}
