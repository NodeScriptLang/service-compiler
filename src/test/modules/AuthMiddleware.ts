import { ModuleDefinition } from '@nodescript/core/types';

export const module: ModuleDefinition = {
    moduleName: 'AuthMidleware',
    version: '1.0.0',
    params: {
        $request: {
            schema: { type: 'any' },
        }
    },
    result: {
        schema: { type: 'any' },
    }
};

export const compute = (params: any) => {
    const { $request } = params;
    const auth = $request.headers['authorization'];
    if (auth) {
        return {
            authorized: true,
            userId: $request.headers['x-user-id']?.[0] ?? 'unknown',
        };
    }
    const err = new Error('Access Denied') as any;
    err.status = 403;
    throw err;
};
