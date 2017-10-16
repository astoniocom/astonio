import {Backend} from '../base-backend';
import {Record} from '../datatypes/record';
import {SaveQuery, ChildQueryDescriber} from '../query/query';
import {Lookup} from '../query/lookups';
import {BaseSorter} from './sorters/base';

export class BaseFieldEvent {

}

export class FromDBConvertingError extends Error {
  constructor(fieldType:string, value:any) {
    super(`Can't convert '${value}' to JS internal type. Field '${fieldType}'.`);
  }
}

export class NotImplementedError extends Error {
  constructor(fieldType:string, functionName:string) {
    super(`Function '${functionName}' not implement for field '${fieldType}'.`);
  }
}

export interface BaseFieldParams {
  name:string;
  emptyValue?: any;
  verboseName?:string;
  helpText?: string;
  sorter?: BaseSorter;
}

export class BaseField implements BaseFieldParams {
  internalName:string;

  name:string;
  emptyValue: any;
  verboseName:string;
  helpText: string;
  sorter: BaseSorter;
  backend:Backend;

  constructor(backend:Backend, params:BaseFieldParams) {
    for (let key in params) {
      this[key] = params[key];
    }
    if (!this.verboseName)
      this.verboseName = this.name.charAt(0).toUpperCase() + this.name.slice(1);
    this.backend = backend;
  }

  // DB->JS
  // recordData необходимы для виртуальных полей, они могут формировать значения на основании других полей
  // Backend must duing pre convertation from rawToInternal in format, accepded by this function in different fields.
  fromRAWtoInternal(value, record?:Record) {
    return value;
  }

  // JS->DB Используется при сериализации значения, в формат, понимаемый базой данных.
  // Тут на выходи, каждое поле, должно предлагать только один выходной формат, каторый понимали бы бекенды.
  fromInternalToRAW(value) {
    return value;
  }

  constructDefaultValue(record:Record) {
    return undefined;
    // TODO return this.default
  }

  checkValue(value):boolean {
    return true;
  }

  compareValues(value:any, value2:any):boolean {
    return value===value2;
  }

  cloneValue(asNew:boolean, value:any):any {
    return value;
  }

  getEmptyValue():any {
    return this.emptyValue;
  }

  prepareValue(record:Record, oldValue:any, newValue:any) {
    
  }

  destroyValue(record:Record) {

  }
}

export interface BaseDbFieldParams extends BaseFieldParams {
  maxLength?:number;
  null?: boolean;
  blank?: boolean;
  choices?: [any, string][];
  default?: any;
}

export abstract class BaseDbField extends BaseField implements BaseDbFieldParams {
  maxLength:number;
  null: boolean;
  blank: boolean;
  choices: [string|number, string][];
  default:any;
  lookups:typeof Lookup[] = [];

  constructor(backend:Backend, params:BaseDbFieldParams) {
    super(backend, params);
    //Object.assign(this, params);
  }

  constructDefaultValue(record:Record) {
    if (typeof this.default == "function")
      return this.default();
    else if (this.default !== undefined)
      return this.default;
    else if (this.null)
      return null
    throw new Error(`Can't get default value for field ${this.name}`);
  }

  getLookup(name:string):typeof Lookup {
    for (let lookupClass of this.lookups) {
      if (lookupClass.prototype.lookupName == name)
        return lookupClass;
    }
    return null;
  }

  getEmptyValue():any {
    var val = super.getEmptyValue();
    if (val !== undefined)
      return val;
    else if (this.null)
      return null;
    else
      throw new Error("Error while attempting to get empty value for field '"+ this.verboseName +"'.");
    
  }
}


export interface BaseVirtualFieldParams extends BaseFieldParams {
  
}

export class BaseVirtualField extends BaseField implements BaseVirtualField {
  backend:Backend;

  constructor(backend:Backend, params:BaseVirtualFieldParams) {
    super(backend, params);
  }

  /*setValue(value:any, record:Record) {
    throw new Error('SetValue is not defined');
  }*/

  dataChanged(fields:string[]=null, record:Record, emitChange:boolean) {

  }

  getSaveQueries(value:any):ChildQueryDescriber[] {
    return [];
  }
}