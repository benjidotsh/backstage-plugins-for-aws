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

import { Entity } from '@backstage/catalog-model';
import React from 'react';
import { Route, Routes } from 'react-router-dom';
import {
  useEntity,
  MissingAnnotationEmptyState,
} from '@backstage/plugin-catalog-react';
import { getOneOfEntityAnnotations } from '@aws/aws-core-plugin-for-backstage-common';
import {
  AMAZON_ECR_ARN_ANNOTATION,
  AMAZON_ECR_TAGS_ANNOTATION,
} from '@aws/amazon-ecr-plugin-for-backstage-common';
import { EcrImages } from './EcrImages';
import { digestRouteRef } from '../routes';
import { EcrScanResult } from './EcrScanResult';

export const isAmazonEcrAvailable = (entity: Entity) =>
  getOneOfEntityAnnotations(entity, [
    AMAZON_ECR_ARN_ANNOTATION,
    AMAZON_ECR_TAGS_ANNOTATION,
  ]) !== undefined;

export const Router = () => {
  const { entity } = useEntity();

  if (!isAmazonEcrAvailable(entity)) {
    return (
      <MissingAnnotationEmptyState
        annotation={[AMAZON_ECR_ARN_ANNOTATION, AMAZON_ECR_TAGS_ANNOTATION]}
      />
    );
  }

  return (
    <Routes>
      <Route path="/" element={<EcrImages entity={entity} />} />
      <Route
        path={digestRouteRef.path}
        element={<EcrScanResult entity={entity} />}
      />
    </Routes>
  );
};
