import { ModuleDefinition } from '@nodescript/core/types';

export const module: ModuleDefinition<any, any> = {
    moduleName: 'ErrorHandler',
    version: '1.0.0',
    params: {
        $error: {
            schema: { type: 'any' },
        },
    },
    result: {
        schema: { type: 'any' },
    }
};

export const compute = (params: any) => {
    const { $error } = params;
    return {
        $response: {
            status: $error?.status ?? '500',
            body: `Custom error: ${$error?.message}`
        }
    };
};
