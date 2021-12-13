export declare type ApiRequestOptions = {
    /** Host origin to make request against, including protocol and port */
    origin?: string;
    /** API to use, e.g. `publishing/v2.0`. Will be prefixed to the path */
    api?: string;
    /** Request headers for all requests */
    headers?: Record<string, string>;
    /** Callback for request errors */
    onError?: (error: ApiRequestError) => void;
};
declare type Combinator = 'AND' | 'OR';
declare type Operator = 'EQUAL' | 'LIKE' | 'NOT_EQUAL';
/**
 * Whenever a request returns a list of objects, it will follow this format
 */
export declare type ApiListResponse<T = unknown> = {
    data: T[];
    count: number;
    next?: string;
};
/**
 * Internal error object returned by ApiRequest
 */
export declare type ApiRequestError = {
    status?: number;
    type?: string;
    message: string;
};
export default class ApiRequest<T> {
    static defaultOptions: ApiRequestOptions;
    /**
     * Create a new ApiRequest from a given URL
     */
    static fromUrl<T>(url: string | URL): ApiRequest<T>;
    private _url;
    get url(): URL;
    set url(url: string | URL);
    /** Options passed via the constructor */
    options: ApiRequestOptions;
    /** Options passed to the actual fetch request */
    requestInit: RequestInit;
    /** Fetch response object, available after the request is done */
    response?: Response;
    constructor(resource: string, options?: ApiRequestOptions);
    /**
     * Append a parameter to the URL. If the parameter already exists,
     * the new value will be appended to the existing value.
     */
    private appendParam;
    /**
     * Limit the number of results returned
     * Usage:
     * .limit(10)
     * .limit(10, 20)
     */
    limit(
    /** Number of result to return */
    limit: number, 
    /** Starting offset */
    offset?: number): ApiRequest<T>;
    /**
     * Load relations for the requested object
     * E.g. .with('authors') or a deeper nested relation .with('authors.name'),
     * which will load parent relations as well.
     * Usage:
     * .with('authors')
     * .with('authors.works')
     */
    with(relation: string): ApiRequest<T>;
    /**
     * Allows for filtering through pre defined scopes, if any
     * Usage:
     * .scope('published')
     */
    scope(method: string, qualifier?: string): ApiRequest<T>;
    /**
     * Allows for filtering through relations
     * Usage:
     *  .filter('authors', 'name', 'LIKE', 'John')
     *  .filter('authors', 'name', 'LIKE', ['John', 'Doe'])
     *  .filter('authors', 'name', 'LIKE', 'John', 'AND')
     *  .filter('authors', 'name', 'EQUAL', 'John', 'AND')
     */
    has<R extends keyof T>(
    /** The relation to filter on */
    relation: R, 
    /** The attribute to filter on */
    attribute: string, // TODO: how can this be better typed?
    /** Operator to use for filtering */
    operator: Operator, 
    /** Value to filter on */
    value: string | string[], // FIXME: how can this be better typed?
    /** Combinator for any further `has` filters */
    combinator?: Combinator): ApiRequest<T>;
    /**
     * Group results by a given attribute
     * Usage:
     * .groupBy('work_id')
     */
    groupBy<A extends keyof T>(attribute: A): ApiRequest<T>;
    /**
     * Allows for filtering on attributes on the requested object
     * Usage:
     * .where('name', 'LIKE', 'John')
     * .where('name', 'LIKE', ['John', 'Doe'])
     * .where('name', 'LIKE', 'John', 'AND')
     * .where('name', 'EQUAL', 'John', 'AND')
     */
    where(
    /** The attribute to filter on */
    attribute: string, 
    /** Operator to use for filtering */
    operator: Operator, 
    /** Value to filter on */
    value: string | string[], // FIXME: how can this be better typed?
    /** Combinator for any further `where` filters */
    combinator?: Combinator): ApiRequest<T>;
    /**
     * Load attributes defined by the resource but not part of the model
     * Usage:
     * .auxiliary('measurements')
     */
    auxiliary(
    /** The attribute to filter on */
    attribute: keyof T): ApiRequest<T>;
    /**
     * Order results by a given attribute
     * Usage:
     * .orderBy('name', 'ASC')
     * .orderBy('name', 'DESC')
     */
    orderBy(
    /** The attribute to order by */
    attribute: keyof T, 
    /** Direction to order by */
    direction?: 'ASC' | 'DESC'): ApiRequest<T>;
    /**
     * Lists all available resources on the specified endpoint
     */
    index(): Promise<ApiListResponse<T>>;
    /**
     * Retrieves a single resource from the specified endpoint
     */
    show(id?: string): Promise<T>;
    /**
     * Creates a new resource on the specified endpoint
     */
    store(payload?: unknown): Promise<T>;
    /**
     * Updates a single resource on the specified endpoint
     */
    update(id: string, payload?: unknown): Promise<T>;
    /**
     * Deletes a single resource on the specified endpoint
     */
    delete(id: string): Promise<T>;
    /**
     * Performs the actual fetch request
     */
    private fetch;
    /**
     * Handles the response from the API
     */
    private handleResponse;
}
/** Type guard for internal API request errors */
export declare function isApiRequestError(obj: unknown): obj is ApiRequestError;
export {};
