import {Component, OnInit, AfterViewInit, ChangeDetectorRef, OnDestroy, Optional, Input} from '@angular/core';
import {QuerySet, RecordList, Record, ListChangedEvent, Backend, BaseDbField} from '@astonio/core';
import {GridComponent, GridOptions} from '@astonio/ui';
import {ModelGridFieldDescriber, constructFieldsList, expandFieldList} from '../../utils/grid-utils';
import {Subscription, Observable, Subject} from 'rxjs';
import {WidgetsRegister} from '../../services/widgets-register/widgets-register.service';
import {BaseDataStorageService} from '@astonio/ui'; 
//import {getFieldInputComponent, ModelFieldsProcessor, instanceOfModelFieldsProcessor} from '../../utils/model-fields';

export interface QuerysetGridOptions extends GridOptions {
  fields?: ModelGridFieldDescriber[],
  trackRecords?: boolean
}

@Component({
  selector: 'ast-queryset-grid',
  templateUrl: '../../../ui/controls/grid/grid.html',
  inputs: ['columns', 'datasource', 'rows', 'edit', 'mode'],
  host: {
    style: "display:flex"
  }
})
export class QuerysetGridComponent extends GridComponent implements OnInit, AfterViewInit, OnDestroy {//, AfterViewInit
  @Input() rowSelection = true;
  @Input() fields: ModelGridFieldDescriber[];
  @Input() readonly: ModelGridFieldDescriber[];
  @Input() trackRecords: boolean = true;

  private recordCreatedNotifSubscription:Subscription;
  private recordSavedNotifSubscription:Subscription;
  private recordDeletedNotifSubscription:Subscription;

  private uid:string;
  private _uid:string;

  _queryset:QuerySet;
  @Input() set queryset(qs:QuerySet) {
    if (qs == this._queryset)
      return;
    var oldTable = this._queryset ? this._queryset.model : null;
    this._queryset = qs;
    //this.countQs = this._queryset.count().publishReplay(1, 5000).refCount().take(1);
    //this.countQs = this._queryset.count(); // TODO Чтобы пересчитывала в случае, когда используется фильтр. Нужно бы countQS привязать к query.where
    if (this.isInit) {
      if (oldTable && oldTable !== qs.model)
        this.rebuild();
      else
        this.refreshView();
    }

    if (!this.uid) {
      this._uid = qs.model.name+'_querysetGrid';
    }
      
  };

  get queryset():QuerySet {
    return this._queryset;
  }

  records = new RecordList();
  private countQs:Observable<number>;
  private messageSubscription:Subscription;
  private cachedRowRemovedSubscription:Subscription;
  private focusedRowChangedSubscription:Subscription;
  private recordChangedSubscription:Subscription;
  private recordLoadedSubscription:Subscription;
  private recordLookupChangedSubscription:Subscription;
  private getRowsSubscription:Subscription;
  private cellEditingStartedSubscription:Subscription;
  private columnResizedSubscription:Subscription;

  constructor(protected cdr:ChangeDetectorRef, protected backend:Backend, protected widgetsRegister:WidgetsRegister,
              @Optional() protected ds:BaseDataStorageService) {
    super(cdr);
  }
  
  ngOnInit() {
    if (!(this.queryset instanceof QuerySet) )
      throw new Error("Property 'queryset' must be defined and has QuerySet type");

    if (this.uid)
      this._uid = this.uid;

    this.datasource = true;
    
    if (!this.fields && this.queryset.model && this.queryset.model.fields) {
      this.fields = [];
      this.fields.push('__repr__');
      this.queryset.model.fields.forEach(field => {
        this.fields.push(field.name);
      });
    }  

    this.columns.push('__status__');

    if (this.queryset.model && this.queryset.model.fields) {
      var readonlyFields = (this.readonly && this.readonly.length) ? expandFieldList(this.queryset.model, this.readonly, true) : undefined;
      var fields = constructFieldsList('ast-queryset-grid', this.widgetsRegister, readonlyFields, this.queryset.model, this.fields, true);
      fields.forEach(field => {
        if (this.queryset.model.getDbField(field.field, null))
          field.sorting = true; // Для всех DB-полей разрешаем сортировку кликом по колонке // TODO: Подумать о Indexed-полях

        if (this.ds) {
          var colSize = this.ds.get(this.getColSizeStorageKey(field.field || field.id));
          if (colSize) {
            field.width = colSize;
          }
        }
      });
      this.columns.push(...fields);
    }
    var orderingFields = Object.keys(this.queryset.getOrdering());
    if (orderingFields.length) {
      this.columns.forEach(col => {
        if ((! (typeof col == "string")) && col.field == orderingFields[0]) {
          col.sort = this.queryset.getOrdering()[orderingFields[0]].toLowerCase();
        }
      });
    }
    super.ngOnInit();
    

  

    
    //this.agGrid.maxPagesInCache=2;
    this.messageSubscription = this.records.messagesChanged.subscribe(record => {
      // Copied from record-list-grid 
      var errors:{[fieldName:string]:string[]} = {};
      record.__director__.fieldMessages.forEach((value, key) => {
        if (!(key in errors))
          errors[key] = [];
        for (var val of value) {
          errors[key].push(val.message);
        }
      })
      this.setFieldErrors(record, errors);

      var recordErrors = [];
      record.__director__.messages.forEach(message => {
        recordErrors.push(message.message);
      })
      this.setRowErrors(record, recordErrors);
    });

    this.cachedRowRemovedSubscription = this.cachedRowRemoved.subscribe(record => {
      this.records.remove(record);
    });

    this.focusedRowChangedSubscription = this.focusedRowChanged.subscribe(ev => {
      if (ev.oldRowData instanceof Record && (ev.oldRowData as Record).__director__.hasAnyChanges) {
        (ev.oldRowData as Record).__director__.save().subscribe(() => {});
      }
    });

    this.recordChangedSubscription = this.records.changed.filter(ev => ev instanceof ListChangedEvent).subscribe((ev:ListChangedEvent) => {
      this.setRowChanged(ev.item);
      this.refreshRow(ev.item);
    });

    this.recordLoadedSubscription = this.records.recordLoaded.subscribe(record => {
      this.removeRowChanged(record);
      //this.replaceRowData();
      this.refreshRow(record);
    });

    this.cellEditingStartedSubscription = this.cellEditingStarted.subscribe(ev => {
      if (!(ev.rowData instanceof Record)){
        this.stopEditing();
      }
    });
    
    /*var lastElem;
    var timeout;*/
    this.getRowsSubscription = this.getRows/*.switchMap(<T>(res:T):Observable<T> =>  {
      
      if (timeout) {
        (lastElem as any).failCallback();
        clearTimeout(timeout);
      }
      lastElem = res;

      return Observable.create(w => {
        timeout = setTimeout(() => {
          w.next(res);
          timeout = null;
        }, 3000);
      })
    })*/.flatMap(params => {
      
      var ordering = [];
      params.sorting.forEach(s => {
        ordering.push( (s.sort == 'desc' ? '-' : '')+s.column );
      });

      var qs = this.queryset.limit(params.startRow, params.endRow)
      if (ordering.length) 
        qs = qs.orderBy(...ordering);
      return Observable.forkJoin(Observable.of(params), /*this.countQs*/this._queryset.count(), qs.getRows());
    }).subscribe(res => { 
      var gridQuery = res[0];
      var total = res[1];
      var records = res[2];
      this.records.add(...records);
      gridQuery.successCallback(records, total);
    });

    if (this.trackRecords) {
      this.recordCreatedNotifSubscription = this.backend.recordCreatedNotifications.subscribe(ev => {
        if (this.queryset.model.recordModels.indexOf(ev.lookupData.model.name) !== -1) 
          this.refreshViewDelayed();
      });

      this.recordSavedNotifSubscription = this.backend.recordSavedNotifications.subscribe(ev => {
        var isFound = false;
        this.records.items.forEach(record => {
          if (record.__director__.uid == ev.initiatorId) { // Ничего не делаем т.к. отслеживаем через recordChangedSubscription
            isFound = true;
          }
          else if (record instanceof Record && record.__director__.fitLookup(ev.lookupData)) {
            isFound = true;
            record.__director__.getData(true).subscribe(record => {
              this.removeRowChanged(record);
              this.refreshRow(record);
            })
          }
        });

        if (!isFound) { // Если не входил в данный список, но после сохранения стал входить в него. Поэтому на всякий случай обновляем весь список.
          if (this.queryset.model.recordModels.indexOf(ev.lookupData.model.name) !== -1) 
            this.refreshViewDelayed();
        }
      });

      this.recordDeletedNotifSubscription = this.backend.recordDeletedNotifications.subscribe(ev => {
        if (this.queryset.model.recordModels.indexOf(ev.lookupData.model.name) !== -1) 
          this.refreshViewDelayed();
      });
    }

    this.recordLookupChangedSubscription = this.backend.recordLookupChangedNotifications.subscribe(ev => {
      for (let record of this.records.items) {
        if (record.__director__.fitLookup(ev.oldLookupData) && record.__director__.uid !== ev.initiatorId) {
          record.__director__.setLookupData(ev.newLookupData);
        }
      }
    });

    this.columnResizedSubscription = this.columnResized.subscribe((ev) => {
      if (this.ds)
        this.ds.set(this.getColSizeStorageKey(ev.col.field || ev.col.id), ev.newSize);
    });
  }

  ngOnDestroy() {
    this.messageSubscription.unsubscribe();
    this.cachedRowRemovedSubscription.unsubscribe();
    this.focusedRowChangedSubscription.unsubscribe();
    this.recordChangedSubscription.unsubscribe();
    this.getRowsSubscription.unsubscribe();
    this.cellEditingStartedSubscription.unsubscribe();
    this.columnResizedSubscription.unsubscribe();

    if (this.recordCreatedNotifSubscription) 
      this.recordCreatedNotifSubscription.unsubscribe();
    if (this.recordSavedNotifSubscription)
      this.recordSavedNotifSubscription.unsubscribe();
    if (this.recordDeletedNotifSubscription)
      this.recordDeletedNotifSubscription.unsubscribe();
    if (this.recordLookupChangedSubscription)
      this.recordLookupChangedSubscription.unsubscribe();

    /*this.records.destroy();
    this.records = undefined;*/
    super.ngOnDestroy();
  }

  getColSizeStorageKey(colName:string):string {
    return this._uid+'_querysetGrid_colSize_'+colName;
  }

}