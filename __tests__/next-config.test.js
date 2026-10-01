/**
 * Tests for next.config.mjs security validations.
 * These tests verify that NEXT_API_URL is properly validated at build time.
 */

describe('next.config.mjs', () => {
  describe('validateBackendUrl', () => {
    let validateBackendUrl

    beforeEach(() => {
      // Clear require cache so we can re-import with different env vars
      jest.resetModules()
      jest.spyOn(console, 'error').mockImplementation()
      jest.spyOn(process, 'exit').mockImplementation()
    })

    afterEach(() => {
      jest.restoreAllMocks()
    })

    it('accepts valid http URLs', () => {
      // Import and extract the validator
      const { validateBackendUrl: validator } = require('../next.config.mjs')
      expect(() => validator('http://127.0.0.1:3000')).not.toThrow()
    })

    it('accepts valid https URLs', () => {
      const { validateBackendUrl: validator } = require('../next.config.mjs')
      expect(() => validator('https://api.example.com')).not.toThrow()
    })

    it('rejects data: URIs (SSRF prevention)', () => {
      const { validateBackendUrl: validator } = require('../next.config.mjs')
      expect(() => validator('data:text/html,<script>alert(1)</script>')).toThrow()
    })

    it('rejects relative paths (SSRF prevention)', () => {
      const { validateBackendUrl: validator } = require('../next.config.mjs')
      expect(() => validator('/backend')).toThrow()
    })

    it('rejects file: protocol (SSRF prevention)', () => {
      const { validateBackendUrl: validator } = require('../next.config.mjs')
      expect(() => validator('file:///etc/passwd')).toThrow()
    })

    it('rejects URLs without hostname', () => {
      const { validateBackendUrl: validator } = require('../next.config.mjs')
      expect(() => validator('http://')).toThrow()
    })
  })
})
