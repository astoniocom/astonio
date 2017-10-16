import {BaseField, BaseFieldParams, NotImplementedError} from './base';
import {RecordModel} from '../models/record-model';
import {Record, RecordRawData} from '../datatypes/record';
import {utilRecordModelFromRawData} from '../utils'
import {SaveQuery, ChildQueryDescriber} from '../query/query';
//TO нужен ли . да и поменять на BaseDbField

export interface ForeignRecordFieldParams extends BaseFieldParams {
  models: RecordModel[]
}

export class ForeignRecordField extends BaseField {
  internalName = 'ForeignRecordField';

  fromRAWtoInternal(value:RecordRawData):Record {
    var model:RecordModel = utilRecordModelFromRawData(this.backend, value);
    return model.constructRecord(false, value);
  }

  fromInternalToRAW(record:Record):RecordRawData {
    return record.__director__.extractRAWData();
  }

  getSaveQueries(value:Record):ChildQueryDescriber[] {
    var result:ChildQueryDescriber[] = [];
    if (!value)
      return [];
    return [{handle: '', query:value.__director__.getSaveQuery()}];
  }
}