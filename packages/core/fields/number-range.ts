import {BaseDbField, BaseDbFieldParams, FromDBConvertingError} from './base';
import {Exact, IExact, GreaterThan, GreaterThanOrEqual, LessThan, LessThanOrEqual, In, Contains, IContains, StartsWith,
  IStartsWith, EndsWith, IEndsWith, Range} from '../query/lookups';
import {Backend} from '../base-backend';

export class NumberRangeField extends BaseDbField {
  internalName = 'NumberRangeField';
  lookups = [Exact, Range];

  constructor(backend:Backend, params:BaseDbFieldParams) {
    super(backend, params);
  }
  
  /*getEmptyValue() {
    return [this.null] ? null : [null, null];
  }*/
}