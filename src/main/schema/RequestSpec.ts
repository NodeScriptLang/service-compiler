import { HttpDict } from './HttpDict.js';
import { RequestMethod } from './RequestMethod.js';

export interface RequestSpec {
    method: RequestMethod;
    path: string;
    query: HttpDict;
    headers: HttpDict;
    body: any;
}
