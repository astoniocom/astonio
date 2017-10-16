import {ListModel} from '../models/list-model';
import {RecordModel} from '../models/record-model';
import {Q,  Condition, Connector} from './q';
import {Where} from './where';
import {Lookup} from './lookups';
import {BaseField, BaseDbField} from '../fields/base';
import {ForeignKeyVirtualField} from '../fields/foreign-key'
import {Aggregate, Count} from './aggregates';
import {Record} from '../datatypes/record';
import {Col, Expression, ColExpression} from './expressions';

var ORDER_DIR = {
    'ASC': ['ASC', 'DESC'],
    'DESC': ['DESC', 'ASC'],
}

function getOrderDir(field:string, def:string='ASC'):[string, string] {
    var dirn = ORDER_DIR[def];
    if (field[0] == '-')
        return [field.substr(1), dirn[1]];
    return [field, dirn[0]];
}

export class Query {
  model: ListModel;
  where:Where = new Where();
  used_aliases:Array<any>=[];
  lists:string[] = [];
  lowMark = 0; // Used for offset/limit
  highMark = null; // Used for offset/limit
  annotations = new Map<string, Aggregate>();
  defaultCols:boolean = true; // use default columns in SELECT statement
  orderBy:string[] = [];
  

  constructor(model: ListModel) {
    this.model = model;
    this.lists.push(model.name); // В Django-исходниках не нашел в какой момент инициализируется таблица
  }

  clone(klass?:typeof Query):Query {
    klass = klass ? klass : Object.getPrototypeOf(this).constructor;
    var query = new klass(this.model);
    query.lists = [];
    query.lists.push(...this.lists);
    query.where = this.where.clone();
    query.lowMark = this.lowMark;
    query.highMark = this.highMark;
    query.defaultCols = this.defaultCols;
    query.orderBy = [...this.orderBy]
    this.annotations = new Map(this.annotations);
    return query;
  }

  add_q(q_object:Q) {
    //#existing_inner = set(
    //#    (a for a in self.alias_map if self.alias_map[a].join_type == INNER)) //> set([])
    var clause:Where, _:boolean;
    [clause, _] = this._add_q(q_object, this.used_aliases) //>clause = (AND: <django.db.models.lookups.Exact>); _ = set([u'probus_routestop', u'probus_stop'])
    if (clause)
      this.where.add(clause, Connector.AND);
    //#self.demote_joins(existing_inner)
  }

  //# 
  //#   => clause = (AND: <django.db.models.lookups.Exact>); _ = set([u'probus_routestop', u'probus_stop'])
  _add_q(q_object:Q, used_aliases:string[]=[], branch_negated=false, current_negated=false, allow_joins=true, split_subq=true):[Where, boolean] {
    var connector = q_object.connector;
    var current_negated = current_negated !== q_object.negated; //# current_negated ^ q_object.negated
    var branch_negated = branch_negated || q_object.negated; //# branch_negated or q_object.negated
    var target_clause:Where = new Where(null, connector, q_object.negated);
    //#joinpromoter = JoinPromoter(q_object.connector, len(q_object.children), current_negated)
    var needed_inner = false;
    for (let child of q_object.children) {
      var child_clause:Where;
      if (child instanceof Q) { //# isinstance(child, Node):
        [child_clause, needed_inner] = this._add_q(child, used_aliases, branch_negated, current_negated, allow_joins, split_subq);
        //#    joinpromoter.add_votes(needed_inner)
        if (child_clause)
          target_clause.add(child_clause, connector)
      }
      else {
        for (let arg in child) {
          var value = child[arg];
          [child_clause, needed_inner] = this.build_filter([arg, value], branch_negated, current_negated, used_aliases, connector, allow_joins, split_subq);
          // #joinpromoter.add_votes(needed_inner)
          if (child_clause)
            target_clause.add(child_clause, connector)
        }
      }

      
    }
    
    return [target_clause, needed_inner];
  }

  build_filter(filter_expr:[string, any], branch_negated=false, current_negated=false, can_reuse=null, 
               connector=Connector.AND, allow_joins=true, split_subq=true):[Where, boolean] {
    var [arg, value] = filter_expr;
    //#if not arg:
    //#    raise FieldError("Cannot parse keyword query %r" % arg)
    var [lookups, parts, reffed_expression] = this.solve_lookup_type(arg); // Разбирает строку типа foobar__id__icontains на части
    if (!allow_joins && parts.length > 1)
      throw new Error("Joined field references are not permitted in this query");
    
    var used_joins;
    [value, lookups, used_joins] = this.prepare_lookup_value(value, lookups, can_reuse, allow_joins);

    var clause = new Where();
    if (reffed_expression) { // always false
      //#condition = self.build_lookup(lookups, reffed_expression, value)
      //#clause.add(condition, AND)
      //#return clause, []
    }

    //#opts = self.get_meta() // like model
    var opts = {}
    var alias:string = this.get_initial_alias(); // model_name
    var allow_many:boolean = !branch_negated || !split_subq;
    var field = this.model.getDbField(parts[0]);
    //#try:
    //#    field, sources, opts, join_list, path = this.setup_joins(parts, opts, alias, can_reuse=can_reuse, allow_many=allow_many)

    //#    # Prevent iterator from being consumed by check_related_objects()
    //#    if isinstance(value, Iterator):
    //#        value = list(value)
    //#    self.check_related_objects(field, value, opts)

    //#    # split_exclude() needs to know which joins were generated for the
    //#    # lookup parts
    //#    self._lookup_joins = join_list
    //#except MultiJoin as e:
    //#    return self.split_exclude(filter_expr, LOOKUP_SEP.join(parts[:e.level]),
    //#                              can_reuse, e.names_with_path)

    //#if can_reuse is not None:
    //#    can_reuse.update(join_list)
    //#used_joins = set(used_joins).union(set(join_list))
    //#targets, alias, join_list = self.trim_joins(sources, join_list, path)
    
    if (false) { //#field.is_relation
    //#    # No support for transforms for relational fields
    //#    num_lookups = len(lookups)
    //#    if num_lookups > 1:
    //#        raise FieldError('Related Field got invalid lookup: {}'.format(lookups[0]))
    //#    assert num_lookups > 0  # Likely a bug in Django if this fails.
    //#    lookup_class = field.get_lookup(lookups[0]) # Тет мы получаем класс, который преобразовывает входящее значение в нормализированное, например ForeignKey в 12545 !!!!!!!!!!!!11
    //#    if len(targets) == 1:
    //#        lhs = targets[0].get_col(alias, field)
    //#    else:
    //#        lhs = MultiColSource(alias, targets, sources, field)
    //#    condition = lookup_class(lhs, value)
    //#    lookup_type = lookup_class.lookup_name
    }
    else {
    //#    col = targets[0].get_col(alias, field)
      var col:Col = new Col(alias, field); // alias is table alias (table name for default table)
      var condition:Lookup = this.build_lookup(lookups, col, value);
    //#    lookup_type = condition.lookup_name
    }

    clause.add(condition, Connector.AND);

    //#require_outer = lookup_type == 'isnull' and value is True and not current_negated
    //#if current_negated and (lookup_type != 'isnull' or value is False):
    //#    require_outer = True
    //#    if (lookup_type != 'isnull' and (
    //#            self.is_nullable(targets[0]) or
    //#            self.alias_map[join_list[-1]].join_type == LOUTER)):
    //#        # The condition added here will be SQL like this:
    //#        # NOT (col IS NOT NULL), where the first NOT is added in
    //#        # upper layers of code. The reason for addition is that if col
    //#        # is null, then col != someval will result in SQL "unknown"
    //#        # which isn't the same as in Python. The Python None handling
    //#        # is wanted, and it can be gotten by
    //#        # (col IS NULL OR col != someval)
    //#        #   <=>
    //#        # NOT (col IS NOT NULL AND col = someval).
    //#        lookup_class = targets[0].get_lookup('isnull')
    //#        clause.add(lookup_class(targets[0].get_col(alias, sources[0]), False), AND)
    //#return clause, used_joins if not require_outer else ()
    return [clause, false];
  }

  setLimits(low:number, high:number=null) {
    if (high !== null) {
      if (this.highMark !== null)
        this.highMark = Math.min(this.highMark, this.lowMark + high);
      else
        this.highMark = this.lowMark + high;
    }
    if (low !== null) {
      if (this.highMark !== null)
        this.lowMark = Math.min(this.highMark, this.lowMark + low);
      else
        this.lowMark = this.lowMark + low;
    }

    if (this.lowMark == this.highMark)
      this.setEmpty();
  }

  setEmpty() {
    //this.where.add(NothingNode(), Connector.AND);
  }

  getCount(alias:string='__count'):Query {
    var obj = this.clone();
    obj.addAnnotation(new Count('*'), alias, true)
    //number = obj.get_aggregation(using, ['__count'])['__count']
    //if number is None:
    //    number = 0
    return obj;
  }

  addAnnotation(aggregate:Aggregate, alias:string, isSummary=false) {
    this.defaultCols = false;
    this.annotations.set(alias, aggregate);
  }

  solve_lookup_type(lookup:string):[string[], string[], boolean] { //lookops, parts, reffed_expression  lookup = route__stop__iexact
    var LOOKUP_SEP = '__';
    var lookupSplitted = lookup.split(LOOKUP_SEP);
    //#if self._annotations:
    //#    expression, expression_lookups = refs_expression(lookup_splitted, self.annotations)
    //#    if expression:
    //#        return expression_lookups, (), expression
    var _:any, field:BaseDbField, __:any, lookupParts:string[];
    [_, field, __, lookupParts] = this.namesToPath(lookupSplitted, this.model);
    var fieldParts:string[] = lookupSplitted.slice(0, lookupSplitted.length - lookupParts.length);
    if (lookupParts.length == 0) {
      lookupParts = ['exact']
    }
    else if (lookupParts.length > 1) {
      if (!fieldParts) {
        throw new Error('Invalid lookup "'+lookup+'" for model '+this.model.name+'".') // FieldError
      }
    }
    return [lookupParts, fieldParts, false];
  }

  namesToPath(names:string[], model:ListModel, allowMany=true, failOnMissing=false):[string[], BaseDbField, BaseDbField[], string[]] { // [path, Field, Field[], lookupsStr[]]
    var path:string[], names_with_path;
    [path, names_with_path] = [[], []];

    var pos = -1;
    for (let name of names) {
      pos++;
      //cur_names_with_path = (name, [])
      //if name == 'pk':
      //    name = opts.pk.name

      var field:BaseDbField = null;
      try {
        field = model.getDbField(name);
      }
      catch (e) {

      }

      if (field !== null) {
        //if field.is_relation and not field.related_model:
        //    raise FieldError(
        //        "Field %r does not generate an automatic reverse "
        //        "relation and therefore cannot be used for reverse "
        //        "querying. If it is a GenericForeignKey, consider "
        //        "adding a GenericRelation." % name
        //    )
        //try:
        //      model = field.model._meta.concrete_model
        //  except AttributeError:
        //      model = None
      }
      else {
        //pos -= 1
        //if pos == -1 or fail_on_missing:
        //    field_names = list(get_field_names_from_opts(opts))
        //    available = sorted(field_names + list(self.annotation_select))
        //    raise FieldError("Cannot resolve keyword %r into field. "
        //                      "Choices are: %s" % (name, ", ".join(available)))
        //break
      }

      //if model is not opts.model:
      //    # The field lives on a base class of the current model.
      //    # Skip the chain of proxy to the concrete proxied model
      //    proxied_model = opts.concrete_model

      //    for int_model in opts.get_base_chain(model):
      //        if int_model is proxied_model:
      //            opts = int_model._meta
      //        else:
      //            final_field = opts.parents[int_model]
      //            targets = (final_field.remote_field.get_related_field(),)
      //            opts = int_model._meta
      //            path.append(PathInfo(final_field.model._meta, opts, targets, final_field, False, True))
      //            cur_names_with_path[1].append(
      //                PathInfo(final_field.model._meta, opts, targets, final_field, False, True)
      //            )

      if (false) { //hasattr(field, 'get_path_info')
      //    pathinfos = field.get_path_info()
      //    if not allow_many:
      //        for inner_pos, p in enumerate(pathinfos):
      //            if p.m2m:
      //                cur_names_with_path[1].extend(pathinfos[0:inner_pos + 1])
      //                names_with_path.append(cur_names_with_path)
      //                raise MultiJoin(pos + 1, names_with_path)
      //    last = pathinfos[-1]
      //    path.extend(pathinfos)
      //    final_field = last.join_field
      //    opts = last.to_opts
      //    targets = last.target_fields
      //    cur_names_with_path[1].extend(pathinfos)
      //    names_with_path.append(cur_names_with_path)
      }
      else {
        var finalField = field;
        var targets = [field,];
        if (failOnMissing && pos + 1 !== names.length){
          throw new Error( 'Cannot resolve keyword "' +names[pos + 1]+ '" into field. Join on "' + name + '" not permitted.');
        }
        break;
      }
    };
    return [path, finalField, targets, names.slice(pos+1)];
  }

  prepare_lookup_value(value:any, lookups:string[], can_reuse:string[], allow_joins:boolean) {
    //## Default lookup if none given is exact.
    //#used_joins = []
    //#if len(lookups) == 0:
    //#    lookups = ['exact']
    //## Interpret '__exact=None' as the sql 'is NULL'; otherwise, reject all
    //## uses of None as a query value.
    //#if value is None:
    //#    if lookups[-1] not in ('exact', 'iexact'):
    //#        raise ValueError("Cannot use None as a query value")
    //#    lookups[-1] = 'isnull'
    //#    value = True
    //#elif hasattr(value, 'resolve_expression'):
    //#    pre_joins = self.alias_refcount.copy()
    //#    value = value.resolve_expression(self, reuse=can_reuse, allow_joins=allow_joins)
    //#    used_joins = [k for k, v in self.alias_refcount.items() if v > pre_joins.get(k, 0)]
    //## Subqueries need to use a different set of aliases than the
    //## outer query. Call bump_prefix to change aliases of the inner
    //## query (the value).
    //#if hasattr(value, 'query') and hasattr(value.query, 'bump_prefix'):
    //#    value = value._clone()
    //#    value.query.bump_prefix(self)
    //#if hasattr(value, 'bump_prefix'):
    //#    value = value.clone()
    //#    value.bump_prefix(self)
    //## For Oracle '' is equivalent to null. The check needs to be done
    //## at this stage because join promotion can't be done at compiler
    //## stage. Using DEFAULT_DB_ALIAS isn't nice, but it is the best we
    //## can do here. Similar thing is done in is_nullable(), too.
    //#if (connections[DEFAULT_DB_ALIAS].features.interprets_empty_strings_as_nulls and
    //#        lookups[-1] == 'exact' and value == ''):
    //#    value = True
    //#    lookups[-1] = 'isnull'
    return [value, lookups, []]
  }

  get_initial_alias():string {
    if (this.lists.length)
      return this.lists[0];
    else
      return this.model.name;
  }

  setup_joins(names:string[], opts:Object, alias:string, can_reuse:string[]=null, allow_many=true) {
    
  }

  build_lookup(lookups:string[], lhs:Col, rhs):Lookup {
    //#Tries to extract transforms and lookup from given lhs.
    //#The lhs value is something that works like SQLExpression.
    //#The rhs value is what the lookup is going to compare against.
    //#The lookups is a list of names to extract using get_lookup()
    //#and get_transform().
    lookups = [...lookups];
    for (let lookup of lookups) {
      var name = lookup;
    //#    # If there is just one part left, try first get_lookup() so
    //#    # that if the lhs supports both transform and lookup for the
    //#    # name, then lookup will be picked.
      if (lookups.length == 1) {
        var finalLookup = lhs.target.getLookup(name);
        if (!finalLookup) {
          //# We didn't find a lookup. We are going to interpret
          //# the name as transform, and do an Exact lookup against
          //# it.
          //lhs = self.try_transform(lhs, name, lookups)
          finalLookup = lhs.target.getLookup('exact')
        }
        return new finalLookup(lhs, rhs);
      }
    //#lhs = self.try_transform(lhs, name, lookups)
    //#lookups = lookups[1:]
    }
  }

  clearOrdering(forceEmpty:boolean) {
    this.orderBy = [];
    //self.extra_order_by = ()
    //if force_empty:
    //    self.default_ordering = False
  }

  addOrdering(...ordering:string[]) {
    /*errors = []
    for item in ordering:
        if not hasattr(item, 'resolve_expression') and not ORDER_PATTERN.match(item):
            errors.append(item)
        if getattr(item, 'contains_aggregate', False):
            raise FieldError(
                'Using an aggregate in order_by() without also including '
                'it in annotate() is not allowed: %s' % item
            )
    if errors:
        raise FieldError('Invalid order_by arguments: %s' % errors)*/
    if (ordering && ordering.length)
        this.orderBy.push(...ordering);
    //else:
    //    self.default_ordering = False

  }

  getOrdering():{[name:string]:string} {
    var result = {};
    var asc = 'ASC';

    this.orderBy.forEach((field, pos) => {
      var [col, order] = getOrderDir(field, asc)
      result[col] = order;
    });

    return result;
  }


}

export interface ChildQueryDescriber {
  handle: string, 
  query: Query
}

export class SaveQuery extends Query {
  childSaveQueries:Map<BaseField, ChildQueryDescriber[]> = new Map();


  addChildQuery(field:BaseField, describer:ChildQueryDescriber[]) {
    this.childSaveQueries.set(field, describer);
  }
  toSelectQuery():Query {
    return this;
  }
}

export class InsertQuery extends SaveQuery {
  records:Record[] = []; // objs // All records mush have same this.recordModel type
  recordModel: RecordModel;
  fields:BaseDbField[] = [];
  
  constructor(recordModel:RecordModel) {
    super(recordModel.backend.getListModel(recordModel.listName))
    this.recordModel = recordModel;
  }

  getLookupData():Condition {
    var condition:Condition = {};
    for (let field of this.records[0].__director__.model.getLookupFields()) {
      if (this.records[0][field.name]) // TODO Не факт что так надо. см. Backend/mysql for (let field of query.recordModel.getLookupFields())
        condition[field.name] = this.records[0][field.name];
    }

    return condition;
  }

  toSelectQuery():Query {
    if (this.records.length !== 1)
      throw new Error('Can\'t transform to select query if number of records is not equal 1.');
    var query = new Query(this.model)
    
    var record  = this.records[0];
    
    query.add_q(new Q(this.getLookupData() ));
    return query;
  }

  updateWithParentRecord(linkThrough:string, parentRecordRawData) {
    var linkField = this.model.getField(linkThrough);
    var condition = {};
    if (linkField instanceof ForeignKeyVirtualField) {
      for (let tableFieldName in linkField.keys) {
        let parentRecordFieldName = linkField.keys[tableFieldName];
        if (parentRecordRawData[parentRecordFieldName] === undefined)
          return; // !!!
        condition[tableFieldName] = parentRecordRawData[parentRecordFieldName];
      }
    }
    else {
      condition[linkThrough] = parentRecordRawData;
    }

    for (let record of this.records) {
      for (let key in condition) {
        record[key] = condition[key];
      }
    }
  }

  insertValues(fields:BaseDbField[], records:Record[]){
    this.fields = fields;
    this.records = records;
  }
}


export class UpdateQuery extends SaveQuery {
  values:[BaseDbField, any][] = [];
  initiator:Record;


  addUpdateValues(values:{[fieldName:string]: any}) {
    var valuesSeq = [];

    for (let name in values) {
      let val = values[name];
      let field = this.model.getField(name);
      valuesSeq.push([field, val])
    }

    return this.addUpdateFields(valuesSeq)
  }

  addUpdateFields(valuesSeq:[BaseDbField, any][]) {
    for (let f of valuesSeq) {
      let field = f[0];
      let val = f[1]; // Resolve ?
      this.values.push([field, val]);
    }

  }

  getLookupData(oldLookupData:boolean=false):Condition {
    var condition = {};


    this.where.children.forEach((lookup, idx) => {
      if (lookup instanceof Lookup) {
        condition[lookup.name] = lookup.rhs;
      }
    });

    if (!oldLookupData) {
      for (let f of this.values) {
        let field = f[0];
        let val = f[1]; 

        if (field.name in condition) 
          condition[field.name] = val;
      }
    }


    return condition;
  }

  toSelectQuery():Query { // Возможно, объездинить с getLookupData
    var query = new Query(this.model)
    query.where = this.where.clone();
    var condition = {};
    for (let f of this.values) {
      let field = f[0];
      let val = f[1]; // Resolve ?

      query.where.children.forEach((lookup, idx) => {
        if (lookup instanceof Lookup && lookup.name == field.name) {
          query.where.children.splice(idx,1);
          condition[field.name] = val;
        }
      });
    }
    query.add_q(new Q(condition));
    return query;
  }

  setInitiator(record:Record) {
    this.initiator = record;
  }
}

export class DeleteQuery extends SaveQuery {
  initiator:Record;

  setInitiator(initiator:Record) {
    this.initiator = initiator;
  }

  getLookupData():Condition {
    var condition = {};

    this.where.children.forEach((lookup, idx) => {
      if (lookup instanceof Lookup) {
        condition[lookup.name] = lookup.rhs;
      }
    });

    return condition;  
  }
}