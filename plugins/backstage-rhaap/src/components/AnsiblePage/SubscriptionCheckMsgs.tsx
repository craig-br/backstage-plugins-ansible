/*
 * Copyright 2024 The Ansible plugin Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { Link } from '@backstage/core-components';

export const errorTitle = {
  AUTH_FAIL: 'Unable to authenticate to Ansible Automation Platform',
  RESOURCE_FAIL: 'Invalid resource for Ansible Automation Platform',
  SSL_OR_UNREACHABLE: 'Unable to connect to Ansible Automation Platform',
  NON_COMPLIANT: 'Subscription non-compliant',
  INVALID_LICENSE: 'Invalid subscription',
};

export const errorMessage = {
  AUTH_FAIL: (
    <>
      Verify that the authentication details for Ansible Automation Platform are
      correctly configured in the Ansible plug-ins. For help, please refer to
      the{' '}
      <Link to="http://red.ht/aap-rhdh-plugins-install-guide">
        Ansible plug-ins installation guide
      </Link>
      .
    </>
  ),
  RESOURCE_FAIL: (
    <>
      Verify that the resource url for Ansible Automation Platform are correctly
      configured in the Ansible plug-ins. For help, please refer to the{' '}
      <Link to="http://red.ht/aap-rhdh-plugins-install-guide">
        Ansible plug-ins installation guide
      </Link>
      .
    </>
  ),
  SSL_OR_UNREACHABLE: (
    <>
      Verify that Ansible Automation Platform is reachable and correctly
      configured in the Ansible plug-ins. To get help, please refer to the{' '}
      <Link to="http://red.ht/aap-rhdh-plugins-install-guide">
        Ansible plug-ins installation guide
      </Link>
      .
    </>
  ),
  NON_COMPLIANT: (
    <>
      The connected Ansible Automation Platform subscription is out of
      compliance. Contact your Red Hat account team to obtain a new subscription
      entitlement.{' '}
      <Link to="https://access.redhat.com/solutions/6988859">
        Learn more about account compliance
      </Link>
      .
    </>
  ),
  INVALID_LICENSE: (
    <>
      The connected Ansible Automation Platform subscription is invalid. Contact
      your Red Hat account team, or{' '}
      <Link to="http://red.ht/aap-rhdh-plugins-start-trial">
        start an Ansible Automation Platform trial
      </Link>
      .
    </>
  ),
};
