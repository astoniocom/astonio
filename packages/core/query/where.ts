import {Connector} from './q';
import {Lookup} from './lookups';

export class Where {
  children:(Where|Lookup)[] = [];
  connector:Connector = Connector.AND;
  negated:boolean = false;

  constructor(children=null, connector:Connector=Connector.AND, negated=false) {
    if (children)
      this.children = children; // TODO copy

    if (connector)
      this.connector = connector;

    this.negated = negated;
  }

  clone():Where {
    var clone = new Where(null, this.connector, this.negated);
    for (var child of this.children) {
        if ('clone' in child && child instanceof Where)
          clone.children.push(child.clone())
        else
          clone.children.push(child)
    }
    return clone;
  }

  add(data:Where|Lookup, conn_type:Connector, squash=true) {
    if (this.children.indexOf(data) !== -1) {
      return data
    }
    if (!squash) {
      this.children.push(data)
      return data
    }
    if (this.connector == conn_type) {
      if (data instanceof Where && !data.negated && (data.connector == conn_type || data.children.length==1)) {
        this.children.push(...data.children);
        return this;
      }
      else {
        // We could use perhaps additional logic here to see if some
        // children could be used for pushdown here.
        this.children.push(data);
        return data;
      }
    }
    else {
      var whereClass:typeof Where = Object.getPrototypeOf(this).constructor;
      var obj = new whereClass(this.children, this.connector, this.negated);
      this.connector = conn_type;
      this.children = [obj, data];
      return data;
    }
  }
}