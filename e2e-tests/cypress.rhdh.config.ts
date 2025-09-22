import { defineConfig } from 'cypress';
import { baseConfig } from './cypress.base.config';

/**
 * RHDH (Red Hat Developer Hub) specific Cypress configuration
 */
export default defineConfig({
  ...baseConfig,
  e2e: {
    ...baseConfig.e2e,
    baseUrl: process.env.RHDH_URL || process.env.BASE_URL,
    specPattern: 'cypress/e2e/rhdh/**/*.cy.ts',

    // Increase timeouts for external authentication flows
    pageLoadTimeout: 60000,
    defaultCommandTimeout: 20000,
    requestTimeout: 30000,
    responseTimeout: 30000,

    // RHDH specific environment variables
    env: {
      SERVICE_TYPE: 'RHDH',
      GH_USER_ID: process.env.GH_USER_ID || 'changeme',
      GH_USER_PASS: process.env.GH_USER_PASS || 'changeme',
      AUTHENTICATOR_SECRET: process.env.AUTHENTICATOR_SECRET || 'changeme',
    },
  },
});
