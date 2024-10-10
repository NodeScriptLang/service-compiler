import { ModuleDefinition } from '@nodescript/core/types';

export const module: ModuleDefinition<any, any> = {
    moduleName: 'ErrorRoute',
    version: '1.0.0',
    params: {},
    result: {
        schema: { type: 'any' },
    }
};

export const compute = () => {
    const error: any = new Error('Something went wrong');
    error.status = 503;
    throw error;
};
