import { createRouteRef, createSubRouteRef } from '@backstage/core-plugin-api';

export const rootRouteRef = createRouteRef({
  id: 'portal',
});

export const selectedTemplateRouteRef = createSubRouteRef({
  id: 'portal/selected-template',
  parent: rootRouteRef,
  path: '/create/templates/:namespace/:templateName',
});

export const createTaskRouteRef = createSubRouteRef({
  id: 'portal/task',
  parent: rootRouteRef,
  path: '/create/tasks/:taskId',
});
