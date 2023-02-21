import { ResponseSpec } from '../schema/ResponseSpec.js';

export function processError(error: any) {
    const $response: ResponseSpec = {
        status: Number(error.status) || 500,
        headers: {
            'content-type': ['application/json'],
        },
        body: {
            name: error.name,
            message: error.message,
        },
        attributes: {},
    };
    return { $response };
}
