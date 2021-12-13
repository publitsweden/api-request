"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isApiRequestError = void 0;
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
class PublitApiRequest {
    constructor(
    /** Resource endpoint for this request */
    resource, 
    /** Options for this request instance */
    options = {}) {
        this.options = Object.assign(Object.assign({}, PublitApiRequest.defaultOptions), options);
        const { origin, api, headers } = this.options;
        if (origin == null) {
            throw new Error('No api host provided');
        }
        const prefix = api === '' ? '' : `${api}/`;
        this._url = new URL(`${origin}/${prefix}${resource}`);
        this.requestInit = {
            headers,
            method: 'GET',
        };
    }
    /**
     * Create a new ApiRequest from a given URL
     *
     * ```ts
     * PublitApiRequest.fromUrl("https://api.publit.com/publishing/v2.0/works/1")
     * ```
     */
    static fromUrl(url) {
        const request = new PublitApiRequest('');
        request.url = url;
        return request;
    }
    get url() {
        return this._url;
    }
    set url(url) {
        this._url = new URL(url.toString());
    }
    /**
     * Append a parameter to the URL. If the parameter already exists,
     * the new value will be appended to the existing value.
     */
    appendParam(param, value) {
        const currentValue = this.url.searchParams.get(param);
        this.url.searchParams.set(param, currentValue === null ? value : [currentValue, value].join(','));
        return this;
    }
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
    limit, 
    /** Starting offset */
    offset) {
        this.url.searchParams.set('limit', offset != null ? `${offset},${limit}` : String(limit));
        return this;
    }
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
    with(relation) {
        return this.appendParam('with', relation);
    }
    /**
     * Allows for filtering through pre defined scopes, if any
     *
     * ```ts
     * request.scope('published')
     * ```
     */
    scope(method, qualifier) {
        return this.appendParam('scope', qualifier != null ? `${method};${qualifier}` : method);
    }
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
    has(
    /** The relation to filter on */
    relation, 
    /** The attribute to filter on */
    attribute, // TODO: how can this be better typed?
    /** Operator to use for filtering */
    operator, 
    /** Value to filter on */
    value, // FIXME: how can this be better typed?
    /** Combinator for any further `has` filters */
    combinator = 'OR') {
        const values = Array.isArray(value) ? value : [value];
        values.forEach((value) => {
            const newHas = `${relation}(${attribute};${operator};${operator === 'LIKE' ? `%${value}%` : value});${combinator}`;
            this.appendParam('has', newHas);
        });
        return this;
    }
    /**
     * Group results by a given attribute
     *
     * ```ts
     * request.groupBy('work_id')
     * ```
     */
    groupBy(attribute) {
        return this.appendParam('group_by', attribute);
    }
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
    attribute, 
    /** Operator to use for filtering */
    operator, 
    /** Value to filter on */
    value, // FIXME: how can this be better typed?
    /** Combinator for any further `where` filters */
    combinator = 'OR') {
        value = Array.isArray(value) ? value.join(',') : value;
        value = operator === 'LIKE' ? `%${value}%` : value;
        this.url.searchParams.set(String(attribute), value);
        this.url.searchParams.set(`${attribute}_args`, `${operator};${combinator}`);
        return this;
    }
    /**
     * Load attributes defined by the resource but not part of the model
     *
     * ```ts
     * request.auxiliary('measurements')
     * ```
     */
    auxiliary(
    /** The attribute to filter on */
    attribute) {
        return this.appendParam('auxiliary', String(attribute));
    }
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
    attribute, 
    /** Direction to order by */
    direction) {
        this.url.searchParams.set('order_by', String(attribute));
        if (direction != null) {
            this.url.searchParams.set('order_dir', direction);
        }
        return this;
    }
    /**
     * Lists all available resources on the specified endpoint
     */
    index() {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield this.fetch();
            return Object.assign(Object.assign({}, response), { 
                // If `groupBy` has been used, the returned `count` is an array
                count: Array.isArray(response.count)
                    ? response.count.length
                    : response.count });
        });
    }
    /**
     * Retrieves a single resource from the specified endpoint
     */
    show(id) {
        return __awaiter(this, void 0, void 0, function* () {
            if (id != null) {
                this.url.pathname += `/${id}`;
            }
            return this.fetch();
        });
    }
    /**
     * Creates a new resource on the specified endpoint
     */
    store(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            this.requestInit.method = 'POST';
            if (payload != null) {
                this.requestInit.body = JSON.stringify(payload);
            }
            return this.fetch();
        });
    }
    /**
     * Updates a single resource on the specified endpoint
     */
    update(id, payload) {
        return __awaiter(this, void 0, void 0, function* () {
            this.url.pathname += `/${id}`;
            this.requestInit.method = 'PUT';
            if (payload != null) {
                this.requestInit.body = JSON.stringify(payload);
            }
            return this.fetch();
        });
    }
    /**
     * Deletes a single resource on the specified endpoint
     */
    delete(id) {
        return __awaiter(this, void 0, void 0, function* () {
            this.url.pathname += `/${id}`;
            this.requestInit.method = 'DELETE';
            return this.fetch();
        });
    }
    /**
     * Performs the actual fetch request
     */
    fetch() {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield fetch(this.url.toString(), this.requestInit);
                this.response = response;
                return this.handleResponse(response);
            }
            catch (err) {
                const error = {
                    message: 'Request failed',
                };
                (_b = (_a = this.options).onError) === null || _b === void 0 ? void 0 : _b.call(_a, error);
                throw error;
            }
        });
    }
    /**
     * Handles the response from the API
     */
    handleResponse(response) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            if (response.ok) {
                return response.json();
            }
            const error = {
                status: response.status,
                message: response.statusText,
            };
            if (response.status === 401) {
                // 401 errors doesn't return a json
                error.message = 'Unauthorized';
            }
            else {
                try {
                    const json = yield response.json();
                    if (isApiErrorObject(json)) {
                        error.message = json.CombinedInfo;
                        error.type = json.Type;
                    }
                }
                catch (_c) { }
            }
            (_b = (_a = this.options).onError) === null || _b === void 0 ? void 0 : _b.call(_a, error);
            throw error;
        });
    }
}
exports.default = PublitApiRequest;
/** Options used for all requests, unless overridden individually */
PublitApiRequest.defaultOptions = {
    api: '',
    headers: {
        'Content-Type': 'application/json',
    },
};
/** Type guard for API error objects */
function isApiErrorObject(obj) {
    return (obj != null &&
        typeof obj === 'object' &&
        typeof obj.Code === 'number' &&
        typeof obj.Type === 'string' &&
        Array.isArray(obj.Errors) &&
        typeof obj.CombinedInfo === 'string');
}
/** Type guard for internal API request errors */
function isApiRequestError(obj) {
    return (obj != null &&
        typeof obj === 'object' &&
        typeof obj.message === 'string' &&
        typeof obj.status === 'number');
}
exports.isApiRequestError = isApiRequestError;
