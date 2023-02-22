import { Schema } from 'airtight';

export enum RouteMethod {
    ANY = '*',
    GET = 'GET',
    POST = 'POST',
    PUT = 'PUT',
    PATCH = 'PATCH',
    DELETE = 'DELETE',
}

export const RouteMethodSchema = new Schema<RouteMethod>({
    id: 'RouteMethod',
    type: 'string',
    enum: Object.values(RouteMethod),
});
