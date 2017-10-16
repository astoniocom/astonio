import {Record, RecordChangedEvent, RecordStateData, RecordErrorMessages} from './record';
import {Subscription, Subject, Observable} from 'rxjs';
import {ListAddedEvent, ListRemovedEvent} from './data-item-list';
import {List} from './list';

export interface RecordListMessage {
  [uid:string]:RecordErrorMessages
}

export class RecordList extends List {
  items:Record[];
  messagesChanged = new Subject<Record>();
  //recordInit = new Subject<Record>();
  recordLoaded = new Subject<Record>();
  protected messagesSubscriptions:Map<Record, Subscription> = new Map();
  //protected initSubscriptions:Map<Record, Subscription> = new Map();
  protected loadedSubscriptions:Map<Record, Subscription> = new Map();

  constructor(items?:Record[], callInitItems=true) {
    super(items, false);

    if (items && callInitItems)
      this.initItems(items);
  }

  protected _addItem(item:Record) {
    super._addItem(item);

    if (item instanceof Record) { // if DataItem
      var s = item.__director__.messagesChanged.subscribe(record => {
        this.messagesChanged.next(record);
      });

      this.messagesSubscriptions.set(item, s);

      /*var s2 = item.init.subscribe(record => {
        this.recordInit.next(record);
      });

      this.initSubscriptions.set(item, s2);*/

      var s3 = item.__director__.loaded.subscribe(record => {
        this.recordLoaded.next(record);
      });

      this.loadedSubscriptions.set(item, s3);
    }
  }

  remove(...records:Record[]) {
    super.remove(...records);
  }

  _remove(records:Record[], emitChanged:boolean = true) {
    records.forEach(record=>{
      if (record instanceof Record) { // if DataItem
        if (this.messagesSubscriptions.has(record)) {
          this.messagesSubscriptions.get(record).unsubscribe();
          this.messagesSubscriptions.delete(record);
        }

        //this.initSubscriptions.get(record).unsubscribe();
        //this.initSubscriptions.delete(record);
        if (this.loadedSubscriptions.has(record)) {
          this.loadedSubscriptions.get(record).unsubscribe();
          this.loadedSubscriptions.delete(record);
        }

        //record.__director__.destroy();
      }
    });

    super._remove(records, emitChanged);
  }

  clear() { //emitChanged=true
    super.clear(); //(emitChanged)

    /*this.messagesSubscriptions.forEach(s => s.unsubscribe());
    this.messagesSubscriptions.clear();*/
  }

  setMessages(messages:RecordListMessage) {
    for (let handle in messages) {
      var actionsName:string;
      var uid:string;
      [actionsName, uid] = handle.split('__');
      this.findRecordByUID(uid).__director__.setMessages(messages[handle]);
    }
  }

  /*findRecordByPK(modelName:string, pk:number|string):Record {
    if (!this.data)
      return null;

    for (let key in this.data) {
      var record = this.data[key];
      if (record.model.name==modelName && record.pk) {
        return record;
      }
    }
  }*/

  findRecordByUID(uid:string):Record {
    if (!this.items)
      return null;

    for (let key in this.items) {
      var record = this.items[key];
      if (record.__director__.uid == uid) {
        return record;
      }
    }
  }

  /*removeIndex(index) {
    if (!this.data)
      return; //Exception? Separate class for data ??????????????????????????????????
    if (this.data.length > index)
      this._removeRecordFromData(this.data[index]);
  }*/
}