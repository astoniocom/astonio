import {BaseDbFieldParams} from './base';
import {DateTimeField} from './datetime'
import {Exact, IExact, GreaterThan, GreaterThanOrEqual, LessThan, LessThanOrEqual, In, Contains, IContains, StartsWith,
  IStartsWith, EndsWith, IEndsWith, Range} from '../query/lookups';
import {BaseBackend} from '../base-backend';

export class DateField extends DateTimeField {
  internalName = 'DateField';

  constructor(backend:BaseBackend, params:BaseDbFieldParams) {
    super(backend, params);
  }

  // DB->JS
  fromRAWtoInternal(value:string|Date):Date {
    var date = super.fromRAWtoInternal(value);
    if (!date)
      return date;
    date.setHours(0,0,0,0);
    return date;
  }
}