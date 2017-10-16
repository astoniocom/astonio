import {Injector, ChangeDetectorRef} from '@angular/core';
import {RelatedRecords, Backend, Record, RecordModel} from '@astonio/core';
import {RelatedRecordsGridComponent} from '../controls/related-records-grid/related-records-grid.component';
import {Window, DialogService, Choise} from '@astonio/ui';
import {GridActions} from './grid-actions';
import {Observable} from 'rxjs';

export class RelatedRecordsGridActions extends GridActions {
  protected backend:Backend;
  protected parentWnd:Window<any,any>;
  protected ds:DialogService;

  constructor(protected grid:RelatedRecordsGridComponent, protected injector:Injector) {
    super(grid, injector);
    this.backend = injector.get(Backend);
    this.parentWnd = injector.get(Window, null);
    this.ds = injector.get(DialogService);
  }

  newRecord() {
    var records = this.grid.dataItemList;
    if (!records.listModel || !records.listModel.recordModels.length)
      return;
    else if (records.listModel.recordModels.length == 1) {
      this._newRecord(this.backend.getRecordModel(records.listModel.recordModels[0]));
    }
    else {
      var choices:Choise<RecordModel>[] = [];
      records.listModel.getRecordModels().forEach((model, idx) => {
        choices.push({
          default: idx==0,
          text: model.toString(),
          value: model
        });
      });
      this.ds.choice(this.parentWnd, choices).subscribe(model => {
        this._newRecord(model);
      });
    }
  }

  _newRecord(model:RecordModel) {
    var newRecord = model.constructRecord(true);
    this.grid.dataItemList.add(newRecord);
    this.grid.focusRow(newRecord);
  }

  copyRecord() {
    if (!this.copyRecordAvailable())
      return;

    var records = this.grid.getSelectedData();
    var recordsToAdd:Record[] = [];
    for (let record of records) {
      if (!(record instanceof Record)) 
        continue;
      recordsToAdd.push(record.__director__.clone(true, true, false));
      
    }

    if (!recordsToAdd.length)
      return

    this.grid.dataItemList.add(...recordsToAdd);
    this.grid.focusRow(recordsToAdd[recordsToAdd.length-1]);
  }

  copyRecordAvailable():boolean {
    return this.recordSelected;
  }

  deleteRecord() {
    if (!this.deleteRecordAvailable())
      return;

    var records = this.grid.getSelectedData();
    this.grid.dataItemList.remove(...records);
  }  

  deleteRecordAvailable():boolean {
    return this.recordSelected;
  }

  moveDown() {
    if (!this.arrangeAvailable())
      return;

    var sortModel = this.grid.getSortModel()[0];

    var recordsToMove = this.grid.getSelectedData();
    var field = this.grid.dataItemList.listModel.getField(sortModel.colId);
    field.sorter.moveDown(this.grid.dataItemList.items, recordsToMove, sortModel.sort);
    this.grid.refreshView(['reorder']);
  }

  moveDownAvailable() {
    if (!this.arrangeAvailable() || !this.grid.dataItemList.items || ! this.grid.dataItemList.items.length)
      return false;
    
    var recordsToMove = this.grid.getSelectedData();
    var gridData = this.grid.getRenderedRows();
    if (gridData[gridData.length-1] == recordsToMove[recordsToMove.length-1])
      return false;

    return true;
  }

  moveUp() {
    if (!this.moveUpAvailable())
      return; 

    var sortModel = this.grid.getSortModel()[0];

    var recordsToMove = this.grid.getSelectedData();
    var field = this.grid.dataItemList.listModel.getField(sortModel.colId);
    field.sorter.moveUp(this.grid.dataItemList.items, recordsToMove, sortModel.sort);
    this.grid.refreshView(['reorder']);
  }

  moveUpAvailable() {
    if (!this.arrangeAvailable() || !this.grid.dataItemList.items || ! this.grid.dataItemList.items.length)
      return false;
    
    var recordsToMove = this.grid.getSelectedData();
    var gridData = this.grid.getRenderedRows();
    if (gridData[0] == recordsToMove[0])
      return false;

    return true;
  }

  arrangeAvailable():boolean {
    var sortModels = this.grid.getSortModel();
    if (!sortModels.length || !this.recordSelected)
      return false;

    var sortModel = sortModels[0];
    
    var field = this.grid.dataItemList.listModel.getField(sortModel.colId);
    return field && field.sorter && field.sorter.arrangeSupported;
  }
}