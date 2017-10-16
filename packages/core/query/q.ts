export interface Condition {
  [name:string]:any
}

export enum Connector {
  AND, OR
}

export class Q {
  children:(Q|Condition)[] = [];
  connector:Connector = Connector.AND;
  negated:boolean = false;

  convertCondition(cond:Condition|Q|Q[]):(Condition|Q)[] {
    var result:(Condition|Q)[] = [];
    if (typeof cond == "object" && cond.hasOwnProperty('length')) {
      result.push(...(cond as Q[]));
    }
    else {
      result.push(cond);
    }
    return result;
  }
  
  constructor(children:Condition|Q|Q[]=null, connector=Connector.AND, negated=false) {
    if (children) {
      if (typeof children == "object" && children.hasOwnProperty('length')) {
        this.children.push(...children as Q[])
      }
      else {
        this.children.push(children)
      }
    }
    this.connector = connector;
    this.negated = negated;
  }

  _combine(other:Q, conn:Connector):Q {
    var obj:Q = new Q();
    obj.connector = conn;
    obj.add(this, conn);
    obj.add(other, conn);
    return obj;
  }

  _new_instance(children:(Condition|Q)[], connector:Connector=Connector.AND, negated:boolean=false):Q {
    var obj:Q = new Q();
    obj.children = children.slice();
    obj.connector = connector;
    obj.negated = negated;
    return obj;
  }

  clone():Q {
    var obj:Q = new Q();
    obj.children = this.children.slice();
    obj.connector = this.connector;
    obj.negated = this.negated;
    return obj;
  }

  swapNegate():Q {
    var clone = this.clone();
    clone.negated = !clone.negated;
    return clone;
  }

  add(q:Q, conn:Connector) {
    if (this.connector == conn) {
      if (q instanceof Q && !q.negated && (q.connector == conn || q.children.length == 1)) {
        this.children.push(...q.children);
        return this;
      }
      else {
        this.children.push(q);
        return q;
      }
    }
    else {
      var obj:Q = this._new_instance(this.children, this.connector, this.negated);
      this.connector = conn;
      this.children = [obj, q];
      return q;
    }
  }
  
  _normaliseCondition(cond:Condition|Q, negated=false):Q {
    if (cond instanceof Q) {
      if (cond.negated==false && negated==true) {
        return this._new_instance(cond.children, cond.connector, negated)
      }
      else if (cond.negated==true && negated==true) {
        return this._new_instance(cond.children, cond.connector)
      }
      return cond;
    }
    else {
      return new Q(cond, undefined, negated);
    }
  }

  AND(cond:Condition|Q):Q {
    return this._combine(this._normaliseCondition(cond), Connector.AND);
  }

  OR(cond:Condition|Q):Q {
    return this._combine(this._normaliseCondition(cond), Connector.OR);
  }

  AND_NOT(cond:Condition|Q):Q {
    return this._combine(this._normaliseCondition(cond, true), Connector.AND);
  }

  OR_NOT(cond:Condition|Q):Q {
    return this._combine(this._normaliseCondition(cond, true), Connector.OR);
  }
}

//var r = new Q({e:1}).OR_NOT(new Q({t:2}));
