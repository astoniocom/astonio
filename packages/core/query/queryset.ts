import {ListModel} from '../models/list-model';
import {Backend} from '../base-backend';
import {Record} from '../datatypes/record';
import {ListRow} from '../datatypes/list-row';
import {Condition, Q} from './q';
import {utilRecordModelFromRawData} from '../utils';
import {Query, UpdateQuery} from './query';
import {RowDoesNotExistError, MultipleRowsReturnedError} from '../exceptions';
import {Observable} from 'rxjs';


export interface PagedRowsResult {
  rows: (Record|ListRow)[],
  lastRow: boolean
}

export class QuerySet {
  backend:Backend;
  model:ListModel;
  query:Query;


  constructor(model: ListModel, query?:Query) {
    this.model = model;
    this.query = query ? query : new Query(model);
    this.backend = model.backend;
  }

  private _clone():QuerySet {
    var query = this.query.clone();
    //#if self._sticky_filter:
    //#    query.filter_is_sticky = True
    var qsClass:typeof QuerySet = Object.getPrototypeOf(this).constructor;
    var clone = new qsClass(this.model, query);
    //#clone._for_write = self._for_write
    //#clone._prefetch_related_lookups = self._prefetch_related_lookups[:]
    //#clone._known_related_objects = self._known_related_objects
    //#clone._iterable_class = self._iterable_class
    //#clone._fields = self._fields
    
    ////clone.__dict__.update(kwargs)
    return clone;
  }

  filter(cond:Condition|Q):QuerySet {
    var q = (cond instanceof Q) ? cond : new Q(cond);
    return this._filter_or_exclude(false, q);
  }

  exclude(cond:Condition|Q):QuerySet {
    var q = (cond instanceof Q) ? cond : new Q(cond);
    return this._filter_or_exclude(true, q);
  }

  _filter_or_exclude(negate:boolean, cond:Q):QuerySet {
    //#if args or kwargs:
    //#    assert self.query.can_filter(), \
    //#        "Cannot filter a query once a slice has been taken."
    var clone = this._clone();
    if (negate)
      clone.query.add_q(cond.swapNegate());
    else
      clone.query.add_q(cond);

    return clone;
     
  }

  limit(start:number, stop:number) {
    var cloned_qs = this._clone();
    cloned_qs.query.setLimits(start, stop)
    return cloned_qs;
  }

  /*orderBy(fields:string[]):QuerySet {
    var cloned_qs = this._clone();
    cloned_qs.order = fields;
    return cloned_qs;
  }*/

  getRows(...fields:string[]):Observable<(Record|ListRow)[]> {
    return this.backend.getRows(this.query, fields).map(rawRows => {
      var records:(Record|ListRow)[] = [];
      rawRows.forEach(rawRow => {
        if (this.backend.modelNameField in rawRow) {
          var model = utilRecordModelFromRawData(this.backend, rawRow);
          records.push(model.constructRecord(false, rawRow));
        }
        else {
          records.push(new ListRow(rawRow, this.model));
        }
      });
      return records;
    });
  }

  count():Observable<number> {
    var alias = '__count';
    return this.backend.getRows(this.query.getCount(alias)).map(rawRows => {
      return rawRows[0][alias];
    });
  }

  getRow(...fields:string[]):Observable<Record|ListRow> {
    return this.limit(0,2).getRows(...fields).map(rows => {
      if (rows.length == 0) {
        throw new RowDoesNotExistError();
      }
      else if (rows.length > 1) {
        throw new MultipleRowsReturnedError();
      }
      else {
        return rows[0];
      }
    });
  }



  update(values:{[fieldName:string]: any}) { //django\db\models\query.py:_update
    var query = this.query.clone(UpdateQuery) as UpdateQuery;
    query.addUpdateValues(values); //Fields
    //return
  }


  orderBy(...fieldNames:string[]):QuerySet {
    var obj = this._clone();
    obj.query.clearOrdering(false);
    obj.query.addOrdering(...fieldNames);
    return obj
  }

  getOrdering():{[name:string]:string} {
    return this.query.getOrdering();
  }
}