import fs from 'fs';
import path from 'path';
import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yaml';

const openApiPath = path.resolve('docs', 'openapi.yaml');
const openApiDocument = YAML.parse(fs.readFileSync(openApiPath, 'utf8'));

export const swaggerRoutes = Router();

swaggerRoutes.get('/openapi.yaml', (_req, res) => {
  res.type('application/yaml').sendFile(openApiPath);
});

swaggerRoutes.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(openApiDocument, {
    customSiteTitle: 'DriveX API Docs',
    swaggerOptions: {
      persistAuthorization: true
    }
  })
);
