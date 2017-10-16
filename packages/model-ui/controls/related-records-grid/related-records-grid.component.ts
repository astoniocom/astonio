import {Component, OnInit, Input, AfterViewInit, ChangeDetectorRef, OnDestroy, Optional} from '@angular/core';
import {BaseModel, Record, RelatedRecords, Backend, ForeignKeyVirtualField} from '@astonio/core';
import {RecordListGridComponent, RecordListGridOptions} from '../record-list-grid/record-list-grid.component';
import {ModelGridFieldDescriber} from '../../utils/grid-utils';
import {Subscription} from 'rxjs';
import {WidgetsRegister} from '../../services/widgets-register/widgets-register.service';
import {BaseDataStorageService} from '@astonio/ui'; 

export interface RelatedRecordsGridOptions extends RecordListGridOptions {

}

@Component({
  selector: 'ast-related-records-grid',
  templateUrl: '../../../ui/controls/grid/grid.html',
  inputs: ['options', 'edit', 'model', 'dataItemList:relatedRecords', 'uid', 'fields'],
  host: {
    style: "display:flex"
  }
})
export class RelatedRecordsGridComponent extends RecordListGridComponent implements OnInit, AfterViewInit, OnDestroy, RelatedRecordsGridOptions {
  name = 'ast-related-records-grid';
  _dataItemList:RelatedRecords;
  set dataItemList(value:RelatedRecords) {
    if (value == this._dataItemList)
      return

    super.dataItemList = value;
    
    var isModelChanged = false;
    if (this.dataItemList.listModel && this.dataItemList.listModel !== this.model) {
      this.model = this.dataItemList.listModel;
      isModelChanged = true;
    }

    this._uid = !this.uid ? this.dataItemList.listModel.name+'_relatedRecords' : this.uid;

    if (!this.fields || this.fields.length == 0) {
      var linkedFields = this.dataItemList.getLinkedFields();
      if (linkedFields.length)
        this.fields = ['__repr__', {exclude:linkedFields} ];
    }

    this.prepareColumns();
    this.setupColumnsOrdering();

    if (this.isInit) {
      if (!this.dataItemList.record.__director__.isNew) {
        this.dataItemList.getRecords().subscribe(records => { // не в ngOnInit т.к. если данные в dataItemsList уже есть, то моментальный вызов setRowData Не сработает, т.к. не доступен grid api
          this.rows = records;
          if (isModelChanged)
            this.rebuild();
          else 
            this.setRowData(records);
          
        });
      }
      else if (isModelChanged) {
        this.rebuild();
      }
    }
  };

  get dataItemList():RelatedRecords {
    return this._dataItemList;
  }

  set fields(value:ModelGridFieldDescriber[]) {
    if (this._fields == value)
      return;
    super.fields = value;
    this.setupColumnsOrdering();
  }
  get fields():ModelGridFieldDescriber[] {
    return super.fields;
  }

  model:BaseModel|BaseModel[];

  private uid:string;
  private _uid:string;
  private columnResizedSubscription:Subscription;
  private recordSavedNotifSubscription:Subscription;
  

  constructor(protected cdr:ChangeDetectorRef, protected widgetsRegister:WidgetsRegister, @Optional() protected ds:BaseDataStorageService, protected backend:Backend) {
    super(cdr, widgetsRegister);
  }
  
  ngOnInit() {
    this.prepareColumns();
    this.setupColumnsOrdering();
    super.ngOnInit();
    
    
    
    this.columnResizedSubscription = this.columnResized.subscribe((ev) => {
      if (this.ds)
        this.ds.set(this.getColSizeStorageKey(ev.col.field || ev.col.id), ev.newSize);
    });

    this.recordSavedNotifSubscription = this.backend.recordSavedNotifications.subscribe(ev => {
      for (let record of this.dataItemList.items) {
        for (let field of record.__director__.model.getVirtualFields()) {
          if (!(field instanceof ForeignKeyVirtualField) || field.model !== ev.lookupData.model.name || !record[field.name])
            continue;
          
          if (ev.initiatorId !== (record[field.name] as Record).__director__.uid) {
            (record[field.name] as Record).__director__.getData(true).subscribe(newValue => {
              record.__director__.setValues((field as ForeignKeyVirtualField).getRealValues(newValue, record), true);
            });
          }
          else {
            record.__director__.setValues(field.getRealValues(record[field.name], record), true);
          }
        }
      }
    })
  }

  ngAfterViewInit() {
    super.ngAfterViewInit();

    if (!this.dataItemList.record.__director__.isNew) {
      this.dataItemList.getRecords().subscribe(records => { // не в ngOnInit т.к. если данные в dataItemsList уже есть, то моментальный вызов setRowData Не сработает, т.к. не доступен grid api
        this.setRowData(records);
      });
    }
  }

  ngOnDestroy() {
    super.ngOnDestroy();
    this.columnResizedSubscription.unsubscribe();
    this.recordSavedNotifSubscription.unsubscribe();
  }

  setupColumnsOrdering() {
    var orderingField;
    if (this.dataItemList.queryset && Object.keys(this.dataItemList.queryset.getOrdering()).length) {
      var orderingFields = Object.keys(this.dataItemList.queryset.getOrdering());
      if (orderingFields.length)
        orderingField = orderingFields[0];
    }
    else {
      for (let field of this.dataItemList.listModel.fields) {
        if (field.sorter && field.sorter.arrangeSupported)
          orderingField = field.name;
      }
    }

    /*setTimeout(() => {
    this.setSortModel([{field: orderingField, sort: 'asc'}]);
    });*/
    

    this.columns.forEach(col => {
      if (! (typeof col == "string") && this.ds) {
        var colSize = this.ds.get(this.getColSizeStorageKey(col.field || col.id));
        if (colSize) {
          col.width = colSize;
        }
      }

      if ((! (typeof col == "string")) && col.field !== undefined && col.field == orderingField) {  /* например, col.field !== undefined для __repr__*/
        col.sort = 'asc';
      }
    });
  }

  getColSizeStorageKey(colName:string):string {
    return this._uid+'_relatedRecordsGrid_colSize_'+colName;
  }

}