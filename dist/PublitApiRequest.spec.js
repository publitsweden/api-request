"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const PublitApiRequest_1 = __importStar(require("./PublitApiRequest"));
const jest_fetch_mock_1 = __importDefault(require("jest-fetch-mock"));
describe('Request', () => {
    beforeEach(() => {
        PublitApiRequest_1.default.defaultOptions = {
            origin: 'https://api.publit.com',
            api: 'publishing/v2.0',
            headers: () => ({}),
        };
        jest_fetch_mock_1.default.resetMocks();
    });
    describe('defaultOptions', () => {
        it('should allow setting `origin` option', () => {
            PublitApiRequest_1.default.defaultOptions.origin = 'https://test.publit.com';
            expect(new PublitApiRequest_1.default('endpoint').url.origin).toBe('https://test.publit.com');
        });
        it('should allow setting `api` option', () => {
            PublitApiRequest_1.default.defaultOptions.api = 'test/v3.5';
            expect(new PublitApiRequest_1.default('endpoint').url.pathname).toBe('/test/v3.5/endpoint');
        });
        it('should allow setting `headers` option', () => {
            PublitApiRequest_1.default.defaultOptions.headers = () => ({
                'X-Test': 'test',
                'X-Test2': 'test2',
            });
            expect(new PublitApiRequest_1.default('endpoint').requestInit.headers).toEqual({
                'X-Test': 'test',
                'X-Test2': 'test2',
            });
        });
    });
    describe('constructor', () => {
        it('should set `url` property', () => {
            expect(new PublitApiRequest_1.default('endpoint').url.toString()).toEqual('https://api.publit.com/publishing/v2.0/endpoint');
        });
        it('should set `requestInit` property', () => {
            expect(new PublitApiRequest_1.default('endpoint').requestInit).toEqual({
                method: 'GET',
                headers: {},
            });
        });
        it('should allow overriding `origin` option', () => {
            expect(new PublitApiRequest_1.default('endpoint').url.origin).toBe('https://api.publit.com');
            expect(new PublitApiRequest_1.default('endpoint', {
                origin: 'http://api.example.com:1992',
            }).url.origin).toBe('http://api.example.com:1992');
        });
        it('should allow overriding `api` option', () => {
            expect(new PublitApiRequest_1.default('endpoint').url.pathname).toBe('/publishing/v2.0/endpoint');
            expect(new PublitApiRequest_1.default('endpoint', {
                api: '',
            }).url.pathname).toBe('/endpoint');
            expect(new PublitApiRequest_1.default('endpoint', {
                api: '2.0/foo/bar',
            }).url.pathname).toBe('/2.0/foo/bar/endpoint');
        });
        it('should allow overriding `headers` option', () => {
            expect(new PublitApiRequest_1.default('endpoint', {
                headers: () => ({
                    'X-Foo': 'bar',
                }),
            }).requestInit.headers).toEqual({
                'X-Foo': 'bar',
            });
        });
    });
    describe('fromUrl()', () => {
        it('should create a request object from a URL', () => {
            const request = PublitApiRequest_1.default.fromUrl('https://api.publit.com/endpoint');
            expect(request).toBeInstanceOf(PublitApiRequest_1.default);
            expect(request.url.toString()).toBe('https://api.publit.com/endpoint');
        });
    });
    describe('limit()', () => {
        it('should set limit', () => {
            const r = new PublitApiRequest_1.default('endpoint').limit(10);
            expect(r.url.search).toBe('?limit=10');
        });
        it('should set limit and offset', () => {
            const r = new PublitApiRequest_1.default('endpoint').limit(10, 20);
            expect(r.url.search).toBe('?limit=20%2C10');
        });
        it('should overwrite existing limit', () => {
            const r = PublitApiRequest_1.default.fromUrl('https://example.com?limit=50');
            r.limit(10);
            expect(r.url.search).toBe('?limit=10');
        });
    });
    describe('with()', () => {
        it('should set single relation', () => {
            const r = new PublitApiRequest_1.default('endpoint').with('foo');
            expect(r.url.search).toBe('?with=foo');
        });
        it('should set multiple relations', () => {
            const r = new PublitApiRequest_1.default('endpoint')
                .with('foo')
                .with('bar')
                .with('baz');
            expect(r.url.search).toBe('?with=foo%2Cbar%2Cbaz');
        });
        it('should add to existing relations', () => {
            const r = PublitApiRequest_1.default.fromUrl('https://example.com?with=foobar,bazoo');
            r.with('foo').with('bar').with('baz');
            expect(r.url.search).toBe('?with=foobar%2Cbazoo%2Cfoo%2Cbar%2Cbaz');
        });
    });
    describe('scope()', () => {
        it('should set single scope', () => {
            const r = new PublitApiRequest_1.default('endpoint').scope('published');
            expect(r.url.search).toBe('?scope=published');
        });
        it('should set single scope with qualifier', () => {
            const r = new PublitApiRequest_1.default('endpoint').scope('status', 'published');
            expect(r.url.search).toBe('?scope=status%3Bpublished');
        });
        it('should set multiple scopes', () => {
            const r = new PublitApiRequest_1.default('endpoint').scope('published').scope('pod');
            expect(r.url.search).toBe('?scope=published%2Cpod');
        });
        it('should set multiple scopes with qualifiers', () => {
            const r = new PublitApiRequest_1.default('endpoint')
                .scope('status', 'published')
                .scope('type', 'pod');
            expect(r.url.search).toBe('?scope=status%3Bpublished%2Ctype%3Bpod');
        });
    });
    describe('has()', () => {
        it('should add an EQUAL relation filter', () => {
            const r = new PublitApiRequest_1.default('endpoint').has('work', 'title', 'EQUAL', 'Röda Rummet', 'AND');
            expect(r.url.search).toBe('?has=work%28title%3BEQUAL%3BR%C3%B6da+Rummet%29%3BAND');
        });
        it('should add a LIKE relation filter', () => {
            const r = new PublitApiRequest_1.default('endpoint').has('work', 'title', 'LIKE', 'Röda Rummet', 'AND');
            expect(r.url.search).toBe('?has=work%28title%3BLIKE%3B%25R%C3%B6da+Rummet%25%29%3BAND');
        });
        it('should add multiple relation filters', () => {
            const r = new PublitApiRequest_1.default('endpoint')
                .has('work', 'title', 'EQUAL', 'Röda Rummet', 'OR')
                .has('work', 'title', 'EQUAL', 'Blå Tåget', 'OR')
                .has('work', 'status', 'EQUAL', 'draft', 'OR');
            expect(r.url.search).toBe('?has=work%28title%3BEQUAL%3BR%C3%B6da+Rummet%29%3BOR%2Cwork%28title%3BEQUAL%3BBl%C3%A5+T%C3%A5get%29%3BOR%2Cwork%28status%3BEQUAL%3Bdraft%29%3BOR');
        });
        it('should add multiple filters if passed an array of values', () => {
            const r = new PublitApiRequest_1.default('endpoint')
                .has('work', 'title', 'EQUAL', [
                'Röda Rummet',
                'Blå Tåget',
                'Gröne Jägaren',
            ])
                .has('work', 'status', 'EQUAL', 'draft', 'OR');
            expect(r.url.search).toBe('?has=work%28title%3BEQUAL%3BR%C3%B6da+Rummet%29%3BOR%2Cwork%28title%3BEQUAL%3BBl%C3%A5+T%C3%A5get%29%3BOR%2Cwork%28title%3BEQUAL%3BGr%C3%B6ne+J%C3%A4garen%29%3BOR%2Cwork%28status%3BEQUAL%3Bdraft%29%3BOR');
        });
        it('should add a relation filter for an array relation', () => {
            const r = new PublitApiRequest_1.default('endpoint').has('works', 'title', 'EQUAL', 'Röda Rummet');
            expect(r.url.search).toBe('?has=works%28title%3BEQUAL%3BR%C3%B6da+Rummet%29%3BOR');
        });
        it('should add relation filter with no value', () => {
            const r = new PublitApiRequest_1.default('endpoint').has('work');
            expect(r.url.search).toBe('?has=work');
        });
        it('should add relation filter with no value and another relation with value', () => {
            const r = new PublitApiRequest_1.default('endpoint')
                .has('isbn')
                .has('work', 'title', 'EQUAL', 'Röda Rummet');
            expect(r.url.search).toBe('?has=isbn%2Cwork%28title%3BEQUAL%3BR%C3%B6da+Rummet%29%3BOR');
        });
    });
    describe('groupBy()', () => {
        it('should set single groupBy', () => {
            const r = new PublitApiRequest_1.default('endpoint').groupBy('status');
            expect(r.url.search).toBe('?group_by=status');
        });
        it('should set multiple groupBy', () => {
            const r = new PublitApiRequest_1.default('endpoint')
                .groupBy('status')
                .groupBy('isbn');
            expect(r.url.search).toBe('?group_by=status%2Cisbn');
        });
    });
    describe('where()', () => {
        it('should add an EQUAL attribute filter', () => {
            const r = new PublitApiRequest_1.default('endpoint').where('title', 'EQUAL', 'Röda Rummet', 'AND');
            expect(r.url.search).toBe('?title=R%C3%B6da+Rummet&title_args=EQUAL%3BAND');
        });
        it('should add a LIKE attribute filter', () => {
            const r = new PublitApiRequest_1.default('endpoint').where('title', 'LIKE', 'Röda Rummet', 'AND');
            expect(r.url.search).toBe('?title=%25R%C3%B6da+Rummet%25&title_args=LIKE%3BAND');
        });
        it('should add multiple attribute filters', () => {
            const r = new PublitApiRequest_1.default('endpoint')
                .where('title', 'EQUAL', 'Röda Rummet', 'AND')
                .where('author', 'EQUAL', 'August', 'AND');
            expect(r.url.search).toBe('?title=R%C3%B6da+Rummet&title_args=EQUAL%3BAND&author=August&author_args=EQUAL%3BAND');
        });
        it('should add a LIKE filter with multiple values', () => {
            const r = new PublitApiRequest_1.default('endpoint').where('title', 'LIKE', ['Röda Rummet', 'Blå Tåget']);
            expect(r.url.search).toBe('?title=%25R%C3%B6da+Rummet%25%2C%25Bl%C3%A5+T%C3%A5get%25&title_args=LIKE%3BOR');
        });
        it('should add multiple values for same attribute', () => {
            const r = new PublitApiRequest_1.default('endpoint')
                .where('created_at', 'GREATER_EQUAL', '2020-01-01', 'AND')
                .where('created_at', 'LESS_EQUAL', '2020-01-31', 'AND');
            expect(r.url.search).toBe('?created_at=2020-01-01%2C2020-01-31&created_at_args=GREATER_EQUAL%3BAND%2CLESS_EQUAL%3BAND');
        });
    });
    describe('auxiliary()', () => {
        it('should set an auxiliary attribute', () => {
            const r = new PublitApiRequest_1.default('endpoint').auxiliary('extra');
            expect(r.url.search).toBe('?auxiliary=extra');
        });
        it('should set multiple auxiliary attributes', () => {
            const r = new PublitApiRequest_1.default('endpoint')
                .auxiliary('extra')
                .auxiliary('more');
            expect(r.url.search).toBe('?auxiliary=extra%2Cmore');
        });
    });
    describe('orderBy()', () => {
        it('should set sort order', () => {
            const r = new PublitApiRequest_1.default('endpoint').orderBy('title');
            expect(r.url.search).toBe('?order_by=title');
        });
        it('should set sort order and direction', () => {
            const r = new PublitApiRequest_1.default('endpoint').orderBy('title', 'DESC');
            expect(r.url.search).toBe('?order_by=title&order_dir=DESC');
        });
    });
    describe('index()', () => {
        it('should make a request', () => __awaiter(void 0, void 0, void 0, function* () {
            jest_fetch_mock_1.default.mockResponse(JSON.stringify({
                count: 0,
                data: [{ id: '123321' }],
            }));
            const request = yield new PublitApiRequest_1.default('things')
                .has('isbn', 'isbn', 'EQUAL', '9789186053512')
                .where('status', 'EQUAL', 'published')
                .with('work')
                .with('work.contributor_works')
                .with('work.contributor_works.contributor')
                .with('isbn')
                .with('thumbnail_files')
                .index();
            expect(request).toMatchObject({ count: 0, data: [{ id: '123321' }] });
            expect(jest_fetch_mock_1.default).toHaveBeenLastCalledWith('https://api.publit.com/publishing/v2.0/things?has=isbn%28isbn%3BEQUAL%3B9789186053512%29%3BOR&status=published&status_args=EQUAL%3BOR&with=work%2Cwork.contributor_works%2Cwork.contributor_works.contributor%2Cisbn%2Cthumbnail_files', expect.objectContaining({
                method: 'GET',
            }));
        }));
    });
    describe('count()', () => {
        it('should make a request', () => __awaiter(void 0, void 0, void 0, function* () {
            jest_fetch_mock_1.default.mockResponse(JSON.stringify({
                count: 5,
            }));
            const request = yield new PublitApiRequest_1.default('things').count();
            expect(request).toMatchObject({ count: 5 });
            expect(jest_fetch_mock_1.default).toHaveBeenLastCalledWith('https://api.publit.com/publishing/v2.0/count/things', expect.objectContaining({
                method: 'GET',
            }));
        }));
        it('should make a request with groupBy', () => __awaiter(void 0, void 0, void 0, function* () {
            jest_fetch_mock_1.default.mockResponse(JSON.stringify({
                count: [
                    {
                        status: 'published',
                        count: '20',
                    },
                    {
                        status: 'draft',
                        count: '63',
                    },
                ],
            }));
            const response = yield new PublitApiRequest_1.default('things')
                .groupBy('status')
                .count();
            expect(response).toMatchObject({
                count: [
                    {
                        status: 'published',
                        count: '20',
                    },
                    {
                        status: 'draft',
                        count: '63',
                    },
                ],
            });
            expect(jest_fetch_mock_1.default).toHaveBeenLastCalledWith('https://api.publit.com/publishing/v2.0/count/things?group_by=status', expect.objectContaining({
                method: 'GET',
            }));
        }));
    });
    describe('show()', () => {
        it('should make a show request', () => __awaiter(void 0, void 0, void 0, function* () {
            jest_fetch_mock_1.default.mockResponse(JSON.stringify({ id: '123321' }));
            const request = yield new PublitApiRequest_1.default('things').show('123321');
            expect(request).toMatchObject({ id: '123321' });
            expect(jest_fetch_mock_1.default).toHaveBeenLastCalledWith('https://api.publit.com/publishing/v2.0/things/123321', expect.objectContaining({
                method: 'GET',
            }));
        }));
    });
    describe('store()', () => {
        it('should make a store request with object payload', () => __awaiter(void 0, void 0, void 0, function* () {
            jest_fetch_mock_1.default.mockResponse(JSON.stringify({ id: '123321' }));
            const request = yield new PublitApiRequest_1.default('things').store({
                hello: 'goodbye',
            });
            expect(request).toMatchObject({ id: '123321' });
            expect(jest_fetch_mock_1.default).toHaveBeenLastCalledWith('https://api.publit.com/publishing/v2.0/things', expect.objectContaining({
                body: JSON.stringify({ hello: 'goodbye' }),
                method: 'POST',
            }));
        }));
        it('should make a store request with array payload', () => __awaiter(void 0, void 0, void 0, function* () {
            jest_fetch_mock_1.default.mockResponse(JSON.stringify({ id: '123321' }));
            const request = yield new PublitApiRequest_1.default('things').store([
                {
                    hello: 'goodbye',
                },
                { goodbye: 'hello' },
            ]);
            expect(request).toMatchObject({ id: '123321' });
            expect(jest_fetch_mock_1.default).toHaveBeenLastCalledWith('https://api.publit.com/publishing/v2.0/things', expect.objectContaining({
                body: JSON.stringify([
                    {
                        hello: 'goodbye',
                    },
                    { goodbye: 'hello' },
                ]),
                method: 'POST',
            }));
        }));
        it('should make a store request with form data payload', () => __awaiter(void 0, void 0, void 0, function* () {
            jest_fetch_mock_1.default.mockResponse(JSON.stringify({ id: '123321' }));
            const data = new FormData();
            data.append('hello', 'goodbye');
            const response = yield new PublitApiRequest_1.default('things').store(data);
            expect(response).toMatchObject({ id: '123321' });
            expect(jest_fetch_mock_1.default).toHaveBeenLastCalledWith('https://api.publit.com/publishing/v2.0/things', expect.objectContaining({
                body: data,
                method: 'POST',
            }));
        }));
    });
    describe('update()', () => {
        it('should make an update request', () => __awaiter(void 0, void 0, void 0, function* () {
            jest_fetch_mock_1.default.mockResponse(JSON.stringify({ id: '123321' }));
            const request = yield new PublitApiRequest_1.default('things').update('123321', {
                hello: 'goodbye',
            });
            expect(request).toMatchObject({ id: '123321' });
            expect(jest_fetch_mock_1.default).toHaveBeenLastCalledWith('https://api.publit.com/publishing/v2.0/things/123321', expect.objectContaining({
                body: JSON.stringify({ hello: 'goodbye' }),
                method: 'PUT',
            }));
        }));
        it('should make an update request with form data payload', () => __awaiter(void 0, void 0, void 0, function* () {
            jest_fetch_mock_1.default.mockResponse(JSON.stringify({ id: '123321' }));
            const data = new FormData();
            data.append('hello', 'goodbye');
            const response = yield new PublitApiRequest_1.default('things').update('123321', data);
            expect(response).toMatchObject({ id: '123321' });
            expect(jest_fetch_mock_1.default).toHaveBeenLastCalledWith('https://api.publit.com/publishing/v2.0/things/123321', expect.objectContaining({
                body: data,
                method: 'PUT',
            }));
        }));
    });
    describe('delete()', () => {
        it('should make a delete request', () => __awaiter(void 0, void 0, void 0, function* () {
            jest_fetch_mock_1.default.mockResponse(JSON.stringify({ id: '123321' }));
            const request = yield new PublitApiRequest_1.default('things').delete('123321');
            expect(request).toMatchObject({ id: '123321' });
            expect(jest_fetch_mock_1.default).toHaveBeenLastCalledWith('https://api.publit.com/publishing/v2.0/things/123321', expect.objectContaining({
                method: 'DELETE',
            }));
        }));
    });
    describe('only()', () => {
        it('should add only query parameter', () => __awaiter(void 0, void 0, void 0, function* () {
            jest_fetch_mock_1.default.mockResponse(JSON.stringify({ id: '123321' }));
            const request = yield new PublitApiRequest_1.default('things')
                .only('id')
                .show('123321');
            expect(request).toMatchObject({ id: '123321' });
            expect(jest_fetch_mock_1.default).toHaveBeenLastCalledWith('https://api.publit.com/publishing/v2.0/things/123321?only=id', expect.objectContaining({
                method: 'GET',
            }));
        }));
        it('should add multiple only query parameters in separate calls', () => __awaiter(void 0, void 0, void 0, function* () {
            jest_fetch_mock_1.default.mockResponse(JSON.stringify({ id: '123321' }));
            const request = yield new PublitApiRequest_1.default('things')
                .only('id')
                .only('status')
                .show('123321');
            expect(request).toMatchObject({ id: '123321' });
            expect(jest_fetch_mock_1.default).toHaveBeenLastCalledWith('https://api.publit.com/publishing/v2.0/things/123321?only=id%2Cstatus', expect.objectContaining({
                method: 'GET',
            }));
        }));
        it('should add multiple only query parameters in one call', () => __awaiter(void 0, void 0, void 0, function* () {
            jest_fetch_mock_1.default.mockResponse(JSON.stringify({ id: '123321' }));
            const request = yield new PublitApiRequest_1.default('things')
                .only('id', 'status')
                .show('123321');
            expect(request).toMatchObject({ id: '123321' });
            expect(jest_fetch_mock_1.default).toHaveBeenLastCalledWith('https://api.publit.com/publishing/v2.0/things/123321?only=id%2Cstatus', expect.objectContaining({
                method: 'GET',
            }));
        }));
    });
    it('should allow changing RequestInit before fetching', () => __awaiter(void 0, void 0, void 0, function* () {
        jest_fetch_mock_1.default.mockResponse('{}');
        const request = new PublitApiRequest_1.default('things');
        request.requestInit.headers = {
            'X-Custom-Header': 'custom-value',
        };
        yield request.index();
        expect(jest_fetch_mock_1.default).toHaveBeenLastCalledWith('https://api.publit.com/publishing/v2.0/things', expect.objectContaining({
            method: 'GET',
            headers: expect.objectContaining({
                'X-Custom-Header': 'custom-value',
            }),
        }));
    }));
    describe('fetch()', () => {
        it('should set correct content-type with object payload', () => __awaiter(void 0, void 0, void 0, function* () {
            jest_fetch_mock_1.default.mockResponse('{}');
            const request = new PublitApiRequest_1.default('things');
            request.setPayload({ hello: 'world' });
            yield request.store();
            expect(jest_fetch_mock_1.default).toHaveBeenLastCalledWith('https://api.publit.com/publishing/v2.0/things', expect.objectContaining({
                headers: expect.objectContaining({
                    'Content-Type': 'application/json',
                }),
            }));
        }));
        it('should set correct content-type with FormData payload', () => __awaiter(void 0, void 0, void 0, function* () {
            jest_fetch_mock_1.default.mockResponse('{}');
            const request = new PublitApiRequest_1.default('things');
            const payload = new FormData();
            payload.append('hello', 'world');
            request.setPayload(payload);
            yield request.store();
            expect(jest_fetch_mock_1.default).toHaveBeenLastCalledWith('https://api.publit.com/publishing/v2.0/things', expect.objectContaining({
                headers: {},
            }));
        }));
        it('should set correct content-type with no payload', () => __awaiter(void 0, void 0, void 0, function* () {
            jest_fetch_mock_1.default.mockResponse('{}');
            const request = new PublitApiRequest_1.default('things');
            yield request.store();
            expect(jest_fetch_mock_1.default).toHaveBeenLastCalledWith('https://api.publit.com/publishing/v2.0/things', expect.objectContaining({
                headers: expect.objectContaining({
                    'Content-Type': 'application/json',
                }),
            }));
        }));
    });
    describe('error handling', () => {
        const handleError = jest.fn();
        it('should throw error on 401 response', () => __awaiter(void 0, void 0, void 0, function* () {
            jest_fetch_mock_1.default.mockResponse('Invalid credentials.', { status: 401 });
            // Tell jest we expect one assertion, or else it will fail
            expect.assertions(2);
            try {
                yield new PublitApiRequest_1.default('resource', {
                    onError: handleError,
                }).index();
            }
            catch (e) {
                expect(e).toEqual({
                    status: 401,
                    message: 'Unauthorized',
                });
            }
            expect(handleError).toHaveBeenCalledWith({
                status: 401,
                message: 'Unauthorized',
            });
        }));
        it('should throw error when server returns json', () => __awaiter(void 0, void 0, void 0, function* () {
            jest_fetch_mock_1.default.mockResponse(JSON.stringify({
                Code: 404,
                Type: 'NotFound',
                Errors: [
                    {
                        Info: 'BaseResourceController (950) Object with id: 3730 not found',
                        Type: 'NotFound',
                    },
                ],
                CombinedInfo: 'BaseResourceController (950) Object with id: 3730 not found',
            }), { status: 404 });
            // Tell jest we expect one assertion, or else it will fail
            expect.assertions(2);
            try {
                yield new PublitApiRequest_1.default('resource', {
                    onError: handleError,
                }).index();
            }
            catch (e) {
                expect(e).toEqual({
                    status: 404,
                    type: 'NotFound',
                    message: 'BaseResourceController (950) Object with id: 3730 not found',
                });
            }
            expect(handleError).toHaveBeenCalledWith({
                status: 404,
                type: 'NotFound',
                message: 'BaseResourceController (950) Object with id: 3730 not found',
            });
        }));
        it('should throw error when server returns html', () => __awaiter(void 0, void 0, void 0, function* () {
            jest_fetch_mock_1.default.mockResponse('<!DOCTYPE html>', { status: 404 });
            // Tell jest we expect one assertion, or else it will fail
            expect.assertions(2);
            try {
                yield new PublitApiRequest_1.default('resource', {
                    onError: handleError,
                }).index();
            }
            catch (e) {
                expect(e).toEqual({
                    status: 404,
                    message: 'Not Found',
                });
            }
            expect(handleError).toHaveBeenCalledWith({
                status: 404,
                message: 'Not Found',
            });
        }));
        it('should throw error when server returns nothing', () => __awaiter(void 0, void 0, void 0, function* () {
            jest_fetch_mock_1.default.mockResponse('', { status: 500 });
            // Tell jest we expect one assertion, or else it will fail
            expect.assertions(2);
            try {
                yield new PublitApiRequest_1.default('resource', {
                    onError: handleError,
                }).index();
            }
            catch (e) {
                expect(e).toEqual({
                    status: 500,
                    message: 'Internal Server Error',
                });
            }
            expect(handleError).toHaveBeenCalledWith({
                status: 500,
                message: 'Internal Server Error',
            });
        }));
        it('should throw error when request fails', () => __awaiter(void 0, void 0, void 0, function* () {
            jest_fetch_mock_1.default.mockReject();
            // Tell jest we expect one assertion, or else it will fail
            expect.assertions(2);
            try {
                yield new PublitApiRequest_1.default('resource', {
                    onError: handleError,
                }).index();
            }
            catch (e) {
                expect(e).toEqual({
                    message: 'Request failed',
                });
            }
            expect(handleError).toHaveBeenCalledWith({
                message: 'Request failed',
            });
        }));
    });
});
describe('isApiRequestError()', () => {
    it('should determine if object is an api request error', () => {
        expect((0, PublitApiRequest_1.isApiRequestError)({
            status: 500,
            type: 'type',
            message: 'message',
        })).toBe(true);
        expect((0, PublitApiRequest_1.isApiRequestError)({
            status: 500,
            message: 'message',
        })).toBe(true);
        expect((0, PublitApiRequest_1.isApiRequestError)({
            message: 'message',
        })).toBe(false);
        expect((0, PublitApiRequest_1.isApiRequestError)({
            status: 'status',
        })).toBe(false);
    });
});
