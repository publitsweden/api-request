/**
 * Request options
 */
export type ApiRequestOptions = {
  /** Host origin to make request against, including protocol and port */
  origin?: string
  /** API to use, e.g. `publishing/v2.0`. Will be prefixed to the path */
  api?: string
  /** Request headers for all requests */
  headers?: () => Record<string, string>
  /** Callback for request errors */
  onError?: (error: ApiRequestError) => void | Promise<void>
}

/** Combinator when using multiple `where` and `has` requests */
export type Combinator = 'AND' | 'OR'

/** Operator for `where` and `has` requests */
export type Operator = 'EQUAL' | 'LIKE' | 'NOT_EQUAL'

/**
 * Whenever a request returns a list of objects, it will follow this format
 */
export type ApiListResponse<T = unknown> = {
  /** Array of matching objects */
  data: T[]
  /** Total number of matches */
  count: number
  /** URL for the next paginated result page, which we rarely use */
  next?: string
}

/**
 * Internal error object returned by ApiRequest
 */
export type ApiRequestError = {
  /** HTTP status code */
  status?: number
  /** Error type */
  type?: string
  /** Error message */
  message: string
}

/**
 * External error object returned by backend
 */
type ApiErrorObject = {
  /** HTTP error code */
  Code: number
  /** Error type */
  Type: string
  /** Array of error messages */
  Errors: {
    /** Error message */
    Info: string
    /** Error type */
    Type: string
  }[]
  /** All `Errors#Info` values combined */
  CombinedInfo: string
}

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
  static defaultOptions: ApiRequestOptions = {
    api: '',
    headers: () => ({
      'Content-Type': 'application/json',
    }),
  }

  /**
   * Create a new ApiRequest from a given URL
   *
   * ```ts
   * PublitApiRequest.fromUrl("https://api.publit.com/publishing/v2.0/works/1")
   * ```
   */
  static fromUrl<T>(url: string | URL): PublitApiRequest<T> {
    const request = new PublitApiRequest<T>('')
    request.url = url
    return request
  }

  /**
   * URL object for the request
   */
  private _url: URL

  public get url(): URL {
    return this._url
  }

  public set url(url: string | URL) {
    this._url = new URL(url.toString())
  }

  /** Options passed via the constructor */
  options: ApiRequestOptions
  /** Options passed to the actual fetch request */
  requestInit: RequestInit
  /** Fetch response object, available after the request is done */
  response?: Response

  constructor(
    /** Resource endpoint for this request */
    resource: string,
    /** Options for this request instance */
    options: ApiRequestOptions = {}
  ) {
    this.options = {
      ...PublitApiRequest.defaultOptions,
      ...options,
    }

    const { origin, api, headers } = this.options

    if (origin == null) {
      throw new Error('No api host provided')
    }

    const prefix = api === '' ? '' : `${api}/`

    this._url = new URL(`${origin}/${prefix}${resource}`)

    this.requestInit = {
      headers: headers(),
      method: 'GET',
    }
  }

  /**
   * Append a parameter to the URL. If the parameter already exists,
   * the new value will be appended to the existing value.
   */
  private appendParam(param: string, value: string) {
    const currentValue = this.url.searchParams.get(param)
    this.url.searchParams.set(
      param,
      currentValue === null ? value : [currentValue, value].join(',')
    )
    return this
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
    limit: number,
    /** Starting offset */
    offset?: number
  ): PublitApiRequest<T> {
    this.url.searchParams.set(
      'limit',
      offset != null ? `${offset},${limit}` : String(limit)
    )
    return this
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
  with(relation: string): PublitApiRequest<T> {
    return this.appendParam('with', relation)
  }

  /**
   * Allows for filtering through pre defined scopes, if any
   *
   * ```ts
   * request.scope('published')
   * ```
   */
  scope(method: string, qualifier?: string): PublitApiRequest<T> {
    return this.appendParam(
      'scope',
      qualifier != null ? `${method};${qualifier}` : method
    )
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
    combinator: Combinator = 'OR'
  ): PublitApiRequest<T> {
    const values = Array.isArray(value) ? value : [value]
    values.forEach((value) => {
      const newHas = `${relation}(${attribute};${operator};${
        operator === 'LIKE' ? `%${value}%` : value
      });${combinator}`
      this.appendParam('has', newHas)
    })
    return this
  }

  /**
   * Group results by a given attribute
   *
   * ```ts
   * request.groupBy('work_id')
   * ```
   */
  groupBy<A extends keyof T>(attribute: A): PublitApiRequest<T> {
    return this.appendParam('group_by', attribute as string)
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
    attribute: string,
    /** Operator to use for filtering */
    operator: Operator,
    /** Value to filter on */
    value: string | string[], // FIXME: how can this be better typed?
    /** Combinator for any further `where` filters */
    combinator: Combinator = 'OR'
  ): PublitApiRequest<T> {
    if (operator === 'LIKE') {
      value = Array.isArray(value)
        ? value.map((v) => `%${v}%`).join(',')
        : `%${value}%`
    } else {
      value = Array.isArray(value) ? value.join(',') : value
    }

    this.url.searchParams.set(String(attribute), value)
    this.url.searchParams.set(`${attribute}_args`, `${operator};${combinator}`)
    return this
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
    attribute: keyof T
  ): PublitApiRequest<T> {
    return this.appendParam('auxiliary', String(attribute))
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
    attribute: keyof T,
    /** Direction to order by */
    direction?: 'ASC' | 'DESC'
  ): PublitApiRequest<T> {
    this.url.searchParams.set('order_by', String(attribute))

    if (direction != null) {
      this.url.searchParams.set('order_dir', direction)
    }
    return this
  }

  /**
   * Lists all available resources on the specified endpoint
   */
  async index(): Promise<ApiListResponse<T>> {
    const response = await this.fetch<ApiListResponse<T>>()

    return {
      ...response,
      // If `groupBy` has been used, the returned `count` is an array
      count: Array.isArray(response.count)
        ? response.count.length
        : response.count,
    }
  }

  /**
   * Retrieves a single resource from the specified endpoint
   */
  async show(id?: string): Promise<T> {
    if (id != null) {
      this.url.pathname += `/${id}`
    }
    return this.fetch()
  }

  /**
   * Creates a new resource on the specified endpoint
   */
  async store<S = T[]>(payload?: unknown): Promise<S> {
    this.requestInit.method = 'POST'
    if (payload != null) {
      this.requestInit.body = JSON.stringify(payload)
    }
    return this.fetch()
  }

  /**
   * Updates a single resource on the specified endpoint
   */
  async update<S = T[]>(id: string, payload?: unknown): Promise<S> {
    this.url.pathname += `/${id}`
    this.requestInit.method = 'PUT'
    if (payload != null) {
      this.requestInit.body = JSON.stringify(payload)
    }
    return this.fetch()
  }

  /**
   * Deletes a single resource on the specified endpoint
   */
  async delete(id: string): Promise<T> {
    this.url.pathname += `/${id}`
    this.requestInit.method = 'DELETE'
    return this.fetch()
  }

  /**
   * Performs the actual fetch request
   */
  private async fetch<T2 = T>(): Promise<T2> {
    try {
      const response = await fetch(this.url.toString(), this.requestInit)
      this.response = response
      return this.handleResponse(response)
    } catch (err) {
      const error: ApiRequestError = {
        message: 'Request failed',
      }

      if (this.options.onError != null) {
        await this.options.onError(error)
      }

      throw error
    }
  }

  /**
   * Handles the response from the API
   */
  private async handleResponse(response: Response) {
    if (response.ok) {
      return response.json()
    }

    const error: ApiRequestError = {
      status: response.status,
      message: response.statusText,
    }

    if (response.status === 401) {
      // 401 errors doesn't return a json
      error.message = 'Unauthorized'
    } else {
      try {
        const json = await response.json()

        if (isApiErrorObject(json)) {
          error.message = json.CombinedInfo
          error.type = json.Type
        }
      } catch {}
    }

    if (this.options.onError != null) {
      await this.options.onError(error)
    }

    throw error
  }
}

/** Type guard for API error objects */
function isApiErrorObject(obj: unknown): obj is ApiErrorObject {
  return (
    obj != null &&
    typeof obj === 'object' &&
    typeof (obj as ApiErrorObject).Code === 'number' &&
    typeof (obj as ApiErrorObject).Type === 'string' &&
    Array.isArray((obj as ApiErrorObject).Errors) &&
    typeof (obj as ApiErrorObject).CombinedInfo === 'string'
  )
}

/** Type guard for internal API request errors */
export function isApiRequestError(obj: unknown): obj is ApiRequestError {
  return (
    obj != null &&
    typeof obj === 'object' &&
    typeof (obj as ApiRequestError).message === 'string' &&
    typeof (obj as ApiRequestError).status === 'number'
  )
}
