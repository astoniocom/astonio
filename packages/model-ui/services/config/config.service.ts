import {Injectable, Inject} from '@angular/core';
import {CommonListWindowParams} from '../../windows/common-list-window/common-list-window';
import {CommonRecordWindowParams} from '../../windows/common-record-window/common-record-window';

export interface AstonioModelUIModuleConfig {
  commonRecordWindowRelLimit?: number,
  listWindow?: {
    [listName:string]: CommonListWindowParams
  },
  recordWindow?: {
    [listName:string]: CommonRecordWindowParams
  }
}

@Injectable()
export class AstonioModelUIConfigService implements AstonioModelUIModuleConfig {
  commonRecordWindowRelLimit: number = 100;
  listWindow: {
    [listName:string]: CommonListWindowParams
  };
  recordWindow: {
    [listName:string]: CommonRecordWindowParams
  };

  constructor(@Inject('ast-model-ui-config') private config:AstonioModelUIModuleConfig) {
    if ('commonRecordWindowRelLimit' in config)
      this.commonRecordWindowRelLimit = config['commonRecordWindowRelLimit'];
    if ('listWindow' in config)
      this.listWindow = config['listWindow'];
    if ('recordWindow' in config)
      this.recordWindow = config['recordWindow'];
  }

  getListWindowConfig(listName:string):CommonListWindowParams {
    if (this.listWindow && this.listWindow[listName])
      return this.listWindow[listName];
  }

  getRecordWindowConfig(modelName:string):CommonRecordWindowParams {
    if (this.recordWindow && this.recordWindow[modelName])
      return this.recordWindow[modelName];
  }

}