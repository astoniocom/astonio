import {BaseDbField} from '../fields/base';
import {Expression, ColExpression} from './expressions';
//TODO BaseField or BaseDbField
//export type Col = [string, BaseDbField];

export class Lookup {
  lookupName;
  verboseName;

  lhs:ColExpression;
  rhs:any;
  name:string;
  constructor(lhs:ColExpression, rhs:any) {
    this.lhs = lhs;
    this.rhs = rhs;
    this.name = lhs.colName;
  }
}

export class Exact extends Lookup {
  constructor(lhs:ColExpression, rhs:any) {
    super(lhs, rhs);
  }
}
Exact.prototype.lookupName = 'exact';
Exact.prototype.verboseName = '=';

export class IExact extends Lookup {
  constructor(lhs:ColExpression, rhs:string) {
    super(lhs, rhs);
  }
}
IExact.prototype.lookupName = 'iexact';
IExact.prototype.verboseName = '= (case-insensitive)';

export class GreaterThan extends Lookup {
  constructor(lhs:ColExpression, rhs:number|Date) {
    super(lhs, rhs);
  }
}
GreaterThan.prototype.lookupName = 'gt';
GreaterThan.prototype.verboseName = '>';

export class GreaterThanOrEqual extends Lookup {
  constructor(lhs:ColExpression, rhs:number|Date) {
    super(lhs, rhs);
  }
}
GreaterThanOrEqual.prototype.lookupName = 'gte';
GreaterThanOrEqual.prototype.verboseName = '>=';


export class LessThan extends Lookup {
  constructor(lhs:ColExpression, rhs:number|Date) {
    super(lhs, rhs);
  }
}
LessThan.prototype.lookupName = 'lt';
LessThan.prototype.verboseName = '<';

export class LessThanOrEqual extends Lookup {
  constructor(lhs:ColExpression, rhs:number|Date) {
    super(lhs, rhs);
  }
}
LessThanOrEqual.prototype.lookupName = 'lte';
LessThanOrEqual.prototype.verboseName = '<=';

export class In extends Lookup {
  constructor(lhs:ColExpression, rhs:any[]) {
    super(lhs, rhs);
  }
}
In.prototype.lookupName = 'in';
In.prototype.verboseName = 'in list';

export class Contains extends Lookup {
  constructor(lhs:ColExpression, rhs:string) {
    super(lhs, rhs);
  }
}
Contains.prototype.lookupName = 'contains';
Contains.prototype.verboseName = 'contains';

export class IContains extends Lookup {
  constructor(lhs:ColExpression, rhs:string) {
    super(lhs, rhs);
  }
}
IContains.prototype.lookupName = 'icontains';
IContains.prototype.verboseName = 'contains (case-insensitive)';

export class StartsWith extends Lookup {
  constructor(lhs:ColExpression, rhs:string) {
    super(lhs, rhs);
  }
}
StartsWith.prototype.lookupName = 'startswith';
StartsWith.prototype.verboseName = 'starts with';

export class IStartsWith extends Lookup {
  constructor(lhs:ColExpression, rhs:string) {
    super(lhs, rhs);
  }
}
IStartsWith.prototype.lookupName = 'istartswith';
IStartsWith.prototype.verboseName = 'starts with (case-insensitive)';

export class EndsWith extends Lookup {
  constructor(lhs:ColExpression, rhs:string) {
    super(lhs, rhs);
  }
}
EndsWith.prototype.lookupName = 'endswith';
EndsWith.prototype.verboseName = 'ends with';

export class IEndsWith extends Lookup {

  constructor(lhs:ColExpression, rhs:string) {
    super(lhs, rhs);
  }
}
IEndsWith.prototype.lookupName = 'iendswith';
IEndsWith.prototype.verboseName = 'ends with (case-insensitive)';

export class Range extends Lookup {

  constructor(lhs:ColExpression, rhs:[number, number]|[Date, Date]) {
    super(lhs, rhs);
  }
}
Range.prototype.lookupName = 'range';
Range.prototype.verboseName = 'between';