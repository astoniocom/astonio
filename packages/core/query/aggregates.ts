import {Expression} from './expressions';

export class Aggregate extends Expression {
  expression:string;
  constructor(expression:string) {
    super();
    this.expression = expression;
  }
}

export class Count extends Aggregate {
  constructor(expression:string) {
    super(expression);
  }
}