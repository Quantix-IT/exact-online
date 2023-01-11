import os from 'node:os'
import fs from 'node:fs'
import path from 'node:path'
import sleep from './utils/sleep'

const BASE_URL = 'https://start.exactonline.nl/api/v1/'

export class Exact {
  clientId: string
  clientSecret: string
  redirectUri: string

  connected: boolean
  inUse: boolean
  refreshing: boolean

  currentDivision: string | null

  constructor({
    clientId,
    clientSecret,
    redirectUri,
  }: {
    clientId: string
    clientSecret: string
    redirectUri: string
  }) {
    if (!clientId) throw new Error('EXACT: Please provide a clientId.')
    if (!clientSecret) throw new Error('EXACT: Please provide a clientSecret.')
    if (!redirectUri) throw new Error('EXACT: Please provide a redirectUri.')

    this.clientId = clientId
    this.clientSecret = clientSecret
    this.redirectUri = redirectUri

    this.connected = false
    this.inUse = false
    this.refreshing = false
    this.currentDivision = null
  }

  getLoginUrl({
    responseType = 'code',
    forceLogin = false,
  }: {
    responseType?: 'token' | 'code'
    forceLogin?: boolean
  }): string {
    const url = new URL('https://start.exactonline.nl/api/oauth2/auth')

    url.searchParams.append('client_id', this.clientId)
    url.searchParams.append('redirect_uri', this.redirectUri)
    url.searchParams.append('response_type', responseType)
    url.searchParams.append('force_login', forceLogin ? '1' : '0')

    return url.toString()
  }

  getAccessToken(): string | null {
    try {
      const json = fs.readFileSync(
        path.join(os.tmpdir(), 'quantix-ict-exact', 'access.json'),
        { encoding: 'utf-8' }
      )
      const data = JSON.parse(json)

      return data.token
    } catch (err) {
      return null
    }
  }

  setAccessToken(accessToken: string) {
    const tempDir = path.join(os.tmpdir(), 'quantix-ict-exact')

    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir)
    }

    fs.writeFileSync(
      path.join(tempDir, 'access.json'),
      JSON.stringify({ token: accessToken })
    )
  }

  getRefreshToken(): string | null {
    try {
      const json = fs.readFileSync(
        path.join(os.tmpdir(), 'quantix-ict-exact', 'refresh.json'),
        { encoding: 'utf-8' }
      )
      const data = JSON.parse(json)

      return data.token
    } catch (err) {
      return null
    }
  }

  setRefreshToken(refreshToken: string) {
    const tempDir = path.join(os.tmpdir(), 'quantix-ict-exact')

    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir)
    }

    fs.writeFileSync(
      path.join(tempDir, 'refresh.json'),
      JSON.stringify({ token: refreshToken })
    )
  }

  async initialize(): Promise<boolean> {
    const accessToken = this.getAccessToken()
    const refreshToken = this.getRefreshToken()

    if (!accessToken || !refreshToken) {
      console.log('EXACT WARNING: Initialize failed, please connect to exact.')
      return false
    }

    try {
      await this.getCurrentDivision()

      this.connected = true
      return true
    } catch (err) {
      console.log('EXACT WARNING: Initialize failed, please connect to exact.')
      return false
    }
  }

  async connect(code: string): Promise<boolean> {
    this.connected = false

    const payload = {
      code,
      redirect_uri: this.redirectUri,
      grant_type: 'authorization_code',
      client_id: this.clientId,
      client_secret: this.clientSecret,
    }

    const res = await fetch('https://start.exactonline.nl/api/oauth2/token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      },
      body: new URLSearchParams(payload).toString(),
    })
    const data = await res.json()

    if (data.error) {
      throw new Error(
        'EXACT: ' + data.error?.message?.value || 'Error while connecting.'
      )
    }

    this.setAccessToken(data.access_token)
    this.setRefreshToken(data.refresh_token)

    this.connected = true

    return true
  }

  async refreshTokens() {
    try {
      if (this.refreshing) {
        await sleep(1000)
        return
      }

      this.refreshing = true
      const refreshToken = this.getRefreshToken()
      if (!refreshToken) throw new Error('EXACT: Invalid refresh token.')

      const payload = {
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }

      const res = await fetch('https://start.exactonline.nl/api/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          Accept: 'application/json',
        },
        body: new URLSearchParams(payload).toString(),
      })
      const data = await res.json()

      if (data.error) {
        throw new Error(
          'EXACT: ' + data.error?.message?.value ||
            'Error while refreshing tokens.'
        )
      }

      this.setAccessToken(data.access_token)
      this.setRefreshToken(data.refresh_token)

      this.refreshing = false

      return true
    } catch (err) {
      this.refreshing = false
      throw err
    }
  }

  async getCurrentDivision(): Promise<string> {
    try {
      this.inUse = true

      const query = new URLSearchParams({
        Select: 'CurrentDivision',
      }).toString()

      const url = BASE_URL + 'current/Me?' + query

      const token = this.getAccessToken()
      if (!token) throw new Error('EXACT: Invalid access token.')

      const res = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      })

      if (res.status === 401) {
        await this.refreshTokens()
        return await this.getCurrentDivision()
      }

      const data = await res.json()

      const user = data.d.results[0]

      this.inUse = false
      this.currentDivision = user.CurrentDivision

      return user.CurrentDivision
    } catch (err) {
      this.inUse = false
      throw err
    }
  }

  async request({
    endpoint,
    params = {},
    method = 'GET',
    headers = {},
    payload = null,
    division,
  }: {
    endpoint: string
    params?: object
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
    headers?: object
    payload?: any | null
    division?: string
  }): Promise<any> {
    try {
      if (!this.connected) throw new Error('EXACT: Not connected.')

      if (!division && !this.currentDivision) {
        await this.getCurrentDivision()
      }

      if (this.inUse || this.refreshing) {
        await sleep(1000)
        return await this.request({
          endpoint,
          params,
          method,
          headers,
          payload,
          division,
        })
      }

      this.inUse = true

      const query = new URLSearchParams({ ...params }).toString()

      const url = BASE_URL + division + endpoint + (query ? `?${query}` : '')

      const token = this.getAccessToken()
      if (!token) throw new Error('EXACT: Invalid access token.')

      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...headers,
        },
        ...(payload && { body: JSON.stringify(payload) }),
      })

      if (res.status === 401) {
        await this.refreshTokens()
        return await this.request({
          endpoint,
          params,
          method,
          headers,
          payload,
          division,
        })
      }

      const data = res.headers.get('content-type')?.includes('application/json')
        ? await res.json()
        : await res.text()

      if (!res.ok) {
        if (res.status === 400)
          throw new Error(
            'EXACT: ' + (typeof data === 'string' ? data : 'Bad Request')
          )

        if (res.status === 403)
          throw new Error(
            'EXACT: ' + (typeof data === 'string' ? data : 'Forbidden')
          )

        if (res.status === 404)
          throw new Error(
            'EXACT: ' + (typeof data === 'string' ? data : 'Not Found')
          )

        if (res.status === 408)
          throw new Error(
            'EXACT: ' +
              (typeof data === 'string'
                ? data
                : 'Request Timeout, try again later')
          )

        if (res.status === 429)
          throw new Error(
            'EXACT: ' +
              (typeof data === 'string'
                ? data
                : 'Request Too Many Requests, try again later')
          )

        if (res.status === 500)
          throw new Error(
            'EXACT: ' +
              (typeof data === 'string' ? data : 'Internal Service Error')
          )

        if (res.status === 503)
          throw new Error(
            'EXACT: ' +
              (typeof data === 'string' ? data : 'Internal Service Unavailable')
          )
      }

      if (res.status === 204) return true

      this.inUse = false

      return data
    } catch (err) {
      this.inUse = false
      throw err
    }
  }
}

export default Exact
