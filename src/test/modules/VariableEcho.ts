import { ModuleDefinition } from '@nodescript/core/types';

export const module: ModuleDefinition<any, any> = {
    moduleName: 'VariableEcho',
    version: '1.0.0',
    params: {
        myVar: {
            schema: { type: 'string' },
            attributes: {
                variableKey: 'MY_VAR',
            },
        },
    },
    result: {
        schema: { type: 'any' },
    }
};

export const compute = (params: any) => {
    return params.myVar;
};
