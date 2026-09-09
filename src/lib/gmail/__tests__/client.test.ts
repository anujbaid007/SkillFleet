import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getGoogleOAuthUrl,
  base64UrlEncode,
  buildMimeMessage,
  exchangeCodeForTokens,
  refreshAccessToken,
  sendGmailEmail,
  GMAIL_SCOPES,
} from '../client'

describe('Gmail Client', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('getGoogleOAuthUrl', () => {
    it('generates a valid Google OAuth URL with default scopes', () => {
      const url = getGoogleOAuthUrl({
        clientId: 'test-client-id.apps.googleusercontent.com',
        redirectUri: 'https://skillfleet.org/api/gmail/callback',
        state: 'random-state-123',
      })

      const parsed = new URL(url)
      expect(parsed.origin).toBe('https://accounts.google.com')
      expect(parsed.pathname).toBe('/o/oauth2/v2/auth')
      expect(parsed.searchParams.get('client_id')).toBe('test-client-id.apps.googleusercontent.com')
      expect(parsed.searchParams.get('redirect_uri')).toBe('https://skillfleet.org/api/gmail/callback')
      expect(parsed.searchParams.get('response_type')).toBe('code')
      expect(parsed.searchParams.get('access_type')).toBe('offline')
      expect(parsed.searchParams.get('prompt')).toBe('consent')
      expect(parsed.searchParams.get('state')).toBe('random-state-123')
      expect(parsed.searchParams.get('scope')).toBe(GMAIL_SCOPES.join(' '))
    })

    it('allows custom scopes', () => {
      const url = getGoogleOAuthUrl({
        clientId: 'test-client-id',
        redirectUri: 'https://skillfleet.org/callback',
        scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
      })
      const parsed = new URL(url)
      expect(parsed.searchParams.get('scope')).toBe('https://www.googleapis.com/auth/gmail.readonly')
    })
  })

  describe('base64UrlEncode', () => {
    it('correctly encodes standard ASCII string', () => {
      const encoded = base64UrlEncode('Hello World')
      expect(encoded).toBe('SGVsbG8gV29ybGQ')
      expect(encoded).not.toContain('=')
      expect(encoded).not.toContain('+')
      expect(encoded).not.toContain('/')
    })

    it('replaces + with - and / with _ without padding', () => {
      const testString = 'subjects? >>>> ???? <<<<'
      const encoded = base64UrlEncode(testString)
      expect(encoded).not.toContain('+')
      expect(encoded).not.toContain('/')
      expect(encoded).not.toContain('=')
    })
  })

  describe('buildMimeMessage', () => {
    it('builds a plain text message', () => {
      const encoded = buildMimeMessage({
        to: 'recipient@example.com',
        from: 'sender@example.com',
        subject: 'Welcome to SkillFleet',
        text: 'Hello from SkillFleet!',
      })

      expect(typeof encoded).toBe('string')
      expect(encoded.length).toBeGreaterThan(0)
    })

    it('builds an HTML message with cc and bcc arrays', () => {
      const encoded = buildMimeMessage({
        to: ['recipient1@example.com', 'recipient2@example.com'],
        cc: ['cc1@example.com', 'cc2@example.com'],
        bcc: ['bcc1@example.com'],
        from: 'sender@example.com',
        replyTo: 'support@skillfleet.org',
        subject: 'Event Reminder',
        html: '<h1>Reminder</h1><p>Workshop starts tomorrow.</p>',
      })

      expect(typeof encoded).toBe('string')
      expect(encoded.length).toBeGreaterThan(0)
    })

    it('builds a multipart alternative message when both text and html are provided', () => {
      const encoded = buildMimeMessage({
        to: 'user@example.com',
        subject: 'Multi-part test',
        text: 'Plain text fallback',
        html: '<b>Rich HTML</b>',
      })

      expect(typeof encoded).toBe('string')
      expect(encoded.length).toBeGreaterThan(0)
    })
  })

  describe('exchangeCodeForTokens', () => {
    it('successfully exchanges code for tokens', async () => {
      const mockTokenResponse = {
        access_token: 'mock-access-token',
        expires_in: 3600,
        refresh_token: 'mock-refresh-token',
        scope: GMAIL_SCOPES.join(' '),
        token_type: 'Bearer',
      }

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockTokenResponse,
      })

      const tokens = await exchangeCodeForTokens({
        code: 'auth-code-123',
        clientId: 'client-id',
        clientSecret: 'client-secret',
        redirectUri: 'https://skillfleet.org/api/gmail/callback',
      })

      expect(tokens.access_token).toBe('mock-access-token')
      expect(tokens.refresh_token).toBe('mock-refresh-token')
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://oauth2.googleapis.com/token',
        expect.objectContaining({
          method: 'POST',
        })
      )
    })

    it('throws error when token exchange fails', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'invalid_grant',
      })

      await expect(
        exchangeCodeForTokens({
          code: 'bad-code',
          clientId: 'client-id',
          clientSecret: 'client-secret',
          redirectUri: 'https://skillfleet.org/api/gmail/callback',
        })
      ).rejects.toThrow('Failed to exchange code for tokens: 400 invalid_grant')
    })
  })

  describe('refreshAccessToken', () => {
    it('successfully refreshes token', async () => {
      const mockResponse = {
        access_token: 'new-access-token',
        expires_in: 3600,
        scope: GMAIL_SCOPES.join(' '),
        token_type: 'Bearer',
      }

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await refreshAccessToken({
        refreshToken: 'stored-refresh-token',
        clientId: 'client-id',
        clientSecret: 'client-secret',
      })

      expect(result.access_token).toBe('new-access-token')
    })

    it('throws error on refresh failure', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'invalid_token',
      })

      await expect(
        refreshAccessToken({
          refreshToken: 'bad-refresh-token',
          clientId: 'client-id',
          clientSecret: 'client-secret',
        })
      ).rejects.toThrow('Failed to refresh access token: 401 invalid_token')
    })
  })

  describe('sendGmailEmail', () => {
    it('sends email successfully', async () => {
      const mockSendResponse = {
        id: 'msg-id-123',
        threadId: 'thread-id-456',
        labelIds: ['SENT'],
      }

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockSendResponse,
      })

      const res = await sendGmailEmail({
        accessToken: 'valid-access-token',
        email: {
          to: 'recipient@example.com',
          subject: 'Test Subject',
          text: 'Test Body',
        },
      })

      expect(res.id).toBe('msg-id-123')
      expect(res.threadId).toBe('thread-id-456')
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer valid-access-token',
            'Content-Type': 'application/json',
          }),
        })
      )
    })

    it('throws error when Gmail send API fails', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        text: async () => 'insufficientPermissions',
      })

      await expect(
        sendGmailEmail({
          accessToken: 'token-without-send-scope',
          email: {
            to: 'recipient@example.com',
            subject: 'Test Subject',
            text: 'Test Body',
          },
        })
      ).rejects.toThrow('Gmail API send failed: 403 insufficientPermissions')
    })
  })
})
