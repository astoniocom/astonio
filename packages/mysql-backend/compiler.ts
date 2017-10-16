import {Query, Where, Connector, Count, Expression, Col, ColExpression, UpdateQuery, InsertQuery} from '@astonio/core';
import {BaseField, BaseDbField} from '@astonio/core';
import {fromInternalToRAW} from './converters';
import {Exact, IExact, GreaterThan, GreaterThanOrEqual, LessThan, LessThanOrEqual, In, Contains, IContains, StartsWith,
  IStartsWith, EndsWith, IEndsWith, Range} from '@astonio/core';
     
function zip(..._arguments) {
  var args = [].slice.call(_arguments);
  var shortest = args.length==0 ? [] : args.reduce(function(a,b){
      return a.length<b.length ? a : b
  });

  return shortest.map(function(_,i){
      return args.map(function(array){return array[i]})
  });
}



export class Compiler {
  query:Query;
  select:[Expression, [string, any[]], string][];

  constructor(query:Query) {
    this.query = query;
  }



  getSelect():[[Expression, [string, any[]], string][], any, any] { // expression, alias
    var select:[Expression, string][]= [];
    
    if (this.query.defaultCols) {
      for (var c of this.getDefaultColumns()) {
        select.push([c, null]);
      }
    }

    if (this.query.annotations.size > 0) {
      this.query.annotations.forEach((aggregate, alias) => {
        select.push([aggregate, alias]);
      });
    }

    var ret:[Expression, [string, any[]], string][] = [];
    for (var ex of select) {
      var col = ex[0];
      var alias = ex[1];
      ret.push([col, this.compile(col, true), alias])
    }

    return [ret, null, null];
  }

  getDefaultColumns():Col[] {
    var result:Col[] = [];
    this.query.model.getDbFields().forEach(field => { // mayby query get columns
      result.push(new Col(this.query.model.name, field));
    });
    return result;
  }

  getFromClause(query:Query):[string[], any[]] {
    return [query.lists, []]
  }

  compile(node:Expression, selectFormat=false):[string, any[]] {
    if (node instanceof ColExpression) {
      return [`\`${node.alias}\`.\`${node.colName}\``, []];
    }
    else if (node instanceof Count) {
      return [`Count(${node.expression})`, [] ];
    }
      
    throw new Error('Unknown Expression.');
  }
  
  compileWhere(where:Where):[string, Array<any>] { // where.py:63
    var result = [];
    var result_params = [];
    for (let child of where.children) {
      if (child instanceof Where) {
        var [query, params] = this.compileWhere(child);
        if (query) {
          result.push('('+query+')');
          result_params.push(...params);
        }
      }
      else { // child instanceof Lookup -- (Exact, ...)
        var [compiledExpression, compiledParams] = this.compile(child.lhs);
        result_params.push(...compiledParams);
        var val = fromInternalToRAW(child.rhs, (child.lhs instanceof Col) ? Object.getPrototypeOf(child.lhs.target).constructor : undefined);

        if (child instanceof Exact) {
          if (val !== null) {
            result.push(`${compiledExpression}=?`);
            result_params.push(val);
          }
          else {
            result.push(`${compiledExpression} IS NULL`);
          }
        }
        else if (child instanceof IExact) {
          if (val !== null) {
            result.push(`${compiledExpression}LIKE ?`);
            result_params.push(val);
          }
          else {
            result.push(`${compiledExpression} IS NULL`);
          }
        }
        else if (child instanceof Contains) {
          result.push(`${compiledExpression} LIKE BINARY ?`);
          result_params.push("%"+val+"%");
        }
        else if (child instanceof IContains) {
          result.push(`${compiledExpression} LIKE ?`);
          result_params.push("%"+val+"%");
        }
        else if (child instanceof StartsWith) {
          result.push(`${compiledExpression} LIKE BINARY ?`);
          result_params.push(val+"%");
        }
        else if (child instanceof IStartsWith) {
          result.push(`${compiledExpression} LIKE ?`);
          result_params.push(val+"%");
        }        
        else if (child instanceof EndsWith) {
          result.push(`${compiledExpression} LIKE BINARY ?`);
          result_params.push("%"+val);
        }
        else if (child instanceof IEndsWith) {
          result.push(`${compiledExpression} LIKE ?`);
          result_params.push("%"+val);
        }
        else if (child instanceof GreaterThan) {
          result.push(`${compiledExpression} > ?`);
          result_params.push(val);
        }
        else if (child instanceof GreaterThanOrEqual) {
          result.push(`${compiledExpression} >= ?`);
          result_params.push(val);
        }
        else if (child instanceof LessThan) {
          result.push(`${compiledExpression} < ?`);
          result_params.push(val);
        }
        else if (child instanceof LessThanOrEqual) {
          result.push(`${compiledExpression} <= ?`);
          result_params.push(val);
        }
        else if (child instanceof Range) {
          result.push(`(${compiledExpression} >= ? AND ${compiledExpression} <= ?)`);
          result_params.push(...val);
        }
        else {

        }
      }
    }
    var connector = (where.connector == Connector.AND) ? ' AND ': ' OR ';
    var resultQuery = result.length ? result.join(connector) : null;
    if (resultQuery) {
      if (where.negated)
        resultQuery = `NOT (${resultQuery})`;
      else
        resultQuery = `(${resultQuery})`;
    }

    return [resultQuery, result_params];
  }

  setupQuery() {
    var this_klass_info, this_annotation_col_map;
    [this.select, this_klass_info, this_annotation_col_map] = this.getSelect()
  }

  preQuerySetup() {
    this.setupQuery();
    var orderBy = this.getOrderBy();
    return [null, orderBy, null];
  }

  getOrderBy():string[] {
    var ordering = this.query.getOrdering();
    var orderBy = [];

    for (let key in ordering) {
      orderBy.push('`'+key + '` ' + ordering[key]);
    }

    return orderBy;
  }

  compileQuery():[string, any[]] {
    //django\db\models\sql\compiler.py:374  as_sql()
    var [extra_select, order_by, group_by] = this.preQuerySetup();

    var [from_, f_params] = this.getFromClause(this.query);
    var [where, w_params] = this.compileWhere(this.query.where);
    var params = [];
    var result = ['SELECT'];

    var outCols = [];
    for (var s of this.select) {
      var _, s_sql, s_params, alias;
      _ = s[0];
      s_sql = s[1][0];
      s_params = s[1][1];
      alias = s[2];

      if (alias)
        s_sql = `${s_sql} AS ${alias}`;
      params.push(...s_params);  
      outCols.push(s_sql);
    }
    result.push(outCols.join(', '));

    result.push('FROM');
    result.push(...from_);
    params.push(...f_params);

    
    if (where) {
      result.push(`WHERE ${where}`);
      params.push(...w_params);
    }

    if (order_by && order_by.length) {
      result.push(`ORDER BY ${order_by.join(', ')}`);
    }
    
    var withLimits=true;
    if (withLimits) {
      if (this.query.highMark !== null)
        result.push(`LIMIT ${this.query.highMark - this.query.lowMark}`);
      if (this.query.lowMark) {
        if (this.query.highMark == null) {
            var val = 18446744073709551615; //self.connection.ops.no_limit_value() django\db\backends\mysql\operations.py:120
            if (val)
              result.push(`LIMIT ${val}`);
        }
        result.push(`OFFSET ${this.query.lowMark}`);
      }
    }

    return [result.join(' '), params];
  }
}

export class InsertCompiler extends Compiler {
  query:InsertQuery;

  fieldAsSql(field:BaseField, val:any):[string, any[]] {
    var sql:string, params:any[];
    if (field == null) {
      // A field value of None means the value is raw.
      [sql, params] = val, []
    }
    else {
      [sql, params] = ['?', [val]];
    }

    return [sql, params];
  }
 
  assembleAsSql(fields:BaseDbField[], valueRows:(any[])[]):[string[], any[]] {


    if (!valueRows.length)
      return [[], []]
    
    var rowsOfFieldsAsSql = [];
    for (let row of valueRows) {
      let irow = [];
      let zipped:[BaseField, any][] = zip(fields, row); // [field, value ]
      for (let z of zipped) {
        let field:BaseField = z[0];
        let v:any = z[1];
        irow.push(this.fieldAsSql(field, v));
      }
      rowsOfFieldsAsSql.push(irow);
    }

    /* sql_and_param_pair_rows = (zip(*row) for row in rows_of_fields_as_sql) */
    var sqlAndParamPairRows = [];
    for (let row of rowsOfFieldsAsSql) {
      let irow = [];
      irow.push(zip(...row))
      sqlAndParamPairRows.push(irow)
    }

    var placeholderRows=[], paramRows=[];
    for (let row of sqlAndParamPairRows) {
      let row1 = [];
      let row2 = [];
      [row1, row2] = zip(...row)
      placeholderRows.push(...row1);
      paramRows.push(...row2);
    }

    let paramRows2 = [];
    for (let row of paramRows) {
      let irow = [];
      for (let ps of row) {
        irow.push(...ps);
      }
      paramRows2.push(irow);
    }
    paramRows = paramRows2;

    return [placeholderRows, paramRows];
  }

  compileInsert():[string, any[]][] {
    var result:string[] = [`INSERT INTO ${this.query.model.name}`];
    var hasFields = !!this.query.fields.length;
    var fields:BaseDbField[] = hasFields ? this.query.fields : [/*opts.pk*/];

    // vvv result.append('(%s)' % ', '.join(qn(f.column) for f in fields)) 
    var fieldsNames:string[] = [];
    for (let field of fields)
      fieldsNames.push(`\`${field.name}\``);
    result.push(`(${fieldsNames})`)

    var valueRows:(any[])[] = [];
    if (hasFields) {
      for (let record of this.query.records) {
        let recordValues = [];
        for (let field of this.query.fields) {
          recordValues.push(fromInternalToRAW(record[field.name], Object.getPrototypeOf(field).constructor));
        }
        valueRows.push(recordValues);
      }
    }
    else {
      // An empty object
      /*valueRows = [[self.connection.ops.pk_default_value()] for _ in self.query.objs]
      fields = [null];*/
    }

    var [placeholderRows, paramRows] = this.assembleAsSql(fields, valueRows)

    var finalResult:[string, any[]][] = [];
    var zipped = zip(placeholderRows, paramRows);
    for (let z of zipped) {
      let p = z[0];
      let vals = z[1];

      finalResult.push([(new Array(...result, `VALUES (${p.join(', ')})`)).join(' '), vals]);
    }

    return finalResult;
  }
}

export class UpdateCompiler extends Compiler {
  query:UpdateQuery;

  compileQuery():[string, any[]] {
    var values = [];
    var updateParams = [];
    for (let f of this.query.values) {
      let field = f[0];
      let val = f[1];
      let name = field.name; // field.column

      val = fromInternalToRAW(val, Object.getPrototypeOf(field).constructor);

      if (val != null) {
        values.push(`${name} = ?`);
        updateParams.push(val);
      }
      else {
        values.push(`${name} = NULL`);
      }
    }

    if (!values.length)
      return ['', []];

    var table = this.query.lists[0];
    var result = [
      `UPDATE ${table} SET`,
      values.join(', ')
    ];

    var [where, params] = this.compileWhere(this.query.where); // compile in django

    if (where) {
      result.push(`WHERE ${where}`);
      updateParams.push(...params);
    }

    return [result.join(' '), updateParams];
  }
}

export class DeleteCompiler extends Compiler {
  compileQuery():[string, any[]] {
    //assert len([t for t in self.query.lists if self.query.alias_refcount[t] > 0]) == 1, \
    //            "Can only delete from one table at a time."
    var table = this.query.lists[0];
    var result:string[] = [`DELETE FROM ${table}`];
    var [where, params] = this.compileWhere(this.query.where)
    if (where)
      result.push(`WHERE ${where}`);
    return [result.join(' '), params];
  }
}