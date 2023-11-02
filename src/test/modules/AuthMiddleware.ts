import { ModuleDefinition } from '@nodescript/core/types';

export const module: ModuleDefinition<any, any> = {
    moduleName: 'AuthMidleware',
    version: '1.0.0',
    params: {
        $request: {
            schema: { type: 'any' },
        },
        AUTH_TOKEN: {
            schema: { type: 'string' },
            attributes: {
                variableKey: 'AUTH_TOKEN',
            },
        },
    },
    result: {
        schema: { type: 'any' },
    }
};

export const compute = (params: any) => {
    const { $request } = params;
    if ($request.headers['x-teapot']) {
        return {
            $response: {
                status: 418,
                body: 'I am a teapot, baby!'
            },
        };
    }
    const auth = $request.headers['authorization']?.[0];
    if (auth !== params.AUTH_TOKEN) {
        const err = new Error('Access Denied') as any;
        err.status = 403;
        throw err;
    }
    const userId = $request.headers['x-user-id']?.[0] ?? 'unknown';
    return {
        authorized: true,
        userId,
    };
};
