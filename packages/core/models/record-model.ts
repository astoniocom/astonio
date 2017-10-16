import {BaseModel, BaseModelParams} from './base-model';
import {BaseField, BaseDbField, BaseVirtualField} from '../fields/base';
import {CharField} from '../fields/char';
import {ListModel} from './list-model';
import {Observable} from 'rxjs';
import {Record, RecordRawData} from '../datatypes/record';
import {Backend} from '../base-backend';




export interface RecordModelParams extends BaseModelParams {
  fields:BaseField[]; // Делаем поле fields обязательным
  primaryKeys?:string[];
  serviceFields?: string[]; // Сервисные поля
  autoFields?: string[]; // Автоматически генерируемые поля
  listName?:string; // Предпочитаемая таблица через которую можно получить список объектов этой модели. (Может использоваться при выборе foreignKey реального)
} 

/* Описывает объекты/записи */
export class RecordModel extends BaseModel implements RecordModelParams {
  fields:BaseField[] = []; // Делаем поле fields обязательным
  primaryKeys:string[] = [];
  serviceFields: string[] = [];
  autoFields: string[] = [];
  listName:string;
  representFunc: (recrod:Record) => string;
  private _lookupFields:BaseDbField[] = [];
  private getVirtualFieldsCache:BaseVirtualField[];

  constructor (backend:Backend, params:RecordModelParams) {
    super(backend, params);
    Object.assign(this, params);

    for (let field of this.getDbFields()) {
      if (this.primaryKeys.length > 0) {
        if (this.primaryKeys.indexOf(field.name) !== -1)
          this._lookupFields.push(field);
      }
      else {
        this._lookupFields.push(field);
      }
    }
  }

  constructRecord(isNew:boolean, data:RecordRawData={}):Record {
    return this.backend.constructRecord(this, isNew, data);
  }

  getLookupFields():BaseDbField[] {
    return this._lookupFields;
  }

  getVirtualFields():BaseVirtualField[] {
    if (this.getVirtualFieldsCache)
      return this.getVirtualFieldsCache;
    var result = [];
    for (let field of this.fields) {
      if (field instanceof BaseVirtualField)
        result.push(field);
    }
    this.getVirtualFieldsCache = result;
    return result;
  }
  /*getRecordData(record:Record, ...fields:string[]): Observable<RecordRawData> {
    var where:Where = new Where();
    var rawData = record.data.extractRawData(false);
    for (let field of this.fields) {
      if (field.name in rawData) {
        let condition = {};
        condition[field.name] = rawData[field.name];

        where = where.AND(condition)
      }
    }
    return this.backend.getRecord(record, fields);
  } */

  hasCreatePermission(record:Record):Observable<boolean> {
    return this.backend.hasCreateRecordPermission(this);
  }

  representRecord(record:Record):string {
    var repr = '';

    if (this.representFunc)
      return this.representFunc(record)
    else if (repr = this.backend.representRecord(record)) {
    }
    else if (record.__director__.isFull) {
      repr = '';
      for (let field of this.getDbFields()) {
        if (!(field instanceof CharField) || !record[field.name])
          continue;

        var val = (record[field.name] as string).trim();
        if (!val.length)
          continue;

        if (repr.length)
          repr += ', ';
        repr += val;
      }
    }

    if (repr && repr.length > 64) {
      repr = repr.substr(0, 64) + '...';
    }

    if (repr && repr.length)
      return repr;
    else
      return 'Record: ' + this.verboseName;
  }
}
