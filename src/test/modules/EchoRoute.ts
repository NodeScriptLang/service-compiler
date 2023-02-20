import { GraphEvalContext } from '@nodescript/core/runtime';
import { ModuleDefinition } from '@nodescript/core/types';

export const module: ModuleDefinition = {
    moduleName: 'EchoRoute',
    version: '1.0.0',
    params: {},
    result: {
        schema: { type: 'any' },
    }
};

export const compute = (params: any, ctx: GraphEvalContext) => {
    return {
        params,
    };
};
