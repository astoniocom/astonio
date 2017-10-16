import {BaseVirtualField, BaseVirtualFieldParams} from './base';
import {Backend} from '../base-backend';
import {Record, RecordRawData, RecordStateData, RelFieldChangedEvent} from '../datatypes/record';
import {SaveQuery, ChildQueryDescriber} from '../query/query';
import {Subscription} from 'rxjs';

export interface ForeignKeyVirtualFieldParams extends BaseVirtualFieldParams {
  model:string; //RecordModelName
  keys: {[localFieldName:string]:string};//foreignTableFieldName
}

export class ForeignKeyVirtualField extends BaseVirtualField {
  internalName = 'ForeignKeyVirtualField';
  model:string; // target Record Model 
  keys: {[localFieldName:string]:string};

  constructor(backend:Backend, params:ForeignKeyVirtualFieldParams) {
    super(backend, params);
    this.model = params.model;
    this.keys = params.keys;
  }

  prepareValue(record:Record, oldValue:Record, newValue:Record) {
    if (newValue && newValue instanceof Record) {
      var subscriptions:Subscription[] = [];

      subscriptions.push(newValue.__director__.changed.subscribe(ev => {
        record.__director__.isChildrenChanged = true;
        record.__director__.changed.next(new RelFieldChangedEvent(this.name, newValue, ev))
      }));

      record.__director__.fieldData.set(this.name, subscriptions);
    }
  }

  destroyValue(record:Record) {
    if (record.__director__.fieldData.has(this.name)) {
      var subscriptions = record.__director__.fieldData.get(this.name) as Subscription[];
      subscriptions.forEach(s => s.unsubscribe());
    }
  }

  /*constructValue(record:Record):Record {
    var model = this.backend.getModel(this.model);
    var foreignRecordData = {};
    for (let key in this.keys) {
      foreignRecordData[this.keys[key]] = record[key];
    }
    return this.backend.constructRecord(model, false, foreignRecordData);
  }

  setValue(value:Record, record:Record) { //TODO используется ли?
    if (value.__director__.model.name !== this.name) 
      throw new Error(`New value can be based on ${this.name} model.`);
    value.__director__.getData().subscribe(newValueData => {
      for (let key in this.keys) {
        record[key] = newValueData[this.keys[key]];
      }
    });
  }*/

  constructRelRecordData(source:{}):RecordRawData {
    var recordData = {
      [this.backend.modelNameField]: this.model
    };
    for (let key in this.keys) {
      //if (!source[key]==undefined)
      //  return null;
      recordData[this.keys[key]] = source[key];
    }
    return recordData;
  }

  dataChanged(fields:string[]=null, record:Record, emitChange:boolean) { // TODO should destroy old record?
    var fieldsHave = false; // Определяем, есть ли интересующее нас поле в измененных полях
    if (fields instanceof Array) {
      for (let k in this.keys) {
        if (fields.indexOf(k) !== -1) {
          fieldsHave = true;
          break;
        }
      }
    }

    if (fields == null || fieldsHave) { // Изменения в реальных полях, должны менять виртуальное
      //1. Проверяем, если хоть одно поле Record null, то virtualfield должны установить в null 
      var virtualFieldMustBeEmpty = false;
      var valueToSet:Record;
      for (let key in this.keys) {
        var f = record.__director__.model.getDbField(key);
        if (record[key] == f.getEmptyValue()) {
          virtualFieldMustBeEmpty = true;
          break;
        }
      }

      if (virtualFieldMustBeEmpty) {
        if (record[this.name] !== null) {
          valueToSet = null; // TODO get empty value
        }
      }
      else {
        var recordData = this.constructRelRecordData(record);
        // this.name -- имя виртуального поля Record

        var isVirtualNeedToBeChanged = false;
        for (let key in this.keys) {
          if (!(record[this.name] instanceof Record) || (record[this.name] as Record)[this.keys[key]] !== record[key]) {
            isVirtualNeedToBeChanged = true;
            break;
          }
        }

        if (isVirtualNeedToBeChanged) {
          var model = this.backend.getRecordModel(this.model);
          valueToSet = model.constructRecord(false, recordData);
        }
      }

      if (valueToSet !== undefined) {
        var data = {};
        data[this.name] = valueToSet;
        record.__director__.setValues(data, emitChange);
      }
    }
    else if (fields.indexOf(this.name)!==-1) { // Изменения в виртуальном поле -- должны менять реальное
      if (!record[this.name]) { // Сброшено значение -- сбрасываем related
        var data = {};
        for (let key in this.keys) {
          var f = record.__director__.model.getDbField(key);
          data[key] = f.getEmptyValue();
        }
        record.__director__.setValues(data, emitChange);
      }
      else if (record[this.name] instanceof Record) {
        record.__director__.setValues(this.getRealValues(record[this.name], record), emitChange);
      }
    }
  }

  getRealValues(virtualValue:Record, hostRecord:Record):Object {
    var data = {};
    for (let key in this.keys) {
      if (this.keys[key] in virtualValue && virtualValue[this.keys[key]] !== hostRecord[key]) {
        data[key] = virtualValue[this.keys[key]];
      }
    }
    return data;
  }

  fromInternalToRAW(value:Record):RecordRawData {
    if (value instanceof Record) {
      return value.__director__.extractRAWData();
    }
    else {
      return null;
    };
  }

  fromRAWtoInternal(rawData:RecordRawData):Record {
    var model;
    if (this.backend.modelNameField in rawData) 
      model = rawData[this.backend.modelNameField];
    else 
      model = this.model;
    
    return this.backend.getRecordModel(model).constructRecord(false, rawData);
    
  }

  getSaveQueries(value:Record):ChildQueryDescriber[] {
    if (!value || !value.__director__.isFull)
      return null;

    var result:ChildQueryDescriber[] = [];
    
    return [{handle: '', query:value.__director__.getSaveQuery()}];
  }

}