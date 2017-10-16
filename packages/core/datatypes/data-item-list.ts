import {Subject, Subscription} from 'rxjs';
import {DataItem, FieldChangedEvent} from './data-item';

export class ListChangedEvent { // removed deleted
  constructor(
    public item: DataItem,
    public event: FieldChangedEvent
  ) {}
}

export class ListAddedEvent {
  constructor(
    public item: DataItem
  ) {}
}

export class ListRemovedEvent {
  constructor(
    public item: DataItem
  ) {}
}

export class ListClearedEvent {
  constructor(
  ) {}
}

export type DataItemListEvent = ListChangedEvent|ListAddedEvent|ListRemovedEvent|ListClearedEvent;

export class DataItemList {
  items:DataItem[] = [];
  changed = new Subject<DataItemListEvent>(); 
  private itemChangedSubscriptions:Map<DataItem, Subscription> = new Map();
  destroyed = false;
 
  constructor(items?:DataItem[], callInitItems=true) {
    if (items && callInitItems)
      this.initItems(items);
  }

  initItems(items?:DataItem[]) {
    this.clear(); //(false)

    items.forEach(item => {
      if (!(item instanceof DataItem))
        throw new Error('All items must have DataItem type.');
      this._addItem(item);
    });
  }

  protected _addItem(item:DataItem) {
    if (!this.items) { 
      this.items = [];
    }

    this.items.push(item);

    this.itemChangedSubscriptions.set(item, item.__director__.changed.subscribe(ev => {
      this.changed.next(new ListChangedEvent(item, ev));
    }));
  }

  add(...items:DataItem[]) {
    items.forEach(item => {
      this._addItem(item);
      this.changed.next(new ListAddedEvent(item));
    });
  }

  remove(...items:DataItem[]) { 
    this._remove(items);
  }

  protected _remove(items:DataItem[], emitChanged:boolean = true) {
    items.forEach(item => {
      var pos = this.items.indexOf(item);
      if (!this.items || !this.items.length || pos == -1)
        throw new Error('The DataItem is not in this list.');

      this.items.splice(pos, 1)
      this.itemChangedSubscriptions.get(item).unsubscribe();
      this.itemChangedSubscriptions.delete(item);
      if (emitChanged)
        this.changed.next(new ListRemovedEvent(item));
    });
  }

  clear() { // emitChanged=true Генерировать ли событие удаления каждой записи
    if (!this.items || !this.items.length)
      return;
    
    //if (emitChanged) {
      //this.items.forEach(item => {
      //  this.remove(item);
      //});
   // }
   // else {
   //   this.items = [];
      this._remove(this.items, false);
      /*this.itemChangedSubscriptions.forEach(subscription => {
        subscription.unsubscribe();
      });*/
      this.changed.next(new ListClearedEvent());
   //   this.subscriptions.clear();
   // }
  }

  /*destroy() {
    if (this.destroyed)
      return;
    this.destroyed = true;
    this._remove([...this.items], false);
  }*/

  toJSON() {
    return this.items;
  }
}