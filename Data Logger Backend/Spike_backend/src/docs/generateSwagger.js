import { writeFileSync } from 'fs';
import { swaggerSpec } from '../config/swagger.config.js';

const outputPath = new URL('./openapi.json', import.meta.url);
writeFileSync(outputPath, JSON.stringify(swaggerSpec, null, 2));
console.log(`OpenAPI spec written to ${outputPath.pathname}`);
