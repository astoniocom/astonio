import {BaseDbField, BaseDbFieldParams} from './base';
import {Exact, IExact, GreaterThan, GreaterThanOrEqual, LessThan, LessThanOrEqual, In, Contains, IContains, StartsWith,
  IStartsWith, EndsWith, IEndsWith, Range} from '../query/lookups';
import {Backend} from '../base-backend';

export class CharField extends BaseDbField {
  internalName = 'CharField';
  lookups = [Exact, IExact, In, Contains, IContains, StartsWith, IStartsWith, EndsWith, IEndsWith];

  constructor(backend:Backend, params:BaseDbFieldParams) {
    super(backend, params);
  }
}