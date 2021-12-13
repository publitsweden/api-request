import 'whatwg-fetch'
import fetchMock from 'jest-fetch-mock'

fetchMock.enableMocks()

const globalAny: any = global

globalAny.ResizeObserver = class {
  observe() {
    /* */
  }
  unobserve() {
    /* */
  }
}
