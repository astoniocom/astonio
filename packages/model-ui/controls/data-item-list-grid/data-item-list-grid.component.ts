import {Component, OnInit, Input, AfterViewInit, ChangeDetectorRef, OnDestroy} from '@angular/core';
import {DataItemList, ListRemovedEvent, ListAddedEvent, ListChangedEvent, ListClearedEvent} from '@astonio/core';
import {GridComponent, GridOptions, GridColumn, instanceOfGridColumn} from '@astonio/ui';
import {ModelFieldsProcessor, instanceOfModelFieldsProcessor} from '../../utils/model-fields';
import {Subscription} from 'rxjs';

export interface DataItemListGridOptions extends GridOptions {

}

@Component({
  selector: 'ast-data-item-list-grid',
  templateUrl: '../../../ui/controls/grid/grid.html',
  inputs: ['options', 'mode', 'dataItemList'],
})
export class DataItemListGridComponent extends GridComponent implements OnInit, OnDestroy, DataItemListGridOptions {//, AfterViewInit

  private dataItemListChangedSubscription:Subscription;

  protected _dataItemList:DataItemList;
  set dataItemList(val:DataItemList) {
    if (this._dataItemList !== val) {
      this._dataItemList = val;

      if (this.dataItemListChangedSubscription)
        this.dataItemListChangedSubscription.unsubscribe();

      this.dataItemListChangedSubscription = this.dataItemList.changed.subscribe(ev => {
        if (ev instanceof ListRemovedEvent) {
          this.removeRowWithData(ev.item);
        }
        else if (ev instanceof ListAddedEvent) {
          this.addRow(ev.item);
        }
        else if (ev instanceof ListChangedEvent) {
          this.refreshCells([(ev as ListChangedEvent).item], [(ev as ListChangedEvent).event.fieldName]);
        }
        else if (ev instanceof ListClearedEvent) {
          this.clear();
        }
      });

      this.setRowData(this.dataItemList.items);
    }
  }

  get dataItemList():DataItemList {
    return this._dataItemList;
  }



  constructor(protected cdr:ChangeDetectorRef) {
    super(cdr);
  }
  
  ngOnInit() {
    /*if (!(this.dataItemList instanceof DataItemList) )
      throw new Error("Property dataItemList must be defined and has DataItemList type.");*/
    this.rowSelection = true;
    if (this.dataItemList instanceof DataItemList)
      this.rows = this.dataItemList.items;
    super.ngOnInit();
  }

  ngOnDestroy() {
    super.ngOnDestroy();
    if (this.dataItemListChangedSubscription)
      this.dataItemListChangedSubscription.unsubscribe();
  }
  /*refreshView() {
    this.rows = this.dataItemList.items;
    super.refreshView();
  }*/
}