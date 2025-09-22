describe('index', () => {
  let createApiFactoryMock: jest.Mock;
  const fakeAnalyticsApiRef = { id: 'analyticsApi' };
  const fakeConfigApiRef = { id: 'configApi' };
  const fakeIdentityApiRef = { id: 'identityApi' };

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    // Spy/collector for createApiFactory
    createApiFactoryMock = jest.fn((opts: any) => opts);

    // Mock the Analytics implementation .fromConfig used by the factory
    const fromConfigMock = jest.fn(() => ({ created: 'analytics-instance' }));
    jest.doMock('./apis/implementations/AnalyticsApi', () => ({
      AnsibleSegmentAnalytics: {
        fromConfig: fromConfigMock,
      },
    }));

    // Mock core-plugin-api with required stubs (route helpers etc.)
    jest.doMock('@backstage/core-plugin-api', () => ({
      analyticsApiRef: fakeAnalyticsApiRef,
      configApiRef: fakeConfigApiRef,
      identityApiRef: fakeIdentityApiRef,
      createApiFactory: createApiFactoryMock,
      // stubs so other modules load
      createRouteRef: (opts: any) => ({ ...opts }),
      createSubRouteRef: (opts: any) => ({ ...opts }),
      createApiRef: (opts: any) => ({ ...opts }),
      createPlugin: (opts: any) => ({ ...opts, provide: (ext: any) => ext }),
      createRoutableExtension: (opts: any) => ({
        __routableExt: true,
        ...opts,
      }),
      createComponentExtension: (opts: any) => ({
        __componentExt: true,
        ...opts,
      }),
      createServiceFactory: (x: any) => x,
    }));
  });

  it('calls createApiFactory with the expected args and factory delegates to AnsibleSegmentAnalytics.fromConfig', async () => {
    // Require module after mocks in place
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('./index');
    const exportedFactoryOpts = mod.AnsibleSegmentAnalyticsApi;

    // createApiFactory should have been called and the module export should equal the returned opts
    expect(createApiFactoryMock).toHaveBeenCalledTimes(1);
    const callArg = createApiFactoryMock.mock.calls[0][0];
    expect(exportedFactoryOpts).toBe(callArg);

    // Basic shape assertions
    expect(callArg.api).toBe(fakeAnalyticsApiRef);
    expect(callArg.deps).toEqual({
      configApi: fakeConfigApiRef,
      identityApi: fakeIdentityApiRef,
    });
    expect(typeof callArg.factory).toBe('function');

    // --- Prepare a mock config object implementing the methods used by fromConfig ---
    const mockConfig = {
      // fromConfig does: config.getBoolean('ansible.analytics.enabled') ?? true
      getBoolean: jest.fn().mockReturnValue(true),
      getOptionalBoolean: jest.fn().mockReturnValue(false),
      getOptionalString: jest.fn().mockReturnValue(undefined),
      // include any other config helpers your real code might call; safe defaults:
      getOptionalNumber: jest.fn().mockReturnValue(undefined),
      getString: jest.fn().mockReturnValue(''),
    };

    // And a mock identityApi (if the factory passes it through)
    const mockIdentityApi = {
      getProfileInfo: jest.fn().mockReturnValue({}),
    };

    // Call the factory — it may return sync or async; handle both with await
    const produced = await callArg.factory({
      configApi: mockConfig,
      identityApi: mockIdentityApi,
    });

    // The mocked AnsibleSegmentAnalytics.fromConfig should have been called with our mock config/identity
    const impl =
      require('./apis/implementations/AnalyticsApi').AnsibleSegmentAnalytics;
    expect(impl.fromConfig).toHaveBeenCalledTimes(1);
    expect(impl.fromConfig).toHaveBeenCalledWith(mockConfig, mockIdentityApi);

    // The factory should return whatever fromConfig returned (our spy returns { created: ... })
    expect(produced).toEqual({ created: 'analytics-instance' });
  });
});
