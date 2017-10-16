import {Record, RecordRawData} from './datatypes/record';
import {RecordModel} from './models/record-model';
import {Backend} from './base-backend';

export function utilRecordModelFromRawData(backend:Backend, data:RecordRawData|string|RecordModel):RecordModel {
  var model:RecordModel;

  if (typeof data == 'string') { // Название модели
    model = backend.getRecordModel(data);
  }
  else if (data instanceof RecordModel) {
    model = data;
  }
  else if (typeof data == 'object') {
    let modelName:string = (data[backend.modelNameField] as string);
    if (!modelName)
      throw new Error('RecordRawData must have model name, specified in backend.');
    model = backend.getRecordModel(modelName);
  }
  else 
    throw new Error('Property \'data\' has wrong type.');

  return model;
}