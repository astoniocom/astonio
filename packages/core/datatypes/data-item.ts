import {Subject} from 'rxjs';

export class FieldChangedEvent {
  constructor(
    public fieldName: string,
    public oldValue: any,
    public newValue: any
  ) {}
}

export type DataItemData = {[name: string]: any};

export class DataItemDirector {
  host: DataItem
  trackFields:string[];
  changed = new Subject<FieldChangedEvent>();
  data = {};

  constructor(data:DataItemData, trackFields?:string[], runInit:boolean=true) {
    if (!trackFields) {
      trackFields = [];

      for (let fieldName in data) {
        trackFields.push(fieldName);
      }
    }
    this.trackFields = trackFields;
  }

  setHost(host:DataItem) {
    this.host = host;
  }

  init(data) {
    var d = {};
    for (let fieldName of this.trackFields) {
      d[fieldName] = data[fieldName];
    }
    this.setValues(d, false);
  }

  setValues(values:{[fieldName:string]: any}, emitChange=true, initStage=false) {
    for (let fieldName in values) {
      var value = values[fieldName];
      
      var oldValue = this.data[fieldName];

      this.data[fieldName] = value;

      if (emitChange) {
        this.changed.next(new FieldChangedEvent(fieldName, oldValue, value))
      }
    }
  }

  setValue(fieldName:string, value: any) {
    var data = [];
    data[fieldName] = value;
    this.setValues(data);
  }

  getValue(fieldName:string):any {
    return this.data[fieldName]; 
  }

}

export class DataItem {
  __director__:DataItemDirector;

  constructor(data?:DataItemData|DataItemDirector, trackFields?:string[]) {
    this.__director__ = data instanceof DataItemDirector ? data : new DataItemDirector(data, trackFields);
    this.__director__.setHost(this);

    for (let fieldName of this.__director__.trackFields) {
      Object.defineProperty(this, fieldName, {
        get: () => {
          return this.__director__.getValue(fieldName)
        },
        set: (newValue) => {
          if (this.__director__.data[fieldName] !== newValue)  {
            var d = {};
            d[fieldName] = newValue;
            this.__director__.setValues(d);
          }
        }
      });
    }

    if (!(data instanceof DataItemDirector))
      this.__director__.init(data);
  }

  toJSON() {
    return this.__director__.data;
  }
}