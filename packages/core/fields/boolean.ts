import {BaseDbField, BaseDbFieldParams, FromDBConvertingError} from './base';
import {Backend} from '../base-backend';
import {Exact, IExact, GreaterThan, GreaterThanOrEqual, LessThan, LessThanOrEqual, In, Contains, IContains, StartsWith,
  IStartsWith, EndsWith, IEndsWith, Range} from '../query/lookups';

export class BooleanField extends BaseDbField {
  internalName = 'BooleanField';
  lookups = [Exact];
  

  constructor(backend:Backend, params:BaseDbFieldParams) {
    super(backend, params);
    this.blank = true;
  }
  
  fromRAWtoInternal(value:string|number|boolean):boolean {
    if (value === null) {
      return null;
    }
    else if (typeof value == "boolean") {
      return value;
    } 
    else if (typeof value == "string") {
      var corectedValue = value.toLowerCase();
      if (corectedValue in ["true", "1", "t"])
        return true;
      else if (corectedValue in ["false", "0", "f"]) {
        return false;
      }
    }
    else if (typeof value == "number") {
      if (value == 1)
        return true;
      else if (value == 0)
        return false;
    }
    throw new FromDBConvertingError(this.internalName, value);
  }
}