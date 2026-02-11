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
  debug?: boolean
}

/** Combinator when using multiple `where` and `has` requests */
export type Combinator = 'AND' | 'OR'

/** Operator for `where` and `has` requests */
export type Operator =
  | 'EQUAL'
  | 'LIKE'
  | 'NOT_EQUAL'
  | 'GREATER'
  | 'GREATER_EQUAL'
  | 'LESS'
  | 'LESS_EQUAL'

// If groupBy is used, `count` will be an array of objects with a subset
// of properties from <T>, and a `count` property
export type GroupedCount<T> = {
  count: string
} & Partial<T>

export type Count<T> = number | GroupedCount<T>[]

// If groupBy is used, `sum` will be an array of objects with a subset
// of properties from <T>, and a `count` property
export type GroupedSum<T> = {
  sum: string
} & Partial<T>

export type Sum<T> = number | GroupedSum<T>[]

export type ApiListResponse<T = unknown> = {
  /** Array of matching objects */
  data: T[]
  /** Total number of matches */
  count: Count<T>
  next?: string
}

export type ApiCountResponse<T = unknown> = {
  count: Count<T>
}

export type ApiSumResponse<T = unknown> = {
  sum: Sum<T>
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
 * External error object returned by Interzone Api
 *
 * There is currently a naming discrepancy between the Core API and
 * Interzone API where the Interzone API omits the plural 's' on the
 * Errors parameter.
 *
 * This type just changes the name of the parameter.
 *
 * TODO: Remove as soon as this is fixed in the Interzone API
 */
type InterzoneApiErrorObject = Omit<ApiErrorObject, 'Errors'> & {
  /** Array of error messages from Interzone Api*/
  Error: {
    /** Error message */
    Info: string
    /** Error type */
    Type: string
  }[]
}

type Payload = FormData | unknown

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
    headers: () => ({}),
    debug: false,
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

  private resource: string

  public get url(): URL {
    return this._url
  }

  public set url(url: string | URL) {
    this._url = new URL(url.toString())
  }

  /** Options passed via the constructor */
  public options: ApiRequestOptions
  /** Options passed to the actual fetch request */
  public requestInit: RequestInit
  /** Fetch response object, available after the request is done */
  public response?: Response

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

    this.resource = resource

    const { origin, api, headers } = this.options

    if (origin == null) {
      throw new Error('No api host provided')
    }

    const prefix = api === '' ? '' : `${api}/`

    this._url = new URL(`${origin}/${prefix}${this.resource}`)

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

  debug() {
    this.options.debug = true
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
    attribute?: string, // TODO: how can this be better typed?
    /** Operator to use for filtering */
    operator?: Operator,
    /** Value to filter on */
    value?: string | string[], // FIXME: how can this be better typed?
    /** Combinator for any further `has` filters */
    combinator: Combinator = 'OR'
  ): PublitApiRequest<T> {
    if (attribute == null) {
      return this.appendParam('has', String(relation))
    }

    const values = Array.isArray(value) ? value : [value]
    values.forEach((value) => {
      const newHas = `${String(relation)}(${attribute};${operator};${
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
    // Wrap the value in % if the operator is LIKE
    if (operator === 'LIKE') {
      value = Array.isArray(value)
        ? value.map((v) => `%${v}%`).join(',')
        : `%${value}%`
    } else {
      value = Array.isArray(value) ? value.join(',') : value
    }

    if (this.url.searchParams.has(attribute)) {
      // If the attribute already exists, append the new value
      this.appendParam(attribute, value)
      this.appendParam(`${attribute}_args`, `${operator};${combinator}`)
    } else {
      this.url.searchParams.set(attribute, value)
      this.url.searchParams.set(
        `${attribute}_args`,
        `${operator};${combinator}`
      )
    }

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
    this.appendParam('order_by', String(attribute))

    if (direction != null) {
      this.appendParam('order_dir', direction)
    }
    return this
  }

  /**
   * Specify a subset of attributes to return in the response
   *
   * ```ts
   * request.only('name', 'description')
   * ```
   */
  only(...attributes: (keyof T)[]): PublitApiRequest<T> {
    return this.appendParam('only', attributes.join(','))
  }

  setPayload(payload: Payload) {
    if (payload instanceof FormData) {
      this.requestInit.body = payload
    } else if (payload != null) {
      this.requestInit.body = JSON.stringify(payload)
    }
  }

  /**
   * Lists all available resources on the specified endpoint
   */
  async index(): Promise<ApiListResponse<T>> {
    return this.fetch<ApiListResponse<T>>()
  }

  /**
   *
   */
  async count(): Promise<ApiCountResponse<T>> {
    const { api } = this.options
    const prefix = api === '' ? '' : `${api}/`

    this._url.pathname = `${prefix}count/${this.resource}`

    return this.fetch<ApiCountResponse<T>>()
  }

  /**
   *
   */
  async sum(parameter: string): Promise<ApiSumResponse<T>> {
    const { api } = this.options
    const prefix = api === '' ? '' : `${api}/`

    this._url.pathname = `${prefix}sum/${this.resource};${String(parameter)}`

    return this.fetch<ApiSumResponse<T>>()
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
   * Do a simple fetch request without transforming the return value to json
   */
  async download(): Promise<Response> {
    //return this.fetch()
    try {
      const response = await fetch(this.url.toString(), this.requestInit)
      this.response = response

      return response
    } catch (err) {
      console.log(err)
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
   * Creates a new resource on the specified endpoint
   */
  async store<StoreT = T>(payload?: Payload): Promise<StoreT> {
    this.requestInit.method = 'POST'
    this.setPayload(payload)
    return this.fetch()
  }

  /**
   * Updates a single resource on the specified endpoint
   */
  async update(id: string, payload?: Payload): Promise<T> {
    this.url.pathname += `/${id}`
    this.requestInit.method = 'PUT'
    this.setPayload(payload)
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
  async fetch<T2 = T>(): Promise<T2> {
    try {
      // When the payload is a FormData object, the Content-Type header
      // should be set to `multipart/form-data`, and the browser will
      // automatically set that. Otherwise, we need to set it manually.
      if (!(this.requestInit.body instanceof FormData)) {
        this.requestInit.headers['Content-Type'] = 'application/json'
      }

      if (this.options.debug) {
        const message: string[] = []
        message.push('SENDING API-REQUEST:')
        message.push(`URL: ${this.url.toString()}`)
        message.push(`Method: ${this.requestInit.method}`)
        message.push(`Headers: ${JSON.stringify(this.requestInit.headers)}`)

        if (this.requestInit.body instanceof FormData) {
          // FormData objects are not easily logged
          const formData = this.requestInit.body
          const data = Object.fromEntries(
            Array.from(formData.keys()).map((key) => [
              key,
              formData.getAll(key).length > 1
                ? formData.getAll(key)
                : formData.get(key),
            ])
          )
          message.push(`Body: ${JSON.stringify(data)}`)
        } else if (this.requestInit.body != null) {
          message.push(`Body: ${this.requestInit.body.toString()}`)
        }

        console.log(message.join('\n'))
      }

      const response = await fetch(this.url.toString(), this.requestInit)

      if (this.options.debug) {
        const message: string[] = []
        message.push('RECEIVED API-RESPONSE:')
        message.push(`Request URL: ${this.url.toString()}`)
        message.push(`Status: ${response.status}`)
        message.push(`StatusText: ${response.statusText}`)
        message.push(`Headers: ${JSON.stringify(response.headers)}`)
        console.log(message.join('\n'))
      }

      this.response = response
      return this.handleResponse(response)
    } catch (err) {
      console.log(err)
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

        if (
          isApiErrorObject(json) ||
          isAnApiErrorObjectButWithErrorsPropertyMisspelled(json)
        ) {
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

/** Type guard for count */
export function isGroupedCount<T>(obj: unknown): obj is GroupedCount<T>[] {
  return (
    Array.isArray(obj) &&
    obj.every(
      (item) =>
        typeof item === 'object' &&
        typeof (item as GroupedCount<T>).count === 'string'
    )
  )
}

/** Type guard for sum */
export function isGroupedSum<T>(obj: unknown): obj is GroupedSum<T>[] {
  return (
    Array.isArray(obj) &&
    obj.every(
      (item) =>
        typeof item === 'object' &&
        typeof (item as GroupedSum<T>).sum === 'string'
    )
  )
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

function isAnApiErrorObjectButWithErrorsPropertyMisspelled(
  obj: unknown
): obj is InterzoneApiErrorObject {
  const isProbablyAnApiErrorObject =
    obj != null &&
    typeof obj === 'object' &&
    typeof (obj as ApiErrorObject).Code === 'number' &&
    typeof (obj as ApiErrorObject).Type === 'string' &&
    typeof (obj as ApiErrorObject).CombinedInfo === 'string'

  // Check if the "Errors" property name might be misspelled
  return (
    isProbablyAnApiErrorObject &&
    obj.hasOwnProperty('Error') &&
    !obj.hasOwnProperty('Errors')
  )
}
