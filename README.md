## Exact online client by Quantix

A library to use the exact online API.

### Installation and Usage

Installation:

```console
npm i @quantix-ict/exact-online
```

Usage:

```javascript
const { Exact } = require('@quantix-ict/exact-online')

const exact = new Exact({
  clientId: 'CLIENT_ID',
  clientSecret: 'CLIENT_SECRET',
  redirectUri: 'https://example.com/exact-online/connect',
})

await exact.initialize()

const data = await exact.request({
  endpoint: '/project/Projects',
  params: {
    $filter: 'Type eq 1',
  },
  method: 'GET', // optional, uses 'GET' by default
  division: '1234567', // optional, uses current division by default
})
```

of using import:

```javascript
import { Exact } from '@quantix-ict/exact-online'

const exact = new Exact({
  clientId: 'CLIENT_ID',
  clientSecret: 'CLIENT_SECRET',
  redirectUri: 'https://example.com/exact-online/connect',
})

await exact.initialize()

const data = await exact.request({
  endpoint: '/project/Projects',
  params: {
    $filter: 'Type eq 1',
  },
  method: 'GET', // optional, uses 'GET' by default
  division: '1234567', // optional, uses current division by default
})
```

### Connecting to exact online

1. Get the login url:

```javascript
const loginUrl = exact.getLoginUrl({
  responseType: 'code', // optional, 'code' by default
  forceLogin: true, // optional, false by default
})
```

2. Redirect the user to the loginUrl.

3. User performs login in exact environment. And gets redirected to redirectUri (https://example.com/exact/connect?code=ascjen4)

4. Send code from URL Params to the backend.

5. Call connect with the code on the backend.

```javascript
const connected = await exact.connect(code)
```

### Exact online API documentation

You can find the Exact online API documentation [here](https://start.exactonline.nl/docs/HlpRestAPIResources.aspx).

More information about the API can be found [here](https://support.exactonline.com/community/s/knowledge-base#All-All-DNO-Content-restrefdocs).
