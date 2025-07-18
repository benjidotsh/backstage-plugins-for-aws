/**
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *   http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { loggerToWinstonLogger } from '@backstage/backend-common';
import {
  createBackendPlugin,
  coreServices,
} from '@backstage/backend-plugin-api';
import { createRouter } from './service/router';
import { Toolkit } from './tools/Toolkit';
import { DefaultAgentService } from './service/DefaultAgentService';
import {
  agentToolExtensionPoint,
  agentTypeExtensionPoint,
  AgentTypeFactory,
} from '@aws/genai-plugin-for-backstage-node';
import { ToolInterface } from '@langchain/core/tools';
import { catalogServiceRef } from '@backstage/plugin-catalog-node';
import {
  createBackstageCatalogSearchTool,
  createBackstageEntityTool,
  createBackstageTechDocsReadTool,
  createBackstageTechDocsSearchTool,
} from './tools';
import { DatabaseSessionStore } from './database';
import { McpService } from './service/McpService';

export const awsGenAiPlugin = createBackendPlugin({
  pluginId: 'aws-genai',
  register(env) {
    const toolkit = new Toolkit();

    env.registerExtensionPoint(agentToolExtensionPoint, {
      addTools(...tools: ToolInterface[]) {
        toolkit.add(...tools);
      },
    });

    const agentTypeFactories: AgentTypeFactory[] = [];

    env.registerExtensionPoint(agentTypeExtensionPoint, {
      addAgentType(factory: AgentTypeFactory) {
        agentTypeFactories.push(factory);
      },
    });

    env.registerInit({
      deps: {
        logger: coreServices.logger,
        httpRouter: coreServices.httpRouter,
        config: coreServices.rootConfig,
        auth: coreServices.auth,
        discovery: coreServices.discovery,
        httpAuth: coreServices.httpAuth,
        userInfo: coreServices.userInfo,
        catalogApi: catalogServiceRef,
        database: coreServices.database,
      },
      async init({
        logger,
        httpRouter,
        config,
        discovery,
        auth,
        httpAuth,
        userInfo,
        catalogApi,
        database,
      }) {
        const winstonLogger = loggerToWinstonLogger(logger);

        toolkit.add(createBackstageEntityTool(catalogApi));
        toolkit.add(createBackstageCatalogSearchTool(discovery, auth));
        toolkit.add(createBackstageTechDocsSearchTool(discovery, auth));
        toolkit.add(createBackstageTechDocsReadTool(discovery, auth));

        const sessionStore = await DatabaseSessionStore.create({
          database,
          skipMigrations: false,
        });

        const agentService = await DefaultAgentService.fromConfig(config, {
          agentTypeFactories,
          toolkit,
          userInfo,
          logger,
          sessionStore,
        });

        const mcpService = await McpService.fromConfig(agentService);

        httpRouter.use(
          await createRouter({
            logger: winstonLogger,
            agentService,
            mcpService,
            httpAuth,
            discovery,
            auth,
          }),
        );
        httpRouter.addAuthPolicy({
          path: '/health',
          allow: 'unauthenticated',
        });
        httpRouter.addAuthPolicy({
          path: '/v1/index',
          allow: 'unauthenticated',
        });
      },
    });
  },
});
