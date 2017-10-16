import {Component, Input, ViewChild, AfterViewInit, forwardRef, Inject, Optional, Injector, OnInit, ChangeDetectionStrategy} from '@angular/core';
import {ListModel, Record, Backend} from '@astonio/core';
//!!import {QuerysetGridComponent} from '../../controls/queryset-grid/queryset-grid.component'; // to prevent circular dependency error
import {ModelWindowsDispatcher} from '../../services/model-windows-dispatcher/model-windows-dispatcher';
import {RecordWindow} from '../base/record-window/record-window';
import {Window, WindowsManager} from '@astonio/ui';
import {RecordWindowComponent} from '../base/record-window/record-window.component';
import {Subscription} from 'rxjs';
import {ListWindowComponent} from '../base/list-window/list-window.component';
import {ModelGridFieldDescriber} from '../../utils/grid-utils';

@Component({
  templateUrl: './common-list-window.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommonListWindowComponent extends ListWindowComponent implements AfterViewInit, OnInit {
  @Input() fields: ModelGridFieldDescriber[];
  @Input() readonly: ModelGridFieldDescriber[];
  @ViewChild('grid') grid:any; //!!QuerysetGridComponent // to prevent circular dependency error
  recordWnd:RecordWindow<RecordWindowComponent, any>;
  modelWindowsDispatcher:ModelWindowsDispatcher;
  wm:WindowsManager;
  

  //private cellDoubleclickSubscription:Subscription;

  constructor(protected injector:Injector) { //@Inject(forwardRef(() => ModelWindowsDispatcher)) 
    super(injector);
    this.modelWindowsDispatcher = injector.get(ModelWindowsDispatcher);
    this.wm = injector.get(WindowsManager);
  }

  ngAfterViewInit() {
    //this.cellDoubleclickSubscription = this.grid.
    //var w=3;
  }

  onCellDoubleClicked(ev) {
    var event = ev.event as MouseEvent;
    if (!(ev.rowData instanceof Record)) 
      return;

    if (!this.choice) {
      if (ev.col.field && ev.col.editComponent && this.grid.edit == true) //isCellEditable
        return;

      var record:Record = event.shiftKey ? ev.rowData : (ev.rowData as Record).__director__.clone();

      record.__director__.getData(ev.rowData.__director__.hasAnyChanges && !event.shiftKey).subscribe(record=> {
        if (this.recordWnd && event.ctrlKey && !this.recordWnd.isClosed) {
          this.recordWnd.setRecord(record);
          this.recordWnd.focus();
        }
        else {
          this.modelWindowsDispatcher.getRecordWindow(record.__director__.model, null, event.shiftKey).subscribe(wndInfo => {
            var wnd = new wndInfo.window(this.wm, null, Object.assign({}, wndInfo.windowOptions, {record:record, edit:true}));
            if (event.ctrlKey)
              this.recordWnd = wnd;
          });
          
        }
      })
    }
    else {
      this.chosen.next([ev.rowData]);
    }
  }

  makeChoice() {
    var selection = [];
    for (let row of this.grid.getSelectedData()) {
      if (!(row instanceof Record))
        continue;
      selection.push(row);
    }
    if (selection.length)
      this.chosen.next(selection);
  }
}
