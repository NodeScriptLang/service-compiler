import { Schema } from 'airtight';

import { RouteMethod, RouteMethodSchema } from './RouteMethod.js';

export interface RouteSpec {
    method: RouteMethod;
    path: string;
    moduleRef: string;
    middleware: Array<{
        moduleRef: string;
    }>;
}

export const RouteSpecSchema = new Schema<RouteSpec>({
    id: 'RouteSpec',
    type: 'object',
    properties: {
        method: RouteMethodSchema.schema,
        path: { type: 'string' },
        moduleRef: { type: 'string' },
        middleware: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    moduleRef: { type: 'string' },
                }
            },
        },
    },
});
