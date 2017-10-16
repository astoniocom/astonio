import {QuerySet} from '../query/queryset';
import {BaseModel, BaseModelParams} from './base-model';
import {Backend} from '../base-backend';
import {RecordModel} from '../models/record-model';
import {Record} from '../../core/datatypes/record';

export interface ListModelParams extends BaseModelParams {
  group?:string,
  recordModels?: string[];
  primaryKeys: string[];
  getQueryset?: (model:ListModel) => QuerySet;
}

/* Описывает объекты/записи */
export class ListModel extends BaseModel implements ListModelParams {
  //objects:QuerySet;
  group:string;
  recordModels: string[];
  primaryKeys: string[];
  _getQueryset: (model:ListModel) => QuerySet;

  constructor (backend:Backend, params:ListModelParams) {
    super(backend, params);
    this.recordModels = params.recordModels;
    this.primaryKeys = params.primaryKeys;
    this.group = params.group;
    
    if ('getQueryset' in params)
      this._getQueryset = params.getQueryset;
    else
      this._getQueryset = this.backend.getQueryset;
  }

  getRecordModels():RecordModel[] {
    var result = [];
    this.recordModels.forEach(modelName => {
      result.push(this.backend.getRecordModel(modelName));
    })
    return result;
  }

  getQueryset() {
    return this._getQueryset(this);
  }

  /*isArrangeAvailable(colName:string):boolean {
    if (colName == 'weight' && this.getDbField(colName).internalName == 'IntegerField')
      return true;
    return false;
  }*/


}
