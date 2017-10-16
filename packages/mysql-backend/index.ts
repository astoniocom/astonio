import {BaseBackend, Record, RecordRawData, QuerySet, RecordModel, ListModel, ListRowRawData, Query, InsertQuery, UpdateQuery, SaveQuery, DeleteQuery,
  RecordModelParams, RecordErrorMessages,  ListModelParams, Q, RecordStateData, RecordSaveError, 
  RecordVirtualFieldErrorMessage, instanceOfRecordStateData, instanceOfRecordErrorMessage, ChildQueryDescriber, 
  RecordNotification, RecordCreatedNotification,RecordLookupChangedNotification, RecordSavedNotification, RecordDeletedNotification,
  SaveRecordSucces, instanceOf_SaveRecordSucces, WeightSorter, BaseDbFieldParams} from '@astonio/core';
import {DateTimeField, DateField, BaseField, BaseFieldParams, NumberField, CharField, TextField, NumberRangeField,
  ForeignKeyVirtualField, ForeignKeyVirtualFieldParams, RelatedRecordsVirtualFieldParams,  
  RelatedRecordsVirtualField, BaseDbField, BooleanField, DateRangeField, RowDoesNotExistError, MultipleRowsReturnedError} from '@astonio/core';
import {Observable, Subject, Observer} from 'rxjs'; 
import 'rxjs/add/operator/map';
import {Connection, createPoolCluster, createConnection, createPool, Pool, QueryError, RowDataPacket, OkPacket} from 'mysql2'; 
import {Compiler, InsertCompiler, UpdateCompiler, DeleteCompiler} from './compiler';
import {fromRAWtoInternal} from './converters';
import ssh from 'ssh2';



var supportedFields = {
  'bit': BooleanField,
  'datetime': DateTimeField,
  'date': DateField,
  'time': CharField,
  'year': NumberField,
  'timestamp': NumberField,
  'float': NumberField,
  'double': NumberField,
  'real': NumberField,
  'decimal': NumberField,
  'numeric': NumberField,
  'int': NumberField,
  'tinyint': NumberField,
  'smallint': NumberField,
  'mediumint': NumberField,
  'integer': NumberField,
  'bigint': NumberField,
  'varchar': CharField,
  'char': CharField,
  'enum': CharField,
  'point': CharField,
  'linestring': CharField,
  'tinytext': TextField,
  'text': TextField,
  'mediumtext': TextField,  
  'longtext': TextField,  
}
// Not supported
/* 
bit
tinyblob
blob
mediumblob
longblob
set
binary
varbinary
point
linestring,
polygon
geometry
multipoint
multilinestring
multipolygon
geometrycollection
*/

export interface SqlBackendConfig {
  host?: string,
  port?: number,
  user?: string,
  password?: string,
  database: string,
  stream?: any
} 



/*
function instanceOf_SaveRecordError(object: any): object is RecordErrorMessages {
  return object instanceof Array && (object.length > 0 && instanceOfRecordErrorMessage(object[0]));
}*/

interface SaveFieldValueError {
  [handle:string]: RecordErrorMessages
}

function instanceOf_SaveFieldValueError(object: any): object is SaveFieldValueError {
  if (typeof object != "object")
    return false;
  for (let key in object) {
    return instanceOfRecordErrorMessage(object[key])
  }  
  return false;
}

interface SaveFieldsValuesError {
  [handle:string]: RecordErrorMessages|SaveFieldValueError
}

function instanceOf_SaveFieldsValuesError(object: any): object is SaveFieldsValuesError {
  if (typeof object != "object")
    return false;
  for (let key in object) {
    return instanceOfRecordErrorMessage(object[key]) || instanceOf_SaveFieldValueError(object[key])
  }  
  return false;
}


export class SqlBackend extends BaseBackend {
  config: SqlBackendConfig;
  sshClient;
  pool:Pool;

  constructor(config: SqlBackendConfig) {
    super();
    this.config = config;
    
  }

  /*createMysqlConnectionPool(stream):Pool {
    this.pool = createPool({
      host     : this.config.host,
      port     : this.config.port,
      user     : this.config.user,
      password : this.config.password,
      database : this.config.database,
      connectionLimit : 30,
      stream   : stream,
      //charset: "utf8"
    });
    this.pool.on('connection', function (connection) {
      console.log(connection);
      connection.query('set names utf8')
    });
    this.pool.on('release', function (connection) {
      console.log('Connection %d released', connection.threadId);
    });
    this.pool.on('error', function() {
      console.log('s');
    });
  }*/

  _connection;
  getConnection():Observable<Connection> {
    /*return Observable.create(observer => {
      var connection = createConnection({
        host     : this.config.host,
        port     : this.config.port,
        user     : this.config.user,
        password : this.config.password,
        database : this.config.database,
        stream   : (cb, cc) => {
          //var e=  new ssh.Chanel();
          return this.sshClient.forwardOut('127.0.0.1', 0, 'localhost', 3306, (err, _stream) => {
            if (err) throw err;
            //_stream.pipe(e);
          });
          //return e;
        },
      });
        observer.next(connection);
        observer.complete();  
      
    });*/
    return Observable.create(observer => {
      var mysqlConfig = {
        host     : this.config.host,
        port     : this.config.port,
        user     : this.config.user,
        password : this.config.password,
        database : this.config.database,
      }

      if (this.config.stream && typeof this.config.stream == "function") {
        this.config.stream(stream => {
          mysqlConfig['stream'] = stream;
          var connection = createConnection(mysqlConfig);
          observer.next(connection);
          observer.complete(); 
        });
        /*stream.on('data', function(data) {
          console.log('STDOUT: ' + data);
        });
        stream.on('close', function(code, signal) {
          console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
        });*/
      }
      else {
        var connection = createConnection(mysqlConfig);
        observer.next(connection);
        observer.complete(); 
      }
    });
  }

  bootstrap():Observable<void> {
    var recordModelParams:RecordModelParams[] = [];
    var listModelParams:ListModelParams[] = [];
    var preRelated:{[model:string]: RelatedRecordsVirtualFieldParams } = {};

    this.getConnection().flatMap(connection => {
      var e= Observable.create(observer => {
        connection.query('SELECT table_name, table_type, table_comment FROM information_schema.tables WHERE `table_schema` = DATABASE()', (err: QueryError, tableRows: RowDataPacket[]) => {
          if (err) throw err;
          for (let tableRow of tableRows) {
            observer.next(tableRow);
          };
          observer.complete();
        });
      }).flatMap(tableRow => {
        var fieldsSubject = new Subject<RowDataPacket[]>();
        connection.query("\
          SELECT column_name, column_default, is_nullable, data_type, character_maximum_length, numeric_precision, \
            numeric_scale, column_type, column_comment, extra \
          FROM information_schema.columns \
          WHERE table_name = ? AND table_schema = DATABASE()", [tableRow['table_name']], (err: QueryError, mysqlFieldsData: RowDataPacket[]) => {
          if (err) throw err;
          fieldsSubject.next(mysqlFieldsData);
          fieldsSubject.complete();
        });
        

        var constraintsSubject = new Subject<RowDataPacket[]>();
        connection.query("\
          SELECT column_name, referenced_table_name, referenced_column_name, constraint_name\
          FROM information_schema.key_column_usage AS kc\
          WHERE\
            kc.table_schema = DATABASE() AND \
            kc.table_name = ?", [tableRow['table_name']], (err: QueryError, mysqlConstraintsData: RowDataPacket[]) => {
          if (err) throw err;
          constraintsSubject.next(mysqlConstraintsData);
          constraintsSubject.complete();
        }); 

        return fieldsSubject.zip(Observable.of(tableRow), constraintsSubject);
      }).finally(() => {
        //connection.release();
        connection.destroy();
      });
      return e;
    }).subscribe(res => {
      var rawFields = res[0] as Array<any>;
      var rawTable = res[1];
      var rawContraints = res[2] as Array<any>;
      var tableName = rawTable['table_name'];
      var verboseName = (rawTable['table_comment'] && rawTable['table_comment'].length && rawTable['table_comment'] !== 'VIEW') ? rawTable['table_comment'] : tableName;

      // ** Установка параметров в зависимости от типа таблицы
      var isTable = rawTable['table_type'].indexOf('TABLE') !== -1;
      if (isTable) { // Not is View
        var recordParams:RecordModelParams = {
          name: tableName,
          verboseName: verboseName,
          fields: [],
          primaryKeys: [],
          autoFields: [],
          listName: tableName
        }
      }
      var listParams:ListModelParams = {
        name: tableName,
        verboseName: verboseName,
        fields: [],
        primaryKeys: [],
        recordModels: isTable ? [tableName] : [],
        group: rawTable['table_type'] == 'VIEW' ? 'view': 'table',
      }

      // ** Добавление полей
      for (var mysqlField of rawFields) {
        var field:BaseField = this.prepareFields(tableName, mysqlField);
        listParams.fields.push(field); // Записи, виды

        if (mysqlField['extra'].indexOf('auto_increment') !== -1) {
          recordParams.autoFields.push(field.name);
        }

        if (isTable)
          recordParams.fields.push(field); // Только записи
      };
      listModelParams.push(listParams);

      if (isTable) {
        var foreignKeys:{[name:string]:ForeignKeyVirtualFieldParams} = {};
        // ** Установка ключевых полей
        for (let cd of rawContraints) {
          if (cd['constraint_name'] == 'PRIMARY') {
            recordParams.primaryKeys.push(cd['column_name']);
            listParams.primaryKeys.push(cd['column_name']);
          }
          else if (cd['referenced_table_name']) { // Почему-то ингда она бывает null
            if (!(cd['constraint_name'] in foreignKeys)) {
              foreignKeys[cd['constraint_name']] = {model: cd['referenced_table_name'], keys: {}, name: cd['constraint_name']};
            }
            foreignKeys[cd['constraint_name']].keys[cd['column_name']] = cd['referenced_column_name'];

            if (!(cd['referenced_table_name'] in preRelated)) {
              preRelated[cd['referenced_table_name']] = {
                name: cd['constraint_name']+'_set',
                listModelName: tableName,
                linkThrough: cd['constraint_name'],
              };
            }
          }
        }
        for (let key in foreignKeys) {
          recordParams.fields.push(new ForeignKeyVirtualField(this, foreignKeys[key]));
          listParams.fields.push(new ForeignKeyVirtualField(this, foreignKeys[key]));
        }
        recordModelParams.push(recordParams);
      }
    }, (error) => {

    }, () => {
      for (let recordParam of recordModelParams) {
        if (recordParam.name in preRelated) {
          recordParam.fields.push(new RelatedRecordsVirtualField(this, preRelated[recordParam.name]));
        }

        this.recordModels.set(recordParam.name, new RecordModel(this, recordParam))
      }

      for (let tableParam of listModelParams) {
        if (tableParam.name in preRelated) {
          tableParam.fields.push(new RelatedRecordsVirtualField(this, preRelated[tableParam.name]));
        }

        this.listModels.set(tableParam.name, new ListModel(this, tableParam))
      }

      this.bootstrapped.next(null);
      this.bootstrapped.complete();
    });
    return this.bootstrapped;
  }

  protected prepareFields(tableName:string, mysqlField:RowDataPacket):BaseDbField {
    
    var fieldClass:{new(backend:BaseBackend, fieldParams:BaseDbFieldParams): BaseDbField};
    if (mysqlField['column_name'] == "testrange") {
      fieldClass = NumberRangeField;
    } 
    else if (mysqlField['column_name'] == "testdaterange") {
      fieldClass = DateRangeField;
    } 
    else {
      if (!supportedFields[mysqlField['data_type']]) {
        console.log('Unknown field type '+ mysqlField['data_type']);
        fieldClass = CharField;
      }
      else {
        fieldClass = supportedFields[mysqlField['data_type']];
      }
    }
  
    var fieldParams:BaseDbFieldParams = {
      blank: true,
      default: fromRAWtoInternal(fieldClass, mysqlField['column_default']),
      maxLength: mysqlField['character_maximum_length'],
      name: mysqlField['column_name'],
      null: mysqlField['is_nullable'] == 'YES',
      verboseName: (mysqlField['column_comment'] && mysqlField['column_comment'].length) ? mysqlField['column_comment'] : mysqlField['column_name'],
      choices: null,
      emptyValue: null,
    };

    /*if (fieldClass == NumberField && !fieldParams['null']) {
      fieldParams['emptyValue'] = null;
    }*/

    if (fieldClass == CharField) {
      /*if (!fieldParams['null'])
        fieldParams['emptyValue'] = '';*/

      if (mysqlField['data_type'] == 'enum') {
        fieldParams['choices'] = [];
        for (let choice of mysqlField['column_type'].replace(/enum\(/g, '').replace(/\)/g, '').replace(/'/g, '').split(',')) {
          fieldParams['choices'].push([choice, choice]);
        }
      }
    }

    if (mysqlField['data_type'] == 'int' && (mysqlField['column_name'].indexOf("weight") !== -1 || mysqlField['column_name'].indexOf("order") !== -1) ) {
      fieldParams['sorter'] = new WeightSorter(mysqlField['column_name']);
    }

    var field:BaseDbField = new fieldClass(this, fieldParams);
    return this.getModelField(tableName, fieldParams.name, fieldClass, fieldParams);
  }

  getModelField(tableName:string, fieldName:string, fieldClass:{new(backend:BaseBackend, fieldParams:BaseDbFieldParams): BaseDbField}, fieldParams:BaseDbFieldParams):BaseDbField {
    return new fieldClass(this, fieldParams);
  }

  getQueryset(model:ListModel):QuerySet {
    var qs = new QuerySet(model);
    var weightField = model.getDbField('weight', null);
    if (weightField && weightField.internalName == "IntegerField")
        qs = qs.orderBy('weight');
    return qs; // TODO еще раз подумать, таким ли способом он должен получаться
  }

  getRow(query:Query, fields?:string[], conn?):Observable<RecordRawData|ListRowRawData> {
    var c = conn ? Observable.of(conn) : this.getConnection();
    return c.flatMap(connection => {
      return this.getRows(query, fields, connection).map((rawRows) => {
        if (rawRows.length == 0) {
          throw new RowDoesNotExistError();
        }
        else if (rawRows.length > 1) {
          throw new MultipleRowsReturnedError();
        }

        return rawRows[0];
      }).finally(() => {
        if (!conn) {
          connection.close();
        }
      });
    });
  }
     

  getRows(query:Query, fields?:string[], conn?):Observable<(RecordRawData|ListRowRawData)[]> {
    // Формируем список полей для этой модели, которые необходимо загружать
    //var result = new Subject<(RecordRawData|TableRowRawData)[]>(); 
    var c = conn ? Observable.of(conn) : this.getConnection();
    return c.flatMap(connection => {
      return Observable.create(observer => {
        var compiler = new Compiler(query);
        var [queryStr, queryParams] = compiler.compileQuery();
        //console.log(queryStr);
        connection.query(queryStr, queryParams, (err: QueryError, rawRows: RowDataPacket[]) => {
          if (err) {
            throw err;
          }
          
          observer.next(rawRows);
          observer.complete();
        });
      }).zip(Observable.of(fields)).flatMap(result => {
        var rawRows = result[0];
        var _fields = result[1];

        var resolveFields;
        if (_fields && _fields.length) {
          resolveFields = {};
          
          for (let requestField of _fields) {
            var found = false;  
            for (let modelField of query.model.fields) {
              if (requestField.indexOf(modelField.name) == 0) {
                found = true;
                if (! (modelField.name in resolveFields))
                  resolveFields[modelField.name] = [];

                if (requestField.indexOf(modelField.name+'__') === 0) {
                  let toadd = requestField.substr(modelField.name.length+2);
                  if (toadd.length>0)
                    resolveFields[modelField.name].push(toadd);
                }
                else if (requestField.length > (modelField.name+'__').length) {
                  throw new Error('Requested fields list "'+ requestField +'" has wrong format.');
                }
              }
            }
            if (!found)
              throw new Error('Some fields from "'+ requestField +'" not found or unavailable.');
          }
          
        }

        var virtualLoadObservers = [];

        for (let rawRow of rawRows) {
          for (let field of query.model.fields) {
            if (field.name in rawRow)
              rawRow[field.name] = fromRAWtoInternal(Object.getPrototypeOf(field).constructor, rawRow[field.name]);
          }

          if (!query.model.recordModels || !query.model.recordModels.length) // Значит не вид, а таблица
            continue
          
          rawRow[this.modelNameField] = query.model.name;
          
          // Сразу загружаем дочерние виртуальные поля, если надо
          if (resolveFields) {
            for (var fieldName in resolveFields) {
              var field = query.model.getField(fieldName);

              if (field instanceof ForeignKeyVirtualField) {
                // Для упрощения в этом бэкэнде, если серверный, то будет сложнее, но принцип тот же
                var relRecordInitData = field.constructRelRecordData(rawRow);
                var record = this.getRecordModel(field.model).constructRecord(false, relRecordInitData); // TODO Через query?
                var _query = new Query(this.getListModel(record.__director__.model.listName));
                _query.add_q(new Q(record.__director__.getLookupData().condition));
                virtualLoadObservers.push(this.getRow(_query, resolveFields[fieldName], connection).zip(Observable.of(fieldName), Observable.of(rawRow)));
              }
              if (field instanceof RelatedRecordsVirtualField) {
                let linkField = this.getRecordModel(field.listModelName).getField(field.linkThrough);
                if (linkField instanceof ForeignKeyVirtualField) {
                  var filter = {};
                  for (let localFieldName in linkField.keys) {
                    var hostFieldName = linkField.keys[localFieldName]; // TODO Fieldtypes
                    filter[localFieldName] = rawRow[hostFieldName];
                  }
                  var _query = new Query(this.getListModel(field.listModelName));
                  _query.add_q(new Q(filter));
                  virtualLoadObservers.push(this.getRows(_query, resolveFields[fieldName], connection).zip(Observable.of(fieldName), Observable.of(rawRow)));  
                }
                else {
                  throw new Error("Attention!");
                }
              }
            }
          }
        }


        if (virtualLoadObservers.length) {
          return Observable.forkJoin(...virtualLoadObservers).map(res => {
            for (let r of res) {
              var resolvedData = r[0];
              var fieldName = r[1];
              var parentRecord = r[2];
              parentRecord[fieldName] = resolvedData;
            }
            return rawRows;
          });
        }
        else {
          return Observable.of(rawRows);
        }
      }).finally(() => {
        if (!conn) {
          connection.close();
        }
      });
    });
  }

  update(query:UpdateQuery) {

  }

  _processNotifications(notifications:RecordNotification[]) {
    for (let notif of notifications) {
      if (notif instanceof RecordCreatedNotification)
        this.recordCreatedNotifications.next(notif);
      else if (notif instanceof RecordSavedNotification) {
        this.recordSavedNotifications.next(notif);
      }
      else if (notif instanceof RecordLookupChangedNotification) {
        this.recordLookupChangedNotifications.next(notif);
      }
      else if (notif instanceof RecordDeletedNotification)
        this.recordDeletedNotifications.next(notif);
    }
  }

  saveRecord(query:SaveQuery, initiatorId:string, commit:boolean=true, returnNewData:boolean=true):Observable<RecordRawData|null> {
    // Параметра fields нет, т.к. при сохранении должен вернуть record, со всеми fields, которые были в inRecord
    // Должен, но не обязан, может вернуть только сам Record. В этом случае в интерфейсе надо учитывать, что эти поля загружать отдельно.
    //var recordStateData = record.extractStateData();
    
    var notifications:RecordNotification[] = [];
    return this.getConnection().flatMap(connection => {
      return Observable.create(observer => {
        connection.beginTransaction(error => {
          if (error)
            throw error;
          observer.next();
          observer.complete();
        });
      }).flatMap(() => { // Сохраняем
        return this._saveRecord(connection, query, notifications, initiatorId);
      })
      .flatMap((result:SaveRecordSucces|RecordErrorMessages) => { // Коммитим
        if (!instanceOfRecordErrorMessage(result)) {
          return Observable.create(observer => {
            if (commit) {
              connection.commit(error => {
                if (error) {
                  throw error;
                }
                observer.next();
                observer.complete();
              });
            }
            else {
              connection.rollback(()=>{
                observer.next();
                observer.complete();
              });
            }
            
          })
          .map(() => {
            return result;
          });
        }
        else {
          if (!result['common'])
              result['common'] = [];
          result['common'].push({message: "Fix errors."});
          throw new RecordSaveError(result);
        }
      }) 
      .flatMap((result:SaveRecordSucces) => { // Получаем уже сохраненные данные
        setTimeout(() => {
          this._processNotifications(notifications);
        })
        
        if (returnNewData)
          return this.getRow(result.query, result.fields); // После сохранения, если неправильно был Сформирован query, на этом процесс сохранения завершается и record.save().subscribe никогда не возникнет.
        else 
          return Observable.of(null);
      })
      .finally(() => {
        connection.close();
      })
      .catch(error => {
        connection.rollback(()=>{
        });
        throw error;
      });
    });

      
  }

  deleteRecord(query:DeleteQuery, initiatorId:string):Observable<void> { // error -- RecordErrorMessages
    var notifications:RecordNotification[] = [];
    return this.getConnection().flatMap(connection => {
      return this._deleteRecord(connection, query, notifications, initiatorId).map(deleteResult => {
        if (instanceOfRecordErrorMessage(deleteResult)) {
          throw new RecordSaveError(deleteResult);
        };
        //this.recordDeletedEvent.next();
        this._processNotifications(notifications);
        return;
      }).finally(() => {
        connection.close();
      });
    })
  }

  private _saveRecord(connection, query:SaveQuery, notifications:RecordNotification[], initiatorId:string):Observable<SaveRecordSucces|RecordErrorMessages> {
    return Observable.create((observer:Observer<Query|RecordErrorMessages>) => { // Этап 1. Сохраняем текущую запись
      //var compilerClass;
      //var queryStr:string, queryParams:any[];
      var compiler;
      if (query instanceof InsertQuery)  {
        compiler = new InsertCompiler(query);
        //compilerClass = InsertCompiler;
        var result = compiler.compileInsert();
        if (result.length > 1)
          throw new Error('Can create only one record');
        var [queryStr, queryParams] = result[0];
      }
      else if (query instanceof UpdateQuery)  {
        compiler = new UpdateCompiler(query);
        var [queryStr, queryParams] = compiler.compileQuery();
      }
        
      connection.query(queryStr, queryParams, (err: QueryError, mysqlOk: OkPacket) => {
        if (mysqlOk == undefined && err.errno !== 1065) { //1065 - ER_EMPTY_QUERY: Query was empty
          var colRes = err.message.match(/Column '(.+)'/mi);
          var error:RecordErrorMessages = {field: {}};
          if (colRes && colRes.length == 2 && query.model.getDbField(colRes[1], null)) {
            error['field'][colRes[1]] = [{message:err.message}];
            observer.next(error);
          }
          else {
            error['common'] = [{message:err.message}];
            observer.next(error);
          }
          observer.complete();
          return;
        }
        if (mysqlOk && mysqlOk.warningCount)
          console.log('MySQL Warning! ' + mysqlOk.message + ' | '+ queryStr +' | ' + queryParams.toString());

        

        var selectQuery:Query = query.toSelectQuery(); // Формируем запрос для получения актуальной записи.
        selectQuery.setLimits(0,1);
        if (query instanceof InsertQuery) {
          for (let field of query.recordModel.getLookupFields()) { 
            if (query.recordModel.autoFields.indexOf(field.name) !== -1) {
              var condition = {};
              condition[field.name] = mysqlOk.insertId;
              selectQuery.add_q(new Q(condition))
            }
          }
        }

        // Формируем цепочку уведомлений о изминившихся записях
        var model = this.getRecordModel(query.model.name); // TableModel to RecordModel
        if (query instanceof InsertQuery) { // сообщается только в результате успешной транзакции
          notifications.push(new RecordCreatedNotification({model:model, condition:query.getLookupData()}, initiatorId));
        }
        else if (query instanceof UpdateQuery) {
          if (true)
            notifications.push(new RecordLookupChangedNotification({model:model, condition: query.getLookupData(true)}, {model:model, condition: query.getLookupData()}, initiatorId)) ;
          notifications.push(new RecordSavedNotification({model:model, condition: query.getLookupData()}, initiatorId)) ;
        }

        observer.next(selectQuery); 
        observer.complete();
      });
    }).flatMap((selectQueryOrError:Query|RecordErrorMessages) => { // Этап 2. Значения полей, где это нужно
      if (selectQueryOrError instanceof Query) {
        return this._saveFieldsValues(connection, selectQueryOrError, query.childSaveQueries, notifications, initiatorId).map(fieldsOrError => {
          if (instanceOf_SaveFieldsValuesError(fieldsOrError)) {
            var r:RecordErrorMessages = {
              virtualField: {}
            };
            for (let errFieldName in fieldsOrError) {
              r.virtualField[errFieldName] = fieldsOrError[errFieldName];
            }
            return r;
          }
          else {
            return {query: selectQueryOrError, fields:fieldsOrError};  
          }
        })
      }
      else {// RecordErrorMessages 
        return Observable.of(selectQueryOrError)
      }
    })
  }

  private _saveFieldsValues(connection:Connection, getParentQuery:Query, saveChildQueries:Map<BaseField, ChildQueryDescriber[]>, notifications:RecordNotification[], initiatorId:string):Observable<string[]|SaveFieldsValuesError> {
    // TODO Подумать, как не переполучать эту запись если родитель не изменился
    var getActualParentRecord:Observable<RecordRawData> = this.getRows(getParentQuery, [], connection).map(result => result[0]).publish().refCount();

    var virtualLoadObservers = [];

    saveChildQueries.forEach((queries:ChildQueryDescriber[], field:BaseField) => {
      if (queries)
        virtualLoadObservers.push(this._saveFieldValue(connection, queries, field, getActualParentRecord, notifications, initiatorId).zip(Observable.of(field)));
    });

    if (!virtualLoadObservers.length)
      return Observable.of([]);

    return Observable.forkJoin(...virtualLoadObservers).map((res:[SaveFieldValueError|string[], BaseField][]) => { // string = fieldsName[]
      let errors:SaveFieldsValuesError = {};
      let hasErrors = false;
      let result = new Set();
      for (let group of res) {
        let saveResult:SaveFieldValueError|string[] = group[0]; // fields
        let curField:BaseField = group[1];

        if (saveResult == null) // not loaded -- shouldn't add to lookup data on loading after saving
          continue;

        if (!instanceOf_SaveFieldValueError(saveResult)) {
          var fields = saveResult;
          
          if (fields.length) {
            for (let childFName of fields) {
              let resultFName = curField.name+'__'+childFName;
              result.add(resultFName);
            }
          }
          else {
            result.add(curField.name);
          }
        }
        else {
          hasErrors = true;
          errors[curField.name] = saveResult;
        }
      }
      return !hasErrors ? [...result] : errors;
    });
  }

  private _saveFieldValue(connection:Connection, queries:ChildQueryDescriber[], field:BaseField, getActualParentRecord:Observable<RecordRawData>, notifications:RecordNotification[], initiatorId:string):Observable<string[]|SaveFieldValueError> {
    var virtualLoadObservers:Observable<[SaveRecordSucces | RecordErrorMessages | null, string]>[] = [];//:Observable<[Query | RecordErrorMessages, string]>[]
   
    if (!queries.length)
      return Observable.of([]);

    for (let qd of queries) {
      var queryToSave: Observable<SaveQuery|DeleteQuery>;
      if (qd.query instanceof InsertQuery && field instanceof RelatedRecordsVirtualField) {
        queryToSave = getActualParentRecord.map(parentRecord => { // Обновляем query для сохранения данными (Напр. id) из родительской сохраненной записи.
          (qd.query as InsertQuery).updateWithParentRecord(field.linkThrough, parentRecord); // TODO избавиться от (field as RelatedRecordsVirtualField)
          return qd.query;
        });
      }
      else if (qd.query instanceof UpdateQuery || qd.query instanceof DeleteQuery) {
        queryToSave = Observable.of(qd.query);
      }

      if (qd.query instanceof InsertQuery || qd.query instanceof UpdateQuery) {
        virtualLoadObservers.push(
          queryToSave.flatMap(saveQuery => this._saveRecord(connection, saveQuery, notifications, initiatorId).zip(Observable.of(qd.handle)))
        );
      }
      else if (qd.query instanceof DeleteQuery) {
        virtualLoadObservers.push(
          queryToSave.flatMap(saveQuery => this._deleteRecord(connection, saveQuery as DeleteQuery, notifications, initiatorId).zip(Observable.of(qd.handle)))
        );
      }
    }

    return Observable.forkJoin(...virtualLoadObservers).map((data) => { // string -- handle like save__234234234_2
      let errors:SaveFieldValueError = {};
      let hasErrors = false;
      let result = new Set<string>();

      for (let group of data) {
        let handle:string = group[1];
        let saveResult:SaveRecordSucces | RecordErrorMessages | null = group[0]; // {query:Query, fields: string[]}
        if (instanceOf_SaveRecordSucces(saveResult)) {
          for (let childFName of saveResult['fields']) {
            result.add(childFName);
          }
        }
        else if (instanceOfRecordErrorMessage(saveResult)) { // saveResult:Query | boolean
          hasErrors = true; 
          errors[handle] = saveResult;
        }
      }

      return (!hasErrors) ? [...result] : errors;
    });
  }
  
  private _deleteRecord(connection, query:DeleteQuery, notifications:RecordNotification[], initiatorId:string):Observable<null|RecordErrorMessages> {
    var compiler = new DeleteCompiler(query);
    var [queryStr, queryParams] = compiler.compileQuery();
    return Observable.create((observer:Observer<null|RecordErrorMessages>) => {
      connection.query(queryStr, queryParams, (err: QueryError, mysqlOk: RowDataPacket[]) => {
        if (mysqlOk == undefined) {
          observer.next({common: [{message:err.message}]} as RecordErrorMessages);
          observer.complete();
          return;
        }
        
        var model = this.getRecordModel(query.model.name); // table model to record model
        notifications.push(new RecordDeletedNotification({model:model, condition:query.getLookupData()}, initiatorId));
        observer.next(null); 
        observer.complete();
      });
    })
  }
}

