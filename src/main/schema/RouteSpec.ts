import { Schema } from 'airtight';

import { HookSpec, HookSpecSchema } from './HookSpec.js';
import { RouteMethod, RouteMethodSchema } from './RouteMethod.js';

export interface RouteSpec {
    method: RouteMethod;
    path: string;
    moduleRef: string;
    beforeHooks?: HookSpec[];
    afterHooks?: HookSpec[];
    errorHook?: HookSpec;
    metadata?: Record<string, string>;
}

export const RouteSpecSchema = new Schema<RouteSpec>({
    type: 'object',
    properties: {
        method: RouteMethodSchema.schema,
        path: { type: 'string' },
        moduleRef: { type: 'string' },
        beforeHooks: {
            type: 'array',
            items: HookSpecSchema.schema,
            optional: true,
        },
        afterHooks: {
            type: 'array',
            items: HookSpecSchema.schema,
            optional: true,
        },
        errorHook: {
            ...HookSpecSchema.schema,
            optional: true,
        },
        metadata: {
            type: 'object',
            properties: {},
            additionalProperties: { type: 'string' },
            optional: true,
        },
    },
});
