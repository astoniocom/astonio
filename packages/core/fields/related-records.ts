import {BaseVirtualField, BaseVirtualFieldParams, BaseField} from './base';
import {Backend} from '../base-backend';
import {RelatedRecords, RelatedRecordParams} from '../datatypes/related-records';
import {ListChangedEvent} from '../datatypes/data-item-list';
import {Record, RecordRawData, RelFieldChangedEvent} from '../datatypes/record';
import {ListModel} from '../models/list-model';
import {SaveQuery, ChildQueryDescriber} from '../query/query';
import {Subscription} from 'rxjs';

export interface RelatedRecordsVirtualFieldParams extends BaseVirtualFieldParams {
  listModelName?: string; // Может быть не указано, если всегда с получением родительского объекта передаются данные потомков
  linkThrough: string;
}

export class RelatedRecordsVirtualField extends BaseVirtualField  {
  internalName = 'RelatedRecordsVirtualField';
  listModelName: string; // Строка, т.к. при инициализации, могут быть не доступны все модели таблиц. Может быть не указано, если всегда с получением родительского объекта передаются данные потомков.
  linkThrough:string;

  constructor(backend:Backend, params:RelatedRecordsVirtualFieldParams) {
    super(backend, params);
    this.linkThrough = params.linkThrough;
  }

  prepareValue(record:Record, oldValue:RelatedRecords, newValue:RelatedRecords) {
    if (newValue && newValue instanceof RelatedRecords) {
      var s = newValue.changed.subscribe(ev => {
        if (ev instanceof ListChangedEvent && ev.event instanceof RelFieldChangedEvent && ev.event.value == record ) // Recursion protection
          return;
        record.__director__.isChildrenChanged = true;
        record.__director__.changed.next(new RelFieldChangedEvent(this.name, newValue, ev))
      });

      record.__director__.fieldData.set(this.name, s);
    }
  }

  destroyValue(record:Record) {
    if (record.__director__.fieldData.has(this.name)) {
      var s:Subscription = record.__director__.fieldData.get(this.name);
      s.unsubscribe();
    }
  }

  private _constructRRParams():RelatedRecordParams {
    return {listModel: this.backend.getListModel(this.listModelName), linkThrough: this.linkThrough};
  }
  

  constructDefaultValue(record:Record):RelatedRecords {
    var data = record.__director__.isNew ? [] : undefined;
    return new RelatedRecords(this.backend, record, this._constructRRParams(), data);
  }

  fromInternalToRAW(value:RelatedRecords):RecordRawData[] {
    if (value instanceof RelatedRecords && value.isLoaded) {
      return value.extractRAWData();
    }
    else {
      return null;
    };
  }

  fromRAWtoInternal(value:RecordRawData[], record?:Record):RelatedRecords {
    return new RelatedRecords(this.backend, record, this._constructRRParams(), value);
  }

  dataChanged(fields:string[]=null, record:Record) { // TODO should destroy old records?
    // меняем зависимые поля для записей, которые не сохранены.
    // Записи, которые удаляли, должны отдельно передаваться при сохранении
    // Записи, которые не трогали, остаются,как есть и база данных сама решает,что с ними делать на основании настроек
  } 

  getSaveQueries(value:RelatedRecords):ChildQueryDescriber[] {
    if (!value || !value.isLoaded)// TODO привести к общей концепции isLoaded isChanged(для record)
      return null;
      
    var result:ChildQueryDescriber[] = [];

    value.items.forEach(record => {
      if (record.__director__.isNew || record.__director__.hasAnyChanges)
        result.push({handle: `save__${record.__director__.uid}`, query:record.__director__.getSaveQuery([this.linkThrough])});
    });

    value.markedToDelete.forEach(record => {
      result.push({handle: `delete__${record.__director__.uid}`, query:record.__director__.getDeleteQuery()});
    });

    return result;
  }

  cloneValue(asNew:boolean, value:RelatedRecords):RelatedRecords {
    return value.clone(asNew)
  }
}