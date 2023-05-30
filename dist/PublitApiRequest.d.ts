/**
 * Request options
 */
export type ApiRequestOptions = {
    /** Host origin to make request against, including protocol and port */
    origin?: string;
    /** API to use, e.g. `publishing/v2.0`. Will be prefixed to the path */
    api?: string;
    /** Request headers for all requests */
    headers?: () => Record<string, string>;
    /** Callback for request errors */
    onError?: (error: ApiRequestError) => void | Promise<void>;
};
/** Combinator when using multiple `where` and `has` requests */
export type Combinator = 'AND' | 'OR';
/** Operator for `where` and `has` requests */
export type Operator = 'EQUAL' | 'LIKE' | 'NOT_EQUAL';
type GroupedCount<T> = {
    count: string;
} & Partial<T>;
type Count<T> = number | GroupedCount<T>[];
export type ApiListResponse<T = unknown> = {
    /** Array of matching objects */
    data: T[];
    /** Total number of matches */
    count: Count<T>;
    next?: string;
};
export type ApiCountResponse<T = unknown> = {
    count: Count<T>;
};
/**
 * Internal error object returned by ApiRequest
 */
export type ApiRequestError = {
    /** HTTP status code */
    status?: number;
    /** Error type */
    type?: string;
    /** Error message */
    message: string;
};
type Payload = FormData | unknown;
/**
 * Class for making requests to Publit Core and similar API:s
 *
 * ```ts
 * const works = await new PublitApiRequest<Work>("works")
 *   .where("title", "LIKE", "lord of the")
 *   .with("contributors")
 *   .index()
 * ```
 *
 */
export default class PublitApiRequest<T> {
    /** Options used for all requests, unless overridden individually */
    static defaultOptions: ApiRequestOptions;
    /**
     * Create a new ApiRequest from a given URL
     *
     * ```ts
     * PublitApiRequest.fromUrl("https://api.publit.com/publishing/v2.0/works/1")
     * ```
     */
    static fromUrl<T>(url: string | URL): PublitApiRequest<T>;
    /**
     * URL object for the request
     */
    private _url;
    private resource;
    get url(): URL;
    set url(url: string | URL);
    /** Options passed via the constructor */
    options: ApiRequestOptions;
    /** Options passed to the actual fetch request */
    requestInit: RequestInit;
    /** Fetch response object, available after the request is done */
    response?: Response;
    constructor(
    /** Resource endpoint for this request */
    resource: string, 
    /** Options for this request instance */
    options?: ApiRequestOptions);
    /**
     * Append a parameter to the URL. If the parameter already exists,
     * the new value will be appended to the existing value.
     */
    private appendParam;
    /**
     * Limit the number of results returned
     *
     * Usage:
     *
     * ```ts
     * request.limit(10)
     * request.limit(10, 20)
     * ```
     */
    limit(
    /** Number of result to return */
    limit: number, 
    /** Starting offset */
    offset?: number): PublitApiRequest<T>;
    /**
     * Load relations for the requested object
     *
     * E.g. .with('authors') or a deeper nested relation .with('authors.name'),
     * which will load parent relations as well.
     *
     * ```ts
     * request.with('authors')
     * request.with('authors.works')
     * ```
     */
    with(relation: string): PublitApiRequest<T>;
    /**
     * Allows for filtering through pre defined scopes, if any
     *
     * ```ts
     * request.scope('published')
     * ```
     */
    scope(method: string, qualifier?: string): PublitApiRequest<T>;
    /**
     * Allows for filtering through relations
     *
     * ```ts
     * request.filter('authors', 'name', 'LIKE', 'John')
     * request.filter('authors', 'name', 'LIKE', ['John', 'Doe'])
     * request.filter('authors', 'name', 'LIKE', 'John', 'AND')
     * request.filter('authors', 'name', 'EQUAL', 'John', 'AND')
     * ```
     */
    has<R extends keyof T>(
    /** The relation to filter on */
    relation: R, 
    /** The attribute to filter on */
    attribute?: string, // TODO: how can this be better typed?
    /** Operator to use for filtering */
    operator?: Operator, 
    /** Value to filter on */
    value?: string | string[], // FIXME: how can this be better typed?
    /** Combinator for any further `has` filters */
    combinator?: Combinator): PublitApiRequest<T>;
    /**
     * Group results by a given attribute
     *
     * ```ts
     * request.groupBy('work_id')
     * ```
     */
    groupBy<A extends keyof T>(attribute: A): PublitApiRequest<T>;
    /**
     * Allows for filtering on attributes on the requested object
     *
     * ```ts
     * request.where('name', 'LIKE', 'John')
     * request.where('name', 'LIKE', ['John', 'Doe'])
     * request.where('name', 'LIKE', 'John', 'AND')
     * request.where('name', 'EQUAL', 'John', 'AND')
     * ```
     */
    where(
    /** The attribute to filter on */
    attribute: string, 
    /** Operator to use for filtering */
    operator: Operator, 
    /** Value to filter on */
    value: string | string[], // FIXME: how can this be better typed?
    /** Combinator for any further `where` filters */
    combinator?: Combinator): PublitApiRequest<T>;
    /**
     * Load attributes defined by the resource but not part of the model
     *
     * ```ts
     * request.auxiliary('measurements')
     * ```
     */
    auxiliary(
    /** The attribute to filter on */
    attribute: keyof T): PublitApiRequest<T>;
    /**
     * Order results by a given attribute
     *
     * ```ts
     * request.orderBy('name', 'ASC')
     * request.orderBy('name', 'DESC')
     * ```
     */
    orderBy(
    /** The attribute to order by */
    attribute: keyof T, 
    /** Direction to order by */
    direction?: 'ASC' | 'DESC'): PublitApiRequest<T>;
    /**
     * Specify a subset of attributes to return in the response
     *
     * ```ts
     * request.only('name', 'description')
     * ```
     */
    only(...attributes: (keyof T)[]): PublitApiRequest<T>;
    setPayload(payload: Payload): void;
    /**
     * Lists all available resources on the specified endpoint
     */
    index(): Promise<ApiListResponse<T>>;
    /**
     *
     */
    count(): Promise<ApiCountResponse<T>>;
    /**
     * Retrieves a single resource from the specified endpoint
     */
    show(id?: string): Promise<T>;
    /**
     * Creates a new resource on the specified endpoint
     */
    store<StoreT = T>(payload?: Payload): Promise<StoreT>;
    /**
     * Updates a single resource on the specified endpoint
     */
    update(id: string, payload?: Payload): Promise<T>;
    /**
     * Deletes a single resource on the specified endpoint
     */
    delete(id: string): Promise<T>;
    /**
     * Performs the actual fetch request
     */
    fetch<T2 = T>(): Promise<T2>;
    /**
     * Handles the response from the API
     */
    private handleResponse;
}
/** Type guard for count */
export declare function isGroupedCount<T>(obj: unknown): obj is GroupedCount<T>[];
/** Type guard for internal API request errors */
export declare function isApiRequestError(obj: unknown): obj is ApiRequestError;
export {};
