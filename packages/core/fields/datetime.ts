import {BaseDbField, BaseDbFieldParams} from './base';
import {Exact, IExact, GreaterThan, GreaterThanOrEqual, LessThan, LessThanOrEqual, In, Contains, IContains, StartsWith,
  IStartsWith, EndsWith, IEndsWith, Range} from '../query/lookups';
import {Backend} from '../base-backend';

export class DateTimeField extends BaseDbField {
  internalName = 'DateTimeField';
  lookups = [Exact, GreaterThan, GreaterThanOrEqual, LessThan, LessThanOrEqual, In, Range];

  constructor(backend:Backend, params:BaseDbFieldParams) {
    super(backend, params);
  }

  // DB->JS
  fromRAWtoInternal(value:string|Date):Date {
    if (typeof value == "string") {
      var timestamp = Date.parse(value);
      if (!isNaN(timestamp)) {
        return new Date(value);
      }
      else {
        console.log("Date '"+value+"' can't be parsed and will be reset to null.");
        return null;
      }
    }
    else if (value instanceof Date) 
      return value;
    else if (value === null)
      return null;
    else {
      throw Error("Wrong date");
    }
  }

  compareValues(value:Date, value2:Date):boolean {
    return value == value2 || (value && value2 && value.getTime() == value2.getTime());
  }
}