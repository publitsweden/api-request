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
exports.isGroupedCount = isGroupedCount;
exports.isGroupedSum = isGroupedSum;
exports.isApiRequestError = isApiRequestError;
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
    constructor(
    /** Resource endpoint for this request */
    resource, 
    /** Options for this request instance */
    options = {}) {
        this.options = Object.assign(Object.assign({}, PublitApiRequest.defaultOptions), options);
        this.resource = resource;
        const { origin, api, headers } = this.options;
        if (origin == null) {
            throw new Error('No api host provided');
        }
        const prefix = api === '' ? '' : `${api}/`;
        this._url = new URL(`${origin}/${prefix}${this.resource}`);
        this.requestInit = {
            headers: headers(),
            method: 'GET',
        };
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
    debug() {
        this.options.debug = true;
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
        if (attribute == null) {
            return this.appendParam('has', String(relation));
        }
        const values = Array.isArray(value) ? value : [value];
        values.forEach((value) => {
            const newHas = `${String(relation)}(${attribute};${operator};${operator === 'LIKE' ? `%${value}%` : value});${combinator}`;
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
        // Wrap the value in % if the operator is LIKE
        if (operator === 'LIKE') {
            value = Array.isArray(value)
                ? value.map((v) => `%${v}%`).join(',')
                : `%${value}%`;
        }
        else {
            value = Array.isArray(value) ? value.join(',') : value;
        }
        if (this.url.searchParams.has(attribute)) {
            // If the attribute already exists, append the new value
            this.appendParam(attribute, value);
            this.appendParam(`${attribute}_args`, `${operator};${combinator}`);
        }
        else {
            this.url.searchParams.set(attribute, value);
            this.url.searchParams.set(`${attribute}_args`, `${operator};${combinator}`);
        }
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
        this.appendParam('order_by', String(attribute));
        if (direction != null) {
            this.appendParam('order_dir', direction);
        }
        return this;
    }
    /**
     * Specify a subset of attributes to return in the response
     *
     * ```ts
     * request.only('name', 'description')
     * ```
     */
    only(...attributes) {
        return this.appendParam('only', attributes.join(','));
    }
    setPayload(payload) {
        if (payload instanceof FormData) {
            this.requestInit.body = payload;
        }
        else if (payload != null) {
            this.requestInit.body = JSON.stringify(payload);
        }
    }
    /**
     * Lists all available resources on the specified endpoint
     */
    index() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.fetch();
        });
    }
    /**
     *
     */
    count() {
        return __awaiter(this, void 0, void 0, function* () {
            const { api } = this.options;
            const prefix = api === '' ? '' : `${api}/`;
            this._url.pathname = `${prefix}count/${this.resource}`;
            return this.fetch();
        });
    }
    /**
     *
     */
    sum(parameter) {
        return __awaiter(this, void 0, void 0, function* () {
            const { api } = this.options;
            const prefix = api === '' ? '' : `${api}/`;
            this._url.pathname = `${prefix}sum/${this.resource};${String(parameter)}`;
            return this.fetch();
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
     * Do a simple fetch request without transforming the return value to json
     */
    download() {
        return __awaiter(this, void 0, void 0, function* () {
            //return this.fetch()
            try {
                const response = yield fetch(this.url.toString(), this.requestInit);
                this.response = response;
                return response;
            }
            catch (err) {
                console.log(err);
                const error = {
                    message: 'Request failed',
                };
                if (this.options.onError != null) {
                    yield this.options.onError(error);
                }
                throw error;
            }
        });
    }
    /**
     * Creates a new resource on the specified endpoint
     */
    store(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            this.requestInit.method = 'POST';
            this.setPayload(payload);
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
            this.setPayload(payload);
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
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // When the payload is a FormData object, the Content-Type header
                // should be set to `multipart/form-data`, and the browser will
                // automatically set that. Otherwise, we need to set it manually.
                if (!(this.requestInit.body instanceof FormData)) {
                    this.requestInit.headers['Content-Type'] = 'application/json';
                }
                if (this.options.debug) {
                    const message = [];
                    message.push('SENDING API-REQUEST:');
                    message.push(`URL: ${this.url.toString()}`);
                    message.push(`Method: ${this.requestInit.method}`);
                    message.push(`Headers: ${JSON.stringify(this.requestInit.headers)}`);
                    if (this.requestInit.body instanceof FormData) {
                        // FormData objects are not easily logged
                        const formData = this.requestInit.body;
                        const data = Object.fromEntries(Array.from(formData.keys()).map((key) => [
                            key,
                            formData.getAll(key).length > 1
                                ? formData.getAll(key)
                                : formData.get(key),
                        ]));
                        message.push(`Body: ${JSON.stringify(data)}`);
                    }
                    else if (this.requestInit.body != null) {
                        message.push(`Body: ${this.requestInit.body.toString()}`);
                    }
                    console.log(message.join('\n'));
                }
                const response = yield fetch(this.url.toString(), this.requestInit);
                if (this.options.debug) {
                    const message = [];
                    message.push('RECEIVED API-RESPONSE:');
                    message.push(`Request URL: ${this.url.toString()}`);
                    message.push(`Status: ${response.status}`);
                    message.push(`StatusText: ${response.statusText}`);
                    message.push(`Headers: ${JSON.stringify(response.headers)}`);
                    console.log(message.join('\n'));
                }
                this.response = response;
                return this.handleResponse(response);
            }
            catch (err) {
                console.log(err);
                const error = {
                    message: 'Request failed',
                };
                if (this.options.onError != null) {
                    yield this.options.onError(error);
                }
                throw error;
            }
        });
    }
    /**
     * Handles the response from the API
     */
    handleResponse(response) {
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
                    if (isApiErrorObject(json) ||
                        isAnApiErrorObjectButWithErrorsPropertyMisspelled(json)) {
                        error.message = json.CombinedInfo;
                        error.type = json.Type;
                    }
                }
                catch (_a) { }
            }
            if (this.options.onError != null) {
                yield this.options.onError(error);
            }
            throw error;
        });
    }
}
/** Options used for all requests, unless overridden individually */
PublitApiRequest.defaultOptions = {
    api: '',
    headers: () => ({}),
    debug: false,
};
exports.default = PublitApiRequest;
/** Type guard for count */
function isGroupedCount(obj) {
    return (Array.isArray(obj) &&
        obj.every((item) => typeof item === 'object' &&
            typeof item.count === 'string'));
}
/** Type guard for sum */
function isGroupedSum(obj) {
    return (Array.isArray(obj) &&
        obj.every((item) => typeof item === 'object' &&
            typeof item.sum === 'string'));
}
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
function isAnApiErrorObjectButWithErrorsPropertyMisspelled(obj) {
    const isProbablyAnApiErrorObject = obj != null &&
        typeof obj === 'object' &&
        typeof obj.Code === 'number' &&
        typeof obj.Type === 'string' &&
        typeof obj.CombinedInfo === 'string';
    // Check if the "Errors" property name might be misspelled
    return (isProbablyAnApiErrorObject &&
        obj.hasOwnProperty('Error') &&
        !obj.hasOwnProperty('Errors'));
}
