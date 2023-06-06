import { ModuleDefinition } from '@nodescript/core/types';

export const module: ModuleDefinition<any, any> = {
    moduleName: 'EchoRoute',
    version: '1.0.0',
    params: {},
    result: {
        schema: { type: 'any' },
    }
};

export const compute = (params: any) => {
    return params;
};
