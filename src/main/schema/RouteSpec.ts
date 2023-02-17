import { Schema } from 'airtight';

import { RouteMethod, RouteMethodSchema } from './RouteMethod.js';

export interface RouteSpec {
    priority: number;
    method: RouteMethod;
    path: string;
    matchPrefix: boolean;
    middleware: boolean;
    moduleUrl: string;
}

export const RouteSpecSchema = new Schema<RouteSpec>({
    id: 'RouteSpec',
    type: 'object',
    properties: {
        priority: { type: 'number', default: 0 },
        method: RouteMethodSchema.schema,
        path: { type: 'string' },
        matchPrefix: { type: 'boolean' },
        middleware: { type: 'boolean' },
        moduleUrl: { type: 'string' },
    }
});
