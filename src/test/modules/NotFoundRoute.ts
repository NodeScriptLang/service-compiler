import { ModuleDefinition } from '@nodescript/core/types';

export const module: ModuleDefinition<any, any> = {
    moduleName: 'NotFoundRoute',
    version: '1.0.0',
    params: {},
    result: {
        schema: { type: 'any' },
    }
};

export const compute = () => {
    return {
        $response: {
            status: 404,
            headers: {
                'content-type': ['text/html'],
            },
            body: '<h1>Not found</h1>'
        }
    };
};
