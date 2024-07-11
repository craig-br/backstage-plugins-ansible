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

import { Config } from '@backstage/config';
import fetch from 'node-fetch';
import https from 'https';

import { DEFAULT_SCHEDULE } from './constant';
import { Logger } from 'winston';
import { PluginTaskScheduler, readTaskScheduleDefinitionFromConfig, TaskRunner, TaskScheduleDefinition } from '@backstage/backend-tasks';

export class AnsibleRHAAPService {
  private hasValidSubscription!: boolean;
  private static _instance: AnsibleRHAAPService;
  private readonly scheduleFn!: () => Promise<void>;
  private config!: Config;
  private logger!: Logger;

  private constructor(
    config: Config,
    logger: Logger,
    scheduler?: PluginTaskScheduler,
  ) {
    if (AnsibleRHAAPService._instance)
      return AnsibleRHAAPService._instance;

    this.config = config;
    this.logger = logger;

    this.logger.info(`In Ansible RHAAP Service`);

    let schedule: TaskScheduleDefinition = DEFAULT_SCHEDULE;
    if (this.config.has('ansible.aap.schedule')) {
      schedule = readTaskScheduleDefinitionFromConfig(
        this.config.getConfig('ansible.aap.schedule'),
      );
    }

    if(scheduler) {
        const taskRunner = scheduler.createScheduledTaskRunner(schedule);

        this.logger.info(`Scheduling function with task runner ${taskRunner}`);
        this.scheduleFn = this.createFn(taskRunner);
        this.scheduleFn();
    }
    AnsibleRHAAPService._instance = this;
  }

  static getInstance(
    config: Config,
    logger: Logger,
    scheduler?: PluginTaskScheduler,
  ): AnsibleRHAAPService {
    return new AnsibleRHAAPService(config, logger, scheduler);
  }

  getSubscriptionStatus() {
    return this.hasValidSubscription;
  }

  private createFn(taskRunner: TaskRunner) {
    return async () =>
      taskRunner.run({
        id: 'backstage-rhaap-subscription-check',
        fn: () => this.checkSubscription(),
      });
  }

  private async checkSubscription() {
    const ansibleConfig = this.config.getConfig('ansible');
    const aapConfig = ansibleConfig.getConfig('aap');
    const baseUrl = aapConfig.getString('baseUrl');
    const token = aapConfig.getString('token');
    const checkSSL = aapConfig.getBoolean('checkSSL') ?? true;
    try {

      const agent = new https.Agent({
        rejectUnauthorized: checkSSL,
      });

      console.log('In Subscription Check: ', this.hasValidSubscription);

      // Send request to AAP
      this.logger.info(
        `[backstage-rhaap-backend] Checking AAP subscription at ${baseUrl}/api/v2/config/`,
      );
      const aapResponse = await fetch(`${baseUrl}/api/v2/config/`, {
        headers: { Authorization: `Bearer ${token}` },
        agent,
      });
      const data = await aapResponse.json();
      this.hasValidSubscription =
        data?.license_info?.license_type === 'enterprise';
    } catch (error: any) {
      this.logger.info(
        `[backstage-rhaap-backend] AAP subscription Check failed at ${baseUrl}/api/v2/config/`,
      );
      this.hasValidSubscription = false;
    }
  }
}
