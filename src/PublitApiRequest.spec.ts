import PublitApiRequest, {
  ApiListResponse,
  isApiRequestError,
} from './PublitApiRequest'
import fetch from 'jest-fetch-mock'

type Thing = {
  id: string
  isbn: {
    isbn: string
  }
  status: 'draft' | 'published'
}

describe('Request', () => {
  beforeEach(() => {
    PublitApiRequest.defaultOptions = {
      origin: 'https://api.publit.com',
      api: 'publishing/v2.0',
      headers: () => ({
        'Content-Type': 'application/json',
      }),
    }
    fetch.resetMocks()
  })

  describe('defaultOptions', () => {
    it('should allow setting `origin` option', () => {
      PublitApiRequest.defaultOptions.origin = 'https://test.publit.com'
      expect(new PublitApiRequest('endpoint').url.origin).toBe(
        'https://test.publit.com'
      )
    })

    it('should allow setting `api` option', () => {
      PublitApiRequest.defaultOptions.api = 'test/v3.5'
      expect(new PublitApiRequest('endpoint').url.pathname).toBe(
        '/test/v3.5/endpoint'
      )
    })

    it('should allow setting `headers` option', () => {
      PublitApiRequest.defaultOptions.headers = () => ({
        'X-Test': 'test',
        'X-Test2': 'test2',
      })
      expect(new PublitApiRequest('endpoint').requestInit.headers).toEqual({
        'X-Test': 'test',
        'X-Test2': 'test2',
      })
    })
  })

  describe('constructor', () => {
    it('should set `url` property', () => {
      expect(new PublitApiRequest('endpoint').url.toString()).toEqual(
        'https://api.publit.com/publishing/v2.0/endpoint'
      )
    })

    it('should set `requestInit` property', () => {
      expect(new PublitApiRequest('endpoint').requestInit).toEqual({
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
    })

    it('should allow overriding `origin` option', () => {
      expect(new PublitApiRequest('endpoint').url.origin).toBe(
        'https://api.publit.com'
      )
      expect(
        new PublitApiRequest('endpoint', {
          origin: 'http://api.example.com:1992',
        }).url.origin
      ).toBe('http://api.example.com:1992')
    })

    it('should allow overriding `api` option', () => {
      expect(new PublitApiRequest('endpoint').url.pathname).toBe(
        '/publishing/v2.0/endpoint'
      )
      expect(
        new PublitApiRequest('endpoint', {
          api: '',
        }).url.pathname
      ).toBe('/endpoint')
      expect(
        new PublitApiRequest('endpoint', {
          api: '2.0/foo/bar',
        }).url.pathname
      ).toBe('/2.0/foo/bar/endpoint')
    })

    it('should allow overriding `headers` option', () => {
      expect(
        new PublitApiRequest('endpoint', {
          headers: () => ({
            'X-Foo': 'bar',
          }),
        }).requestInit.headers
      ).toEqual({
        'X-Foo': 'bar',
      })
    })
  })

  describe('fromUrl()', () => {
    it('should create a request object from a URL', () => {
      const request = PublitApiRequest.fromUrl(
        'https://api.publit.com/endpoint'
      )
      expect(request).toBeInstanceOf(PublitApiRequest)
      expect(request.url.toString()).toBe('https://api.publit.com/endpoint')
    })
  })

  describe('limit()', () => {
    it('should set limit', () => {
      const r = new PublitApiRequest('endpoint').limit(10)
      expect(r.url.search).toBe('?limit=10')
    })
    it('should set limit and offset', () => {
      const r = new PublitApiRequest('endpoint').limit(10, 20)
      expect(r.url.search).toBe('?limit=20%2C10')
    })
    it('should overwrite existing limit', () => {
      const r = PublitApiRequest.fromUrl('https://example.com?limit=50')
      r.limit(10)
      expect(r.url.search).toBe('?limit=10')
    })
  })
  describe('with()', () => {
    it('should set single relation', () => {
      const r = new PublitApiRequest('endpoint').with('foo')
      expect(r.url.search).toBe('?with=foo')
    })
    it('should set multiple relations', () => {
      const r = new PublitApiRequest('endpoint')
        .with('foo')
        .with('bar')
        .with('baz')
      expect(r.url.search).toBe('?with=foo%2Cbar%2Cbaz')
    })
    it('should add to existing relations', () => {
      const r = PublitApiRequest.fromUrl(
        'https://example.com?with=foobar,bazoo'
      )
      r.with('foo').with('bar').with('baz')
      expect(r.url.search).toBe('?with=foobar%2Cbazoo%2Cfoo%2Cbar%2Cbaz')
    })
  })
  describe('scope()', () => {
    it('should set single scope', () => {
      const r = new PublitApiRequest('endpoint').scope('published')
      expect(r.url.search).toBe('?scope=published')
    })
    it('should set single scope with qualifier', () => {
      const r = new PublitApiRequest('endpoint').scope('status', 'published')
      expect(r.url.search).toBe('?scope=status%3Bpublished')
    })
    it('should set multiple scopes', () => {
      const r = new PublitApiRequest('endpoint').scope('published').scope('pod')
      expect(r.url.search).toBe('?scope=published%2Cpod')
    })
    it('should set multiple scopes with qualifiers', () => {
      const r = new PublitApiRequest('endpoint')
        .scope('status', 'published')
        .scope('type', 'pod')
      expect(r.url.search).toBe('?scope=status%3Bpublished%2Ctype%3Bpod')
    })
  })
  describe('has()', () => {
    it('should add an EQUAL relation filter', () => {
      const r = new PublitApiRequest<{ work: { title: string } }>(
        'endpoint'
      ).has('work', 'title', 'EQUAL', 'Röda Rummet', 'AND')
      expect(r.url.search).toBe(
        '?has=work%28title%3BEQUAL%3BR%C3%B6da+Rummet%29%3BAND'
      )
    })
    it('should add a LIKE relation filter', () => {
      const r = new PublitApiRequest<{ work: { title: string } }>(
        'endpoint'
      ).has('work', 'title', 'LIKE', 'Röda Rummet', 'AND')
      expect(r.url.search).toBe(
        '?has=work%28title%3BLIKE%3B%25R%C3%B6da+Rummet%25%29%3BAND'
      )
    })
    it('should add multiple relation filters', () => {
      const r = new PublitApiRequest<{
        work: { title: string; status: 'draft' | 'published' }
      }>('endpoint')
        .has('work', 'title', 'EQUAL', 'Röda Rummet', 'OR')
        .has('work', 'title', 'EQUAL', 'Blå Tåget', 'OR')
        .has('work', 'status', 'EQUAL', 'draft', 'OR')
      expect(r.url.search).toBe(
        '?has=work%28title%3BEQUAL%3BR%C3%B6da+Rummet%29%3BOR%2Cwork%28title%3BEQUAL%3BBl%C3%A5+T%C3%A5get%29%3BOR%2Cwork%28status%3BEQUAL%3Bdraft%29%3BOR'
      )
    })
    it('should add multiple filters if passed an array of values', () => {
      const r = new PublitApiRequest<{
        work: { title: string; status: 'draft' | 'published' }
      }>('endpoint')
        .has('work', 'title', 'EQUAL', [
          'Röda Rummet',
          'Blå Tåget',
          'Gröne Jägaren',
        ])
        .has('work', 'status', 'EQUAL', 'draft', 'OR')
      expect(r.url.search).toBe(
        '?has=work%28title%3BEQUAL%3BR%C3%B6da+Rummet%29%3BOR%2Cwork%28title%3BEQUAL%3BBl%C3%A5+T%C3%A5get%29%3BOR%2Cwork%28title%3BEQUAL%3BGr%C3%B6ne+J%C3%A4garen%29%3BOR%2Cwork%28status%3BEQUAL%3Bdraft%29%3BOR'
      )
    })
    it('should add a relation filter for an array relation', () => {
      const r = new PublitApiRequest<{ works: { title: string }[] }>(
        'endpoint'
      ).has('works', 'title', 'EQUAL', 'Röda Rummet')
      expect(r.url.search).toBe(
        '?has=works%28title%3BEQUAL%3BR%C3%B6da+Rummet%29%3BOR'
      )
    })
  })
  describe('groupBy()', () => {
    it('should set single groupBy', () => {
      const r = new PublitApiRequest<Thing>('endpoint').groupBy('status')
      expect(r.url.search).toBe('?group_by=status')
    })
    it('should set multiple groupBy', () => {
      const r = new PublitApiRequest<Thing>('endpoint')
        .groupBy('status')
        .groupBy('isbn')
      expect(r.url.search).toBe('?group_by=status%2Cisbn')
    })
  })
  describe('where()', () => {
    it('should add an EQUAL attribute filter', () => {
      const r = new PublitApiRequest<{ title: string }>('endpoint').where(
        'title',
        'EQUAL',
        'Röda Rummet',
        'AND'
      )
      expect(r.url.search).toBe(
        '?title=R%C3%B6da+Rummet&title_args=EQUAL%3BAND'
      )
    })
    it('should add a LIKE attribute filter', () => {
      const r = new PublitApiRequest<{ title: string }>('endpoint').where(
        'title',
        'LIKE',
        'Röda Rummet',
        'AND'
      )
      expect(r.url.search).toBe(
        '?title=%25R%C3%B6da+Rummet%25&title_args=LIKE%3BAND'
      )
    })
    it('should add multiple attribute filters', () => {
      const r = new PublitApiRequest<{ title: string; author: string }>(
        'endpoint'
      )
        .where('title', 'EQUAL', 'Röda Rummet', 'AND')
        .where('author', 'EQUAL', 'August', 'AND')
      expect(r.url.search).toBe(
        '?title=R%C3%B6da+Rummet&title_args=EQUAL%3BAND&author=August&author_args=EQUAL%3BAND'
      )
    })
    it('should add a LIKE filter with multiple values', () => {
      const r = new PublitApiRequest<{ title: string; author: string }>(
        'endpoint'
      ).where('title', 'LIKE', ['Röda Rummet', 'Blå Tåget'])
      expect(r.url.search).toBe(
        '?title=%25R%C3%B6da+Rummet%25%2C%25Bl%C3%A5+T%C3%A5get%25&title_args=LIKE%3BOR'
      )
    })
  })
  describe('auxiliary()', () => {
    it('should set an auxiliary attribute', () => {
      const r = new PublitApiRequest<{ extra: unknown }>('endpoint').auxiliary(
        'extra'
      )
      expect(r.url.search).toBe('?auxiliary=extra')
    })
    it('should set multiple auxiliary attributes', () => {
      const r = new PublitApiRequest<{ extra: unknown; more: unknown }>(
        'endpoint'
      )
        .auxiliary('extra')
        .auxiliary('more')
      expect(r.url.search).toBe('?auxiliary=extra%2Cmore')
    })
  })
  describe('orderBy()', () => {
    it('should set sort order', () => {
      const r = new PublitApiRequest<{ title: string }>('endpoint').orderBy(
        'title'
      )
      expect(r.url.search).toBe('?order_by=title')
    })
    it('should set sort order and direction', () => {
      const r = new PublitApiRequest<{ title: string }>('endpoint').orderBy(
        'title',
        'DESC'
      )
      expect(r.url.search).toBe('?order_by=title&order_dir=DESC')
    })
  })
  describe('index()', () => {
    it('should make a request', async () => {
      fetch.mockResponse(
        JSON.stringify({
          count: 0,
          data: [{ id: '123321' }],
        } as ApiListResponse<Thing>)
      )

      const request = await new PublitApiRequest<Thing>('things')
        .has('isbn', 'isbn', 'EQUAL', '9789186053512')
        .where('status', 'EQUAL', 'published')
        .with('work')
        .with('work.contributor_works')
        .with('work.contributor_works.contributor')
        .with('isbn')
        .with('thumbnail_files')
        .index()

      expect(request).toMatchObject({ count: 0, data: [{ id: '123321' }] })
      expect(fetch).toHaveBeenLastCalledWith(
        'https://api.publit.com/publishing/v2.0/things?has=isbn%28isbn%3BEQUAL%3B9789186053512%29%3BOR&status=published&status_args=EQUAL%3BOR&with=work%2Cwork.contributor_works%2Cwork.contributor_works.contributor%2Cisbn%2Cthumbnail_files',
        expect.objectContaining({
          method: 'GET',
        })
      )
    })
  })
  describe('show()', () => {
    it('should make a show request', async () => {
      fetch.mockResponse(JSON.stringify({ id: '123321' } as Thing))

      const request = await new PublitApiRequest<Thing>('things').show('123321')

      expect(request).toMatchObject({ id: '123321' })
      expect(fetch).toHaveBeenLastCalledWith(
        'https://api.publit.com/publishing/v2.0/things/123321',
        expect.objectContaining({
          method: 'GET',
        })
      )
    })
  })
  describe('store()', () => {
    it('should make a store request with object payload', async () => {
      fetch.mockResponse(JSON.stringify({ id: '123321' }))

      const request = await new PublitApiRequest<Thing>('things').store({
        hello: 'goodbye',
      })

      expect(request).toMatchObject({ id: '123321' })
      expect(fetch).toHaveBeenLastCalledWith(
        'https://api.publit.com/publishing/v2.0/things',
        expect.objectContaining({
          body: JSON.stringify({ hello: 'goodbye' }),
          method: 'POST',
        })
      )
    })

    it('should make a store request with form data payload', async () => {
      fetch.mockResponse(JSON.stringify({ id: '123321' }))

      const data = new FormData()
      data.append('hello', 'goodbye')

      const response = await new PublitApiRequest<Thing>('things').store(data)

      expect(response).toMatchObject({ id: '123321' })
      expect(fetch).toHaveBeenLastCalledWith(
        'https://api.publit.com/publishing/v2.0/things',
        expect.objectContaining({
          body: data,
          method: 'POST',
        })
      )
    })
  })
  describe('update()', () => {
    it('should make an update request', async () => {
      fetch.mockResponse(JSON.stringify({ id: '123321' }))

      const request = await new PublitApiRequest<Thing>('things').update(
        '123321',
        {
          hello: 'goodbye',
        }
      )

      expect(request).toMatchObject({ id: '123321' })
      expect(fetch).toHaveBeenLastCalledWith(
        'https://api.publit.com/publishing/v2.0/things/123321',
        expect.objectContaining({
          body: JSON.stringify({ hello: 'goodbye' }),
          method: 'PUT',
        })
      )
    })

    it('should make an update request with form data payload', async () => {
      fetch.mockResponse(JSON.stringify({ id: '123321' }))

      const data = new FormData()
      data.append('hello', 'goodbye')

      const response = await new PublitApiRequest<Thing>('things').update(
        '123321',
        data
      )

      expect(response).toMatchObject({ id: '123321' })
      expect(fetch).toHaveBeenLastCalledWith(
        'https://api.publit.com/publishing/v2.0/things/123321',
        expect.objectContaining({
          body: data,
          method: 'PUT',
        })
      )
    })
  })
  describe('delete()', () => {
    it('should make a delete request', async () => {
      fetch.mockResponse(JSON.stringify({ id: '123321' }))

      const request = await new PublitApiRequest<Thing>('things').delete(
        '123321'
      )

      expect(request).toMatchObject({ id: '123321' })
      expect(fetch).toHaveBeenLastCalledWith(
        'https://api.publit.com/publishing/v2.0/things/123321',
        expect.objectContaining({
          method: 'DELETE',
        })
      )
    })
  })

  it('should allow changing RequestInit before fetching', async () => {
    fetch.mockResponse('{}')

    const request = new PublitApiRequest<Thing>('things')

    request.requestInit.headers = {
      'X-Custom-Header': 'custom-value',
    }

    await request.index()

    expect(fetch).toHaveBeenLastCalledWith(
      'https://api.publit.com/publishing/v2.0/things',
      expect.objectContaining({
        method: 'GET',
        headers: {
          'X-Custom-Header': 'custom-value',
        },
      })
    )
  })

  describe('error handling', () => {
    const handleError = jest.fn()

    it('should throw error on 401 response', async () => {
      fetch.mockResponse('Invalid credentials.', { status: 401 })

      // Tell jest we expect one assertion, or else it will fail
      expect.assertions(2)

      try {
        await new PublitApiRequest<Thing>('resource', {
          onError: handleError,
        }).index()
      } catch (e) {
        expect(e).toEqual({
          status: 401,
          message: 'Unauthorized',
        })
      }

      expect(handleError).toHaveBeenCalledWith({
        status: 401,
        message: 'Unauthorized',
      })
    })

    it('should throw error when server returns json', async () => {
      fetch.mockResponse(
        JSON.stringify({
          Code: 404,
          Type: 'NotFound',
          Errors: [
            {
              Info: 'BaseResourceController (950) Object with id: 3730 not found',
              Type: 'NotFound',
            },
          ],
          CombinedInfo:
            'BaseResourceController (950) Object with id: 3730 not found',
        }),
        { status: 404 }
      )

      // Tell jest we expect one assertion, or else it will fail
      expect.assertions(2)

      try {
        await new PublitApiRequest<Thing>('resource', {
          onError: handleError,
        }).index()
      } catch (e) {
        expect(e).toEqual({
          status: 404,
          type: 'NotFound',
          message:
            'BaseResourceController (950) Object with id: 3730 not found',
        })
      }

      expect(handleError).toHaveBeenCalledWith({
        status: 404,
        type: 'NotFound',
        message: 'BaseResourceController (950) Object with id: 3730 not found',
      })
    })

    it('should throw error when server returns html', async () => {
      fetch.mockResponse('<!DOCTYPE html>', { status: 404 })

      // Tell jest we expect one assertion, or else it will fail
      expect.assertions(2)

      try {
        await new PublitApiRequest<Thing>('resource', {
          onError: handleError,
        }).index()
      } catch (e) {
        expect(e).toEqual({
          status: 404,
          message: 'Not Found',
        })
      }

      expect(handleError).toHaveBeenCalledWith({
        status: 404,
        message: 'Not Found',
      })
    })

    it('should throw error when server returns nothing', async () => {
      fetch.mockResponse('', { status: 500 })

      // Tell jest we expect one assertion, or else it will fail
      expect.assertions(2)

      try {
        await new PublitApiRequest<Thing>('resource', {
          onError: handleError,
        }).index()
      } catch (e) {
        expect(e).toEqual({
          status: 500,
          message: 'Internal Server Error',
        })
      }

      expect(handleError).toHaveBeenCalledWith({
        status: 500,
        message: 'Internal Server Error',
      })
    })

    it('should throw error when request fails', async () => {
      fetch.mockReject()

      // Tell jest we expect one assertion, or else it will fail
      expect.assertions(2)

      try {
        await new PublitApiRequest<Thing>('resource', {
          onError: handleError,
        }).index()
      } catch (e) {
        expect(e).toEqual({
          message: 'Request failed',
        })
      }

      expect(handleError).toHaveBeenCalledWith({
        message: 'Request failed',
      })
    })
  })
})

describe('isApiRequestError()', () => {
  it('should determine if object is an api request error', () => {
    expect(
      isApiRequestError({
        status: 500,
        type: 'type',
        message: 'message',
      })
    ).toBe(true)
    expect(
      isApiRequestError({
        status: 500,
        message: 'message',
      })
    ).toBe(true)
    expect(
      isApiRequestError({
        message: 'message',
      })
    ).toBe(false)
    expect(
      isApiRequestError({
        status: 'status',
      })
    ).toBe(false)
  })
})
