import { Schema } from 'airtight';

import { RouteMethod, RouteMethodSchema } from './RouteMethod.js';

export interface RouteSpec {
    method: RouteMethod;
    path: string;
    middleware: boolean;
    moduleRef: string;
}

export const RouteSpecSchema = new Schema<RouteSpec>({
    id: 'RouteSpec',
    type: 'object',
    properties: {
        method: RouteMethodSchema.schema,
        path: { type: 'string' },
        middleware: { type: 'boolean' },
        moduleRef: { type: 'string' },
    }
});
