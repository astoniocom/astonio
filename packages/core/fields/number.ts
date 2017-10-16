import {BaseDbField, BaseDbFieldParams, FromDBConvertingError} from './base';
import {Exact, IExact, GreaterThan, GreaterThanOrEqual, LessThan, LessThanOrEqual, In, Contains, IContains, StartsWith,
  IStartsWith, EndsWith, IEndsWith, Range} from '../query/lookups';
import {Backend} from '../base-backend';

export class NumberField extends BaseDbField {
  internalName = 'NumberField';
  lookups = [Exact, GreaterThan, GreaterThanOrEqual, LessThan, LessThanOrEqual, In, Range];

  constructor(backend:Backend, params:BaseDbFieldParams) {
    super(backend, params);
  }
  
  fromRAWtoInternal(value:string|number):number {
    if (value == null) {
      return value as null;
    } else if (typeof value == "string") {
      return parseFloat(value);
    }
    else if (typeof value == "number") {
      return value;
    }
    throw new FromDBConvertingError(this.internalName, value);
  }

  /*getEmptyValue() {
    return this.null ? null : 0;
  }*/
}