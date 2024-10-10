import { Schema } from 'airtight';

import { RouteSpec, RouteSpecSchema } from './RouteSpec.js';

export interface ServiceSpec {
    routes: RouteSpec[];
}

export const ServiceSpecSchema = new Schema<ServiceSpec>({
    type: 'object',
    properties: {
        routes: {
            type: 'array',
            items: RouteSpecSchema.schema,
        }
    }
});
