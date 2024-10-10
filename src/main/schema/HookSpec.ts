import { Schema } from 'airtight';

export interface HookSpec {
    moduleRef: string;
}

export const HookSpecSchema = new Schema<HookSpec>({
    type: 'object',
    properties: {
        moduleRef: { type: 'string' },
    }
});
