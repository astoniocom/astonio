import {RecordModel} from './models/record-model';
import {ListModel} from './models/list-model';
import {BaseModel} from './models/base-model';
import {Record, RecordRawData, RecordDirector} from './datatypes/record';
//import {FieldChangedEvent} from './datatypes/data-item';
import {Observable, Subject, ReplaySubject} from 'rxjs';
import {QuerySet} from './query/queryset';
import {Message} from './message';
import {utilRecordModelFromRawData} from './utils';
import {Query, DeleteQuery, UpdateQuery, InsertQuery} from './query/query';
import {ListRowRawData} from './datatypes/list-row';
import {RowDoesNotExistError, MultipleRowsReturnedError} from './exceptions';
import {BaseField} from './fields/base';
import {RecordLookupData} from './datatypes/record';


export class RecordCreatedNotification {
  constructor(
    public lookupData: RecordLookupData, public initiatorId?:string
  ) {} 
}

export class RecordLookupChangedNotification {
  constructor(
    public oldLookupData: RecordLookupData, public newLookupData: RecordLookupData, public initiatorId?:string
  ) {}
}

export class RecordSavedNotification {
  constructor(
    public lookupData: RecordLookupData, public initiatorId?:string
  ) {}
}

export class RecordDeletedNotification {
  constructor(
    public lookupData: RecordLookupData, public initiatorId?:string,
  ) {}
}

export type RecordNotification = RecordCreatedNotification | RecordLookupChangedNotification | RecordSavedNotification | RecordDeletedNotification;

export interface SaveRecordSucces {
  query: Query, 
  fields:string[]
}


export function instanceOf_SaveRecordSucces(object: any): object is SaveRecordSucces {
  return object && typeof object == "object" && 'fields' in object && 'query' in object;
}

export interface PagedRowsRawResult {
  rows: ListRowRawData[],
  total: number,
  lastRow: boolean,
}

export interface GetPagedRowsParams {
  fromRow:number, 
  toRow:number, 
  query:Query
}



export abstract class BaseBackend {
  defaultRecordClass:typeof Record = Record;
  defaultRecordDirector:typeof RecordDirector = RecordDirector;
  modelNameField:string = '_model';
  messages = new Subject<Message>();
  recordCreatedNotifications = new Subject<RecordCreatedNotification>();
  recordLookupChangedNotifications = new Subject<RecordLookupChangedNotification>();
  recordSavedNotifications = new Subject<RecordSavedNotification>();
  recordDeletedNotifications = new Subject<RecordDeletedNotification>();
  recordModels:Map<string, RecordModel> = new Map();
  listModels:Map<string, ListModel> = new Map();
  bootstrapped = new ReplaySubject<null>(1);
  
  constructor() {
  }

  bootstrap():Observable<void> {
    this.bootstrapped.next(null);
    this.bootstrapped.complete();
    return Observable.of(null);
  }

  open() {

  }

  close() {

  }

  getRecordModel(name:string):RecordModel {
    var model = this.recordModels.get(name);
    if (!model)
      throw new Error('Model "'+name+'" not defined');
    return model;
  }

  getListModel(name:string):ListModel {
    return this.listModels.get(name);
  }
 
  getRecordClass(model:RecordModel):typeof Record {
    return this.defaultRecordClass;
  }

  getRecordDirector(model:RecordModel):typeof RecordDirector {
    return this.defaultRecordDirector;
  }

  getQueryset(model:ListModel):QuerySet {
    return new QuerySet(model);
  }

  constructRecord(model:RecordModel, isNew:boolean, data:RecordRawData={}):Record {
    var recordClass = this.getRecordClass(model);
    return new recordClass(model, data, isNew);
  }

  getRows(query:Query, fields?:string[]):Observable<(RecordRawData|ListRowRawData)[]> {
    throw new Error('getRows must be specified in the backend class.')
  }

  getRow(query:Query, fields?:string[]):Observable<RecordRawData|ListRowRawData> {
     return this.getRows(query, fields).map((rawRows) => {
        if (rawRows.length == 0) {
          throw new RowDoesNotExistError();
        }
        else if (rawRows.length > 1) {
          throw new MultipleRowsReturnedError();
        }

        return rawRows[0];
     });
  }

  /*getPagedRows(params:GetPagedRowsParams):Observable<PagedRowsRawResult> {
    throw new Error('getPagedRows should be specified the backend.')
  }*/

  saveRecord(query:UpdateQuery|InsertQuery, initiatorId:string, commit:boolean=true, returnNewData:boolean=true):Observable<RecordRawData|null> { // Может быть не реализована и всё должно работать
    throw new Error('saveRecord must be specified in the backend class.')
  }; // В случае ошибки возвращается TreeRecordMessage[], и Message[]

  deleteRecord(query:DeleteQuery, initiatorId:string):Observable<void> { // Может быть не реализована и всё должно работать
    throw new Error('deleteRecord must be specified in the backend class.')
  };// Message[],

  lockRecord(record:Record):Observable<boolean> { 
    return Observable.of(true);
  };

  unlockRecord(record:Record):Observable<boolean> {
    return Observable.of(true);
  };
 
  isRecordLocked(record:Record):Observable<boolean> {
    return Observable.of(false);
  };

  hasRecordEditPermission(record:Record):Observable<boolean> {
    return Observable.of(false);
  };

  hasRecordDeletePermission(record:Record):Observable<boolean> {
    return Observable.of(false);
  };

  hasCreateRecordPermission(model:RecordModel):Observable<boolean> {
    return Observable.of(true);
  };

  representRecord(record:Record) {
    return undefined;
  }
}

export class Backend extends BaseBackend {

}