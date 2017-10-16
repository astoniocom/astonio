import {Injectable, Inject} from '@angular/core';

export interface AstonioUIModuleConfig {

}

@Injectable()
export class AstonioUIConfigService {
  constructor(@Inject('ast-ui-config') private config:AstonioUIModuleConfig) {
  }
}