import { Record } from './record';
import { BaseModel } from '../models/base-model';
import { DataItem, DataItemDirector } from './data-item';
import { Observable } from 'rxjs';
import {BaseField} from '../fields/base';

export type ListRowRawData = {
  [name: string]: string | number | Date | Object;
};

export type ListRowFieldValue = string | number | Date | Object | Record;
export type ListRowProcessedData = {
  [name: string]: ListRowFieldValue;
};

export class ListRowDirector extends DataItemDirector {
  host:ListRow;

  constructor(data: ListRowRawData, public model?: BaseModel) {
    super(data, (model && model.fields) ? model.fields.map((field)=> field.name) : undefined, false);
  }

  init(data) {
    var d = {};
    for (let fieldName of this.trackFields) {
      var value = data[fieldName];
      var field = this.getField(fieldName);
      if (field)
        value = field.fromRAWtoInternal(value);
      d[fieldName] = value;
    }
    //this.setValues(d, false);
    super.init(data);
  }

  getField(fieldName):BaseField {
    if (this.model) {
      return this.model.getField(fieldName)
    }
    return null;
  }

  /*extractRawData(): TableRowRawData { //Наверно, нет смысла в этом, т.к. table-row -- readonly
    var result:TableRowRawData = {};
    for (let fieldName of this.trackFields ) {
      if (fieldName in this._data)
        result[fieldName] = this.getValue(fieldName);
    }
    return result;
  }*/
  getData(): Observable<ListRow> {
    return Observable.of(this.host);
  }

}


export class ListRow extends DataItem {
  __director__:ListRowDirector;
  
  constructor(data: ListRowRawData|ListRowDirector, model?: BaseModel) {
    super(data instanceof ListRowDirector ? data : new ListRowDirector(data, model));

    if (!(data instanceof ListRowDirector))
      this.__director__.init(data);
  }

  toString(): string {
    return 'ListRow';
  }
}
