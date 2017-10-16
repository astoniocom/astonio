import {Backend} from '../base-backend';
import {BaseField, BaseDbField, BaseVirtualField} from '../fields/base';


export interface BaseModelParams {
  name:string;
  fields?:BaseField[]; // Для таблицы, описания полей не обязательно, могут просто получаться записи
  verboseName?:string;
}

export abstract class BaseModel implements BaseModelParams {
  name:string;
  fields?:BaseField[]; // Для таблицы, описания полей не обязательно, могут просто получаться записи
  verboseName?:string;
  backend:Backend;
  private getDbFieldsCache:BaseDbField[];
  
  constructor (backend:Backend, params:BaseModelParams) {
    this.backend = backend;
    this.name = params.name;
    this.fields = params.fields;
    this.verboseName = params.verboseName;
    /*for (let key in params) {
      this[key] = params[key];
    }*/
  }

  getDbFields():BaseDbField[] {
    if (this.getDbFieldsCache)
      return this.getDbFieldsCache;
    var result:BaseDbField[] = [];
    for (let field of this.fields) {
      if (field instanceof BaseDbField)
        result.push(field);
    }
    this.getDbFieldsCache = result;
    return result;
  }

  getField(name:string, notFoundResult?:any):BaseField {
    for (let field of this.fields) {
      if (field.name == name)
        return field;
    }
    if (notFoundResult !== undefined)
      return notFoundResult;
    else
      throw new Error('Field "'+name+'" not found');
  }

  getDbField(name:string, notFoundResult?:any):BaseDbField {
    for (let field of this.fields) {
      if (field.name == name && field instanceof BaseDbField)
        return field;
    }
    if (notFoundResult !== undefined)
      return notFoundResult;
    else
      throw new Error('Field "'+name+'" not found');
  }

  hasField(name:string):boolean {
    return !!this.getField(name);
  }

  toString():string {
    return this.verboseName ? this.verboseName : (this.name.charAt(0).toUpperCase() + this.name.slice(1));
  }

}