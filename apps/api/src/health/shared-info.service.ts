import { Injectable } from '@nestjs/common';
import { SHARED_PACKAGE_NAME } from '@ai-investment-assistant/shared';

/**
 * Small dedicated service that surfaces a constant from
 * `@ai-investment-assistant/shared`, proving the workspace package
 * resolves correctly (type-check and runtime) inside apps/api.
 */
@Injectable()
export class SharedInfoService {
  getSharedPackageName(): string {
    return SHARED_PACKAGE_NAME;
  }
}
