import {Component, OnInit, Input, AfterViewInit, ChangeDetectorRef, OnDestroy} from '@angular/core';
import {BaseModel, Record, RecordList} from '@astonio/core';
import {DataItemListGridComponent, DataItemListGridOptions} from '../data-item-list-grid/data-item-list-grid.component';
import {ModelGridFieldDescriber, constructFieldsList, expandFieldList} from '../../utils/grid-utils';
import {Subscription} from 'rxjs';
import {WidgetsRegister} from '../../services/widgets-register/widgets-register.service';
import {GridColumn} from '@astonio/ui';

export interface RecordListGridOptions extends DataItemListGridOptions {
  fields?: ModelGridFieldDescriber[],
}

@Component({
  selector: 'ast-record-list-grid',
  templateUrl: '../../../ui/controls/grid/grid.html',
  inputs: ['columns', 'datasource', 'rowSelection', 'rows', 'edit', 'model', 'dataItemList:recordList', 'fields'],
})
export class RecordListGridComponent extends DataItemListGridComponent implements OnInit, AfterViewInit, OnDestroy, RecordListGridOptions {
  name = 'ast-record-list-grid';
  model:BaseModel|BaseModel[]; // На основании чего получаются данные о столбцах. Может быть как RecordModel, так и TableModel
  private messagesSubscription:Subscription;
  @Input() readonly: ModelGridFieldDescriber[] = [];
  

  _dataItemList:RecordList;
  set dataItemList(val:RecordList) {
    if (this._dataItemList !== val) {
      super.dataItemList = val;
    
      if (this.messagesSubscription)
        this.messagesSubscription.unsubscribe();

      this.messagesSubscription = this.dataItemList.messagesChanged.subscribe(record => this.displayRecordErrors(record));
    }
  }

  get dataItemList():RecordList {
    return this._dataItemList;
  }

  displayRecordErrors(record:Record) {
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
  }
  
  

  constructor(protected cdr:ChangeDetectorRef, protected widgetsRegister:WidgetsRegister) {
    super(cdr);
  }
  
  ngOnInit() {
    super.ngOnInit();
    
  }

  _fields:ModelGridFieldDescriber[] = [];
  set fields(value:ModelGridFieldDescriber[]) {
    if (this._fields == value)
      return;
    this._fields = value;
    this.prepareColumns();
    

  }

  get fields():ModelGridFieldDescriber[] {
    return this._fields;
  }

  prepareColumns() {
    if ((!this.fields || this.fields.length == 0) && this.model instanceof BaseModel) {
      this._fields = [];
      this.model.fields.forEach(field => {
        this.fields.push(field.name);
      });
    }    

    this.columns = [];
    this.columns.push('__status__');

    if (this.model && this.model instanceof BaseModel)
      this.columns.push(...this.expandFieldsList(this.widgetsRegister, this.model, this.fields, true));
  }

  expandFieldsList(widgetsRegister:WidgetsRegister, model: BaseModel, fields: ModelGridFieldDescriber[], allowDuplicates?:boolean):GridColumn[] {
    var readonlyFields = (this.readonly && this.readonly.length) ? expandFieldList(model, this.readonly, true) : undefined;
    return constructFieldsList(this.name, this.widgetsRegister, readonlyFields, model, fields, true);
  }

  ngAfterViewInit() {
    this.dataItemList.items.forEach(record => this.displayRecordErrors(record));
  }

  ngOnDestroy() {
    this.setRowData([]);
    super.ngOnDestroy();
    if (this.messagesSubscription)
      this.messagesSubscription.unsubscribe();
  }

  
}