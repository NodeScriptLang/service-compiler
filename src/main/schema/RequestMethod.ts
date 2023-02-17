import { Schema } from 'airtight';

export enum RequestMethod {
    GET = 'GET',
    POST = 'POST',
    PUT = 'PUT',
    DELETE = 'DELETE',
}

export const RequestMethodSchema = new Schema<RequestMethod>({
    id: 'RequestMethod',
    type: 'string',
    enum: Object.values(RequestMethod),
});
