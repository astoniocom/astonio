import {Observable, Subject, BehaviorSubject, Subscription} from 'rxjs';
import {Record, RecordChangedEvent, RecordStateData, RecordRawData, BaseVirtualFieldStateData} from './record';
import {RecordList} from './record-list';
import {Backend} from '../base-backend';
import {ListModel} from '../models/list-model';
import {utilRecordModelFromRawData} from '../utils';
import {Condition} from '../query/q';
import {QuerySet} from '../query/queryset';
import {SaveQuery, ChildQueryDescriber} from '../query/query';
import {ForeignKeyVirtualField} from '../fields/foreign-key';
import {BaseField} from '../fields/base';

//____TODO record/field not keys table??????
export class RelatedRecordParams {
  listModel?: ListModel; // Может быть не указано, если всегда с получением родительского объекта передаются данные потомков
  linkThrough?: string;
}

/*export interface RelatedRecordsStateData extends BaseVirtualFieldStateData {
  __state__: {
    isLoaded:boolean
  },
  records: RecordStateData[],
  removedRecords: RecordStateData[]
}*/

export class RelatedRecords extends RecordList { // Rename
  // Добавить поле типо инит, если было дата тру иначе фолс
  params: RelatedRecordParams;
  record: Record;
  backend:Backend;
  isLoaded:boolean = false;
  loaded = new Subject();
  markedToDelete:Record[] = [];
  listModel:ListModel; // может не быть !!!!УБРАТЬ????
  _queryset:QuerySet;
  get queryset():QuerySet {
    if (!this.record.__director__.isNew && !this._queryset) {
      this._queryset = this.getQueryset();
    }

    return this._queryset;
  }
  
  constructor(backend:Backend, record:Record, params?:RelatedRecordParams, data?:RecordRawData[]) { // RAW->Records!!!!
    super();
    this.backend = backend;
    this.record = record;
    this.params = params;
    this.listModel = this.params.listModel ? this.params.listModel : null;
    this.initData(data);
      

    //if (!records) // Т.к. если список пустой, этом ожет расцениваться, как будто просто удалили все записи.
    //  this.data = undefined; 
    
    // Эту проверку убрал, т.к. может быть необходим пустой список, в который будем добавлять записи
    //if (!data && !this.params)
    //  throw new Error('For related records must be specified "params" property if data is not in constructor.');
  }

  initData(data:RecordRawData[]) {
    this.isLoaded = false;
    if (!data)
      return;
    this.isLoaded = true;
    var records:Record[] = [];
    if (data.length) {
      data.forEach(rawRecord => {
        var model = utilRecordModelFromRawData(this.backend, rawRecord);
        records.push(model.constructRecord(this.record.__director__.isNew, rawRecord)); // Subscriptions within RecordList
      });
    }
    super.initItems(records);
  }

  getQueryset():QuerySet {
    var condition:Condition = {};

    if (!this.params.linkThrough)
      throw new Error(""); // TODO в таком виде related-records может работать только с установленной initData.

    var linkField = this.listModel.getField(this.params.linkThrough);
    if (linkField instanceof ForeignKeyVirtualField) {
      //result.push(this.params.linkThrough, ...Object.keys(linkField.keys));
      for (let tableFieldName in linkField.keys) {
        let parentRecordFieldName = linkField.keys[tableFieldName];
        if (this.record[parentRecordFieldName] === undefined)
          return undefined;
        condition[tableFieldName] = this.record[parentRecordFieldName];
      }
    }
    else {
      condition[this.params.linkThrough] = this.record;
    }


    
    return this.listModel.getQueryset().filter(condition);
  }


  getRecords(update=false):Observable<Record[]> {
    if (this.isLoaded && !update) {
      return Observable.of(this.items);
    }
    else if (!this.record.__director__.isNew) {
      return this.queryset.getRows().map(data => {
        this.initItems(data as Record[]); // Remove old within initData
        this.isLoaded = true;
        this.loaded.next(null);
        return data;
      });
    }
  }

  add(...records:Record[]):Observable<void> {
    if (!this.params.linkThrough)
      throw new Error(`'linkThrough' is not defined to add records.`)

    for (let field of this.listModel.getDbFields()) {
      if (field.sorter) {
        field.sorter.alterNewRecord(this.items, records);
      }
    }

    records.forEach(record => {
      if (this.listModel.recordModels.indexOf(record.__director__.model.name) == -1)
        throw new Error(`"${record.__director__.model.name}" record doesn't suit this list`);

      if (!record[this.params.linkThrough])
        record[this.params.linkThrough] = this.record;
      
      // Если добавили запись, потом её удалили и потом её же сново добавили. Убираем из списка помеченных на удаление.
      var markedToDelPos = this.markedToDelete.indexOf(record);
      if (markedToDelPos!==-1) {
        this.markedToDelete.splice(markedToDelPos, 1)
      }
    });



    var result = new BehaviorSubject<null>(null);
    if (!this.isLoaded) {
      this.getRecords().subscribe(data => {
        super.add(...records);
        result.next(null);
      })
    }
    else {
      super.add(...records);
      result.next(null);
    }
    return result;
    
    
  }

  remove(...records:Record[]) {
    records.forEach(record => {
      var pos = this.items.indexOf(record);
      if (pos!==-1) {
        if (!record.__director__.isNew)
          this.markedToDelete.push(record);
      };
    });
        
    super.remove(...records);
  }

  extractRAWData():RecordRawData[] { 
    // Если data == null || undefined -- значит, список не загружен, если пустой, значит все элементы удалены
    var result:RecordRawData[] = [];

    this.items.forEach(record => {
      result.push(record.__director__.extractRAWData());
    });

    return result;
  }

  clear() {
    /*this.markedToDelete.forEach(record => {
      record.__director__.destroy();
    })*/
    super.clear();
  }

  reset() {
    this.clear(); // false?
    //this.data = undefined;
    this.isLoaded = false;
  }

  markToDelete(record:Record) {

  }

  clone(asNew:boolean) {
    var rawData;

    if (this.isLoaded) {
      rawData=[];
      this.items.forEach(record => {
        rawData.push(record.__director__.clone(true, asNew, false));
      });
    }
    var rrClass:typeof RelatedRecords = Object.getPrototypeOf(this).constructor;
    return new rrClass(this.backend, this.record, this.params, rawData);
  }

  save() {
    //сохраняет новые, и измененные, удаляет помеченные для удаления
  }

  // Возвращает список полей (как реальных, так и виртуальных), которые участвуют в связывании с родительским record.
  getLinkedFields():string[] {
    if (!this.params.linkThrough)
      return;

    var result = [];
    var linkField = this.listModel.getField(this.params.linkThrough);
    if (linkField instanceof ForeignKeyVirtualField)
      result.push(this.params.linkThrough, ...Object.keys(linkField.keys));
    return result;
  }



  /*save(commit=true):Observable<boolean> {
    var result = new Subject();
    this.data.forEach(record => {
      record.save(commit);
    });
    return result;
  }*/

}