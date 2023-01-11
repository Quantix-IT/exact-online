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
  divisions: [
    {
      name: 'PROD',
      code: '1234567',
    },
    {
      name: 'TEST',
      code: '7654321',
    },
  ],
})

await exact.initialize()
```

of using import:

```javascript
import { Exact } from '@quantix-ict/exact-online'

const exact = new Exact({
  clientId: 'CLIENT_ID',
  clientSecret: 'CLIENT_SECRET',
  redirectUri: 'https://example.com/exact-online/connect',
  divisions: [
    {
      name: 'PROD',
      code: '1234567',
    },
    {
      name: 'TEST',
      code: '7654321',
    },
  ],
})

await exact.initialize()
```