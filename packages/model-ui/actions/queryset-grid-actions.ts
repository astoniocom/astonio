import {Component, Input, OnInit, OnDestroy, AfterViewInit, ChangeDetectorRef, Optional, Injector} from '@angular/core';
import {Backend, RecordModel, Record, RelatedRecords, Condition, QuerySet, Q, Exact, Where, Lookup, Col} from '@astonio/core';
import {Window, DialogService, Choise, QuestionDialogMode, QuestionDialogReturnCode, WindowsManager} from '@astonio/ui';
import {ModelWindowsDispatcher} from '../services/model-windows-dispatcher/model-windows-dispatcher';
import {Subscription} from 'rxjs';
import {cloneRecordWithRelated} from '../utils/record';
import {QuerysetGridComponent} from '../controls/queryset-grid/queryset-grid.component';
import {GridActions} from './grid-actions';

export class QuerysetGridActions extends GridActions {
  protected backend:Backend;
  protected ds:DialogService;
  protected mwd:ModelWindowsDispatcher;
  protected wm:WindowsManager;
  protected parentWnd:Window<any,any>;

  get canCreate():boolean {
    if (!this.grid.queryset.model)
      return false;
    var recordModels = this.grid.queryset.model.recordModels;
    if (!recordModels || recordModels.length == 0)
      return false;
    return true;
  };

  constructor(protected grid:QuerysetGridComponent, protected injector:Injector) {
    super(grid, injector);
    this.backend = injector.get(Backend);
    this.ds = injector.get(DialogService);
    this.mwd = injector.get(ModelWindowsDispatcher);
    this.wm = injector.get(WindowsManager);
    this.parentWnd = injector.get(Window, null);
  }

  newRecord(allWindows=false) {
    if (!this.newRecordAvailable())
      return;  

    var recordModels = this.grid.queryset.model.recordModels;

    if (recordModels.length == 1) {
      this._newRecord(this.backend.getRecordModel(recordModels[0]));
    }
    else {
      var choices:Choise<RecordModel>[] = [];
      this.grid.queryset.model.getRecordModels().forEach((model, idx) => {
        choices.push({
          default: idx==0,
          text: model.toString(),
          value: model
        });
      });
      this.ds.choice(this.parentWnd, choices).subscribe(model => {
        this._newRecord(model, allWindows);
      });
    }

  }

  newRecordAvailable():boolean {
    return this.canCreate;
  }

  _newRecord(model:RecordModel, allWindows=false) {
    // TODO проверить, чтобы четко работало сохранение
    var initData = {};
    for (let condition of this.grid.queryset.query.where.children) {
      if (condition instanceof Where)
        continue;
      
      if (! (condition.lhs instanceof Col))
        continue;

      try {
        model.getDbField(condition.lhs.target.name)
      }
      catch (e) {
        continue;
      }

      initData[condition.lhs.target.name] = condition.rhs;
    }

    var newRecord = model.constructRecord(true, initData);
    this.mwd.getRecordWindow(model, this.parentWnd, allWindows).subscribe(wndInfo => {
      var wnd = new wndInfo.window(this.wm, null, Object.assign({}, wndInfo.windowOptions, {record:newRecord, edit:true}));
    });
  }

  

  copyRecords(withRelated=false) {
    if (!this.copyRecordsAvailable())
      return;

    for (let row of this.grid.getSelectedData()) {
      if (!(row instanceof Record))
        continue;

      var record:Record = row;

      if (withRelated) {
        cloneRecordWithRelated(record).subscribe(clonedRecord => {
          this.openRecord(clonedRecord, true);
        });
      }
      else {
        this.openRecord(record.__director__.clone(true, true, false), true);
      }
    }
  }

  copyRecordsAvailable():boolean {
    return this.recordSelected;
  }

  openRecord(record:Record, edit:boolean, allWindows=false) {
    this.mwd.getRecordWindow(record.__director__.model, null, allWindows).subscribe(wndInfo => {
      var wnd = new wndInfo.window(this.wm, null, Object.assign({}, wndInfo.windowOptions, {record:record, edit:edit}));
    });
  }

  openRecords() {
    if (!this.openRecordsAvailable())
      return;

    for (let row of this.grid.getSelectedData()) {
      if (!(row instanceof Record))
        continue;

      let clonedRecord = row.__director__.clone(true, false, true);
      if (!row.__director__.hasAnyChanges) 
        this.openRecord(clonedRecord, false);
      else {
        clonedRecord.__director__.getData(true).subscribe(clonedRecord => {
          this.openRecord(clonedRecord, false);
        });
      }
    };
  }

  openRecordsAvailable():boolean {
    return this.recordSelected;
  }

  editRecords(allWindows=false) {
    if (!this.editRecordsAvailable())
      return;

    for (let row of this.grid.getSelectedData()) {
      if (!(row instanceof Record))
        continue;
    
      if (!row.__director__.isChanged) {
        this.openRecord(row.__director__.clone(true, false, true), true, allWindows);
      }
      else {
        this.openRecord(row, true, allWindows);
      }
    };
  }

  editRecordsAvailable():boolean {
    return this.recordSelected;
  }

  deleteRecords() {
    if (!this.deleteRecordsAvailable()) 
      return;

    var selectedRows = this.grid.getSelectedData();
    if (!selectedRows.length)
      return;

    this.ds.question(this.parentWnd, "Delete "+selectedRows.length+" selected record(s)?", QuestionDialogMode.YesNo, QuestionDialogReturnCode.Yes, 'Delete records?').subscribe(res => {
      if (res == QuestionDialogReturnCode.Yes) {
        for (let row of this.grid.getSelectedData()) {
          if (!(row instanceof Record))
            continue;

          row.__director__.delete().subscribe(() => {});
        };
      }
    });
  }

  deleteRecordsAvailable():boolean {
    return this.recordSelected;
  }


  refresh() {
    this.grid.refreshView();
  }


}