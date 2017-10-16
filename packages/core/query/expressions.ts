import {BaseDbField} from '../fields/base';


export class Expression {
  constructor() {
    
  }
}

export class ColExpression extends Expression {
  alias:string;
  colName:string;

  constructor(alias:string, colName:string) {
    super();
    this.alias = alias;
    this.colName = colName;
  }
}

export class Col extends ColExpression {
  target:BaseDbField; 

  constructor(alias:string, target:BaseDbField) {
    super(alias, target.name);
    this.target = target;
  }

  
}

export class Star extends Expression {

}
