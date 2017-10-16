import {Observable, Subject, Subscription} from 'rxjs';
import {RecordModel} from '../models/record-model';
import {ListModel} from '../models/list-model';
import {RelatedRecords} from './related-records';
import {Message, instanceOfMessage} from '../message';
import {Backend} from '../base-backend';
import {BaseField, BaseFieldEvent, BaseVirtualField, BaseDbField} from '../fields/base';
import {Labels} from '../labels';
import {Query, InsertQuery, UpdateQuery, DeleteQuery, SaveQuery} from '../query/query';
import {QuerySet} from '../query/queryset';
import {Q, Condition} from '../query/q';
import {ListRow, ListRowDirector} from './list-row';
import {FieldChangedEvent} from './data-item';

export interface RecordLookupData {
  condition: Condition,
  model: RecordModel
}
export interface RecordCommonErrorMessage {
  message: string,
}

/* export function instanceOfRecordCommonErrorMessage(object: any): object is RecordCommonErrorMessage {
  return typeof object == "object" && 'message' in object;
}*/

// Сообщение для поля записи
export interface RecordFieldErrorMessage {
  message: string,
}

/*export function instanceOfRecordFieldErrorMessage(object: any): object is RecordFieldErrorMessage {
  return typeof object == "object"  && 'message' in object;
}*/

export interface RecordVirtualFieldErrorMessage {
  message?: string,
  fieldErrorData?: any,
}

/*export function instanceOfRecordVirtualFieldErrorMessage(object: any): object is RecordVirtualFieldErrorMessage {
  return typeof object == "object"  && 'fieldErrorData' in object;
}*/

export type RecordErrorMessages = {
  common?: RecordCommonErrorMessage[],
  field?: {[fieldName:string]: RecordFieldErrorMessage[]},
  virtualField?: {[fieldName:string]: RecordVirtualFieldErrorMessage},
};

export function instanceOfRecordErrorMessage(object: any): object is RecordErrorMessages {
  return object && typeof object == "object"  && ('common' in object || 'field' in object || 'virtualField' in object);
}


export class RecordSaveError extends Error {
  messages:RecordErrorMessages;

  constructor(messages:RecordErrorMessages) {
    super("Record can't be saved.");
    this.messages = messages;
  }

  getMessages():RecordErrorMessages {
    return this.messages;
  }
}

export type RecordRawData = {
  [name:string]: string|number|Date|Object
};

export interface BaseVirtualFieldStateData {
  __state__: {}
}

export interface RecordStateData extends BaseVirtualFieldStateData {
  __state__: {
    isNew: boolean,
    isChanged: boolean,
    isFull: boolean,
    uid: string,
    modifiedFields: string[],
    lookupData?: { // Параметры по которым ищем
      [name:string]: string|number|Date|Object
    }  
  },
  [name:string]: string|number|Date|Object|BaseVirtualFieldStateData // Данные
};

export function instanceOfRecordStateData(object: any): object is RecordStateData {
  return '__state__' in object && 'isNew' in object.__state__ && 'isChanged' in object.__state__;
}

export type RecordFieldValue = any; // string|number|Date|Object|Record
export type RecordProcessedData = {[name:string]: RecordFieldValue};



export class RelFieldChangedEvent {
  constructor (
    public name: string,
    public value: RecordFieldValue,
    public event: any // Like RecordsListEvent ....
  ) {}
  // index: number;
}

export type RecordChangedEvent = FieldChangedEvent|RelFieldChangedEvent;

var recordCounter:number = 0;

export class RecordDirector extends ListRowDirector {
  host:Record;
  backend:Backend;
  loaded = new Subject<Record>();
  changed = new Subject<RecordChangedEvent>();
  messagesChanged = new Subject<Record>();
  
  messages: RecordCommonErrorMessage[] = [];
  fieldMessages = new Map<string, RecordFieldErrorMessage[]>();
  uid:string; // Уникальный идентификатор записи в программе
  labels:Labels = new Labels();
  isNew:boolean;
  isChildrenChanged:boolean = false; // Children related records changed
  isFull:boolean = false;
  isDeleted:boolean = false;
  modifiedFields:string[] = []; // List of fields that modified
  lookupData:RecordLookupData;

  fieldData:Map<string, any> = new Map();
  private initData: RecordRawData = {}; // Сохраняются начальные значения записи, чтобы можно было делать выборки записи из базы по начальным значениям
  destroyed = false;
  //private recordLookupChangedSubscription:Subscription;


  constructor(public model:RecordModel, data?:RecordRawData, isNew?:boolean) {
    super(data, model);
    this.isNew = !!isNew;
    
    this.generateUid();

    this.backend = model.backend;

    for (let serviceFieldName of this.model.serviceFields) {
      Object.defineProperty(this, serviceFieldName, {
        get: () => {
          return this.data[serviceFieldName]; 
        },
        set: function(newValue) {
          this._data[serviceFieldName] = newValue;
        }
      });
    }

    /*this.recordLookupChangedSubscription = this.backend.recordLookupChangedNotifications.subscribe(ev => {
      if (!this.isNew && this.fitLookup(ev.oldLookupData) && this.uid !== ev.initiatorId) {
        this.setLookupData(ev.newLookupData);
      }
    });*/
  }

  generateUid() {
    this.uid = Date.now()+'_'+recordCounter++;
  }
  /*constructor(data: TableRowRawData, public model?: BaseModel, runInit=true) {
    super(data, (model && model.fields) ? model.fields.map((field)=> field.name) : undefined, false);

    if (runInit)
      this.init(data);
  }*/
  init(data?:RecordRawData) {
    this.isChildrenChanged = false;
    this.modifiedFields = [];
    this.initData = {};
    this.isFull = true;
    this.lookupData = undefined;
    
    var virtualDataTotSet = {};

    for (let field of this.model.getVirtualFields() ) {
      var initValue = undefined;
      if (field.name in data)
        initValue = field.fromRAWtoInternal(data[field.name], this.host); // TODO backend form rawtointernal
      else if (this.host[field.name] === undefined)
        initValue = field.constructDefaultValue(this.host);
      else 
        continue;
        
      virtualDataTotSet[field.name] = initValue;
    }

    this.setValues(virtualDataTotSet, false); //

    var realDataToSet = {}; // см. virtualDataTotSet. Разделено на 2 этапа, тк виртуальные завият от реальный. Реальные должны быть установлены раньше.
    // Prepare fields.
    for (let field of this.model.getDbFields() ) {
      var initValue = undefined;
      if (!data || !(field.name in data)) {
        if (this.host[field.name] === undefined) {
          if (this.isNew) // Значение по умолчанию устанавливаем только для новых, но не должны устанавливать для не загруженных.
            initValue = field.constructDefaultValue(this.host);
          else
            this.isFull = false;
        }
        else {
          continue;
        }
      }
      else {
        // TODO Check is value correct.
        initValue = data[field.name] !== undefined ? field.fromRAWtoInternal(data[field.name], this.host) : undefined; // Step 2 of convertation from RAW to internal. First step is backend convertation.
        this.initData[field.name] = data[field.name];
      }
      realDataToSet[field.name] = initValue;
    }

    this.setValues(realDataToSet, false); // 

    for (let serviceFieldName of this.model.serviceFields) {
      if (data[serviceFieldName]) {
        this.data[serviceFieldName] = data[serviceFieldName];
      }
    }
  }

  setValues(values:{[fieldName:string]: any}, emitChange=true) {
    var changed:[BaseField, any, any][] = [];
    for (let fieldName in values) {
      var value = values[fieldName];
      var field = this.getField(fieldName);
      var oldValue:RecordFieldValue = this.data[fieldName];
      if (value === oldValue)
        continue;

      if (!field.checkValue(value)) {
        throw new Error('Value for field ' + fieldName +' not acceptable.');
      }

      if (emitChange && !(field instanceof BaseVirtualField) && this.modifiedFields.indexOf(fieldName) == -1) {
        this.modifiedFields.push(fieldName);
      }

      field.destroyValue(this.host);
      field.prepareValue(this.host, oldValue, value);

      changed.push([field, value, oldValue]);
    }

    super.setValues(values, emitChange)


    for (let field of this.model.getVirtualFields()) {
      field.dataChanged(Object.keys(values), this.host, emitChange);
    }


    if (emitChange || this.isNew) {
      for (let ch of changed) {
        this.onValueChanged(ch[0], ch[1], ch[2]); // Не должны никак менять объект при его загрузке
      }
    }    
  }
  
  get isChanged():boolean {
    return this.modifiedFields.length !== 0;
  }

  get hasAnyChanges():boolean {
    return this.isChanged || this.isChildrenChanged;
  }

  removeChangedStatus() {
    this.modifiedFields = [];
    this.isChildrenChanged = false;
  }

  // Информируем виртуальные поля о смене реальных, чтобы они могли перестроиться
  /*updateVirtualFields(fields:string[]=null) {
    for (let field of this.model.fields) {
      if (field instanceof BaseVirtualField) {
        field.dataChanged(fields, this);
      }
    }
  }*/

  onValueChanged(field:BaseField, newValue: RecordFieldValue, oldValue:RecordFieldValue) {
    /* При наследовании, здесь можно на изменение какого-то одного параметра менять другие. */
  }

  getDataObservable:Observable<Record>;
  getData(reload=false, ...fields:string[]):Observable<Record> {
    if (!reload && (this.isFull || this.isChanged || this.isNew)) { // TODO check if "fields" loaded in data
      return Observable.of(this.host);
    }
    else if (!this.getDataObservable) {
      var query = new Query(this.backend.getListModel(this.model.listName));
      query.add_q(new Q(this.getLookupData().condition));
      this.getDataObservable = this.backend.getRow(query, fields).map((rawRecord) => {
        this.isNew = false;
        this.setMessages({});// Перенести в initData? см. saveRecord
        this.init(rawRecord);
        this.loaded.next(this.host);
        this.getDataObservable = undefined;
        return this.host;
      }).catch((error, caught) => {
        this.getDataObservable = undefined;
        throw error;
      });
    }
    return this.getDataObservable;
  }

  getLookupData():RecordLookupData {
    if (this.isNew) {
      throw new Error('Can\' generate lookup data for not saved record.');
    }
    
    if (this.lookupData)
      return this.lookupData;

    // Используем не data, а _initData т.к. data могла и поменяться в процессе редактирования записи
    var result:Condition = {};
    for (let field of this.model.getLookupFields()) {
      if (!(field instanceof BaseDbField))
        continue;

      // Если новая запись, то неинициализированные поля будут установлены в default. Если старая, но мы не все поля установили, то они будут undefined
      
      if (this.initData[field.name] !== undefined)
        result[field.name] = this.initData[field.name];
    }
    return {condition: result, model: this.model};
  }

  setLookupData(lookupData:RecordLookupData) {
    this.lookupData = lookupData;
  }

  getDeleteQuery():DeleteQuery {
    var list:ListModel = this.backend.getListModel(this.model.listName);
    var query = new DeleteQuery(list);

    let condition = {};
    for (let field of this.model.getLookupFields()) { // django/db/model/base:919 _do_update=>filtered = base_qs.filter(pk=pk_val)
      condition[field.name] = this.initData[field.name];
    }
    query.add_q(new Q(condition));
    query.setInitiator(this.host);
    return query;
  }

  getSaveQuery(skipFields=[]):InsertQuery | UpdateQuery {
    var listModel:ListModel = this.backend.getListModel(this.model.listName);
    var query:InsertQuery | UpdateQuery;
    if (this.isNew) {
      query = new InsertQuery(this.model);
      var fields:BaseDbField[] = [];
      for (let field of this.model.getDbFields()) {
        //if (this.model.autoFields.indexOf(field.name) == -1)  // Должны иметь права устанавливать и AutoFields не автоматически
        fields.push(field);
      }
      query.insertValues(fields, [this.host]);
    }
    else {
      query = new UpdateQuery(listModel);

      let condition = {};
      for (let field of this.model.getLookupFields()) { // django/db/model/base:919 _do_update=>filtered = base_qs.filter(pk=pk_val)
        condition[field.name] = this.initData[field.name];
      }
      query.add_q(new Q(condition));

      let modifiedFields = {};
      for (let fieldName of this.modifiedFields) {
        modifiedFields[fieldName] = this.host[fieldName];
      }
      query.addUpdateValues(modifiedFields);
      query.setInitiator(this.host);
    }

    for (let virtualField of this.model.getVirtualFields()) {
      if (skipFields.indexOf(virtualField.name) !== -1)
        continue; // Если сохраняем Record из RelatedRecords, то мы не должны сохранять родительский Record(связи)
      var virtualFieldSaveQueries = virtualField.getSaveQueries(this.host[virtualField.name]);
      if (virtualFieldSaveQueries)
        query.addChildQuery(virtualField, virtualFieldSaveQueries);
    }

    return query;
    
  }

  save(commit=true, init=true):Observable<Record> {
    var query = this.getSaveQuery();
    return this.model.backend.saveRecord(query, this.uid, commit, init).map(recordRawData => {
      //var recordClass:typeof Record = Object.getPrototypeOf(this).constructor;
      //var newRecord = new recordClass(this.model, recordRawData);
      this.setMessages({}); // Перенести в initData?
      this.isNew = false;
      if (init) {
        this.init(recordRawData);
        this.loaded.next(this.host);
      }
      //this.saved.next(this.host);
      /*
      .flatMap((result:SaveRecordSucces) => { // Получаем уже сохраненные данные
      
      return this.getRow(result.query, result.fields); // После сохранения, если неправильно был Сформирован query, на этом процесс сохранения завершается и record.save().subscribe никогда не возникнет.
    })*/
      return this.host;
    }).catch((error, caught) => {//messages:RecordMessage[]
      if (error instanceof RecordSaveError) {
        this.setMessages(error.getMessages());
        return Observable.of(error);
      }
      throw Observable.throw(error)
    }).filter(res => !(res instanceof RecordSaveError));
  }

  delete():Observable<Record> {
    var query = this.getDeleteQuery();
    return this.model.backend.deleteRecord(query, this.uid).map(() => {
      this.isDeleted = true;
      this.setMessages({}); // Перенести в initData?
      //this.deleted.next(this.host);
      return this;
    }).catch((error, caught) => {//messages:RecordMessage[]
      if (error instanceof RecordSaveError) {
        this.setMessages(error.getMessages());
        return Observable.throw(error);
      }
      throw error;
    });
  }

  setMessages(messages:RecordErrorMessages) {
    this.messages = messages.common || [];

    this.fieldMessages.clear();
    for (let fieldName in messages.field ) {
      this.fieldMessages.set(fieldName, messages.field[fieldName]);
    }

    for (let fieldName in messages.virtualField ) {
      this.host[fieldName].setMessages(messages.virtualField[fieldName]);
    }

    this.messagesChanged.next(this.host);
  }
 
  /*deleteDataCache() {
    if (!this.data)
      return;

    this.data.destroy();
    this.data = null;
  }*/

  lock():Observable<boolean> {
    return this.model.backend.lockRecord(this.host);
  }

  unlock():Observable<boolean> {
    return this.model.backend.unlockRecord(this.host);
  }

  isLocked():Observable<boolean> {
    return this.model.backend.isRecordLocked(this.host);
  }

  hasEditPermission():Observable<boolean>{
    return this.model.backend.hasRecordEditPermission(this.host);
  }

  hasDeletePermission():Observable<boolean>{
    return this.model.backend.hasRecordDeletePermission(this.host);
  }

  extractRAWData():RecordRawData { // TODO смоделировать ситуацию когда установлен foreign key, который мы меняем и сохраняем родительскую запись.
    var rawData:RecordRawData = {};
    rawData[this.backend.modelNameField] = this.model.name;
    for (let field of this.model.fields) {
      if (field.name in this.data) {
        rawData[field.name] = field.fromInternalToRAW(this.data[field.name]);
      }
    }

    /*for (let serviceFieldName of this.model.serviceFields) {
      if (this._data[serviceFieldName]) {
        rawData[serviceFieldName] = this._data[serviceFieldName] as RecordStateData;
      }
    }*/
    return rawData;
  }

  /* Для создания Record as multiton */
  clone(withData=false, asNew=false, withAutofields=true, excludeFields:string[]=[]):Record {
    var rawData: RecordRawData = {};
    var recordClass:typeof Record = Object.getPrototypeOf(this.host).constructor;
    rawData[this.backend.modelNameField] = this.model.name;

    for (let field of this.model.getDbFields()) {
      var primaryKeyField = this.model.primaryKeys.indexOf(field.name) !== -1;
      var autoField = this.model.autoFields.indexOf(field.name) !== -1;
      if (field.name in this.data && excludeFields.indexOf(field.name) == -1 &&
            ( 
              (!asNew && primaryKeyField) || // Клонирование для последующей загрузки
              (withAutofields || !autoField)
            )
        ) {
        rawData[field.name] = field.fromInternalToRAW(this.data[field.name]);
      }
    }

    var newRecord = new recordClass(this.model, rawData, asNew);
    newRecord.__director__.isFull = this.isFull;
    return newRecord; 
  }

  /*destroy() {
    if (this.destroyed)
      return;
    this.destroyed = true;
    for (let field of this.model.fields) {
      field.destroyValue(this.host);
    }
    this.recordLookupChangedSubscription.unsubscribe();
  }*/

  /*fitCondition(condition:Condition):boolean {
    for (let key of Object.keys(condition)) {
      var conditionValue = condition[key];

      var field = this.model.getField(key, null);
      if (!field)
        return false;

      if (!field.compareValues(conditionValue, this.host[field.name]))
        return false;
    }
    return true;
  }*/

  fitLookup(lookupData:RecordLookupData):boolean {
    if (lookupData.model !== this.model)
      return false;
    var recordCondition = this.getLookupData().condition;
    var lookupCondition = lookupData.condition;

    for (let fieldName of Object.keys(lookupCondition)) {
      var field = this.model.getField(fieldName, null);
      if (!field)
        return false;

      if (!field.compareValues(recordCondition[field.name], lookupCondition[fieldName]))
        return false;
    }
    return true;
  }
}

export class Record extends ListRow {
  __director__:RecordDirector;

  constructor(model:RecordModel|RecordDirector, data?:RecordRawData, isNew?:boolean) {
    super(model instanceof RecordDirector ? model : new (model.backend.getRecordDirector(model))(model, data, isNew));
    if (!(data instanceof RecordDirector))
      this.__director__.init(data);
  }

  toString() {
    return this.__director__.model.representRecord(this);
  }

  
}
