import {Window, WindowConstructorParams, WindowsManager, DialogService, QuestionDialogMode, QuestionDialogReturnCode} from '@astonio/ui';
import {Record, Backend} from '@astonio/core';
import {RecordWindowComponent} from './record-window.component';
import {Observable, Subscription} from 'rxjs';


export interface RecordWindowConstructorParams<C extends RecordWindowComponent> extends WindowConstructorParams<C> {
  record?:Record;
  edit?:boolean;
}

export class RecordWindow<C extends RecordWindowComponent, PC> extends Window<C, PC> implements RecordWindowConstructorParams<C> {
  backend:Backend;
  record:Record;
  edit:boolean;
  recordChangeSubscription:Subscription;
  globRecordChangedSubscription:Subscription;
  globRecordDeletedSubscription:Subscription;
  recordLookupChangedSubscription:Subscription;
  protected ds:DialogService;
  protected askReolad:0|1|2; // 0 - not ask, 1 - about changes, 2 - about deleting 

  get title():string {
    var result = ''+this.record;
    if (this.record.__director__.isNew)
      result += ' [new]';
    if (this.record.__director__.hasAnyChanges)
      result += ' *';
    return result;
  }

  set title(val:string) {
    super.title = val;
  }

  constructor(windowsManager: WindowsManager, parentWindow:Window<PC, any>, params:RecordWindowConstructorParams<C>) {
    if (!params.name && params.record)
      params.name = `${params.record.__director__.model.name}-record-window`
    super(windowsManager, parentWindow, params);
    this.askReolad = 0;
  }

  init() {
    this.backend = this.injector.get(Backend);
    super.init();
    
    this.componentRef.instance.edit = this.edit;
    this.setRecord(this.record);
    
    this.globRecordChangedSubscription = this.backend.recordSavedNotifications.subscribe(ev => {
      if (this.record && !this.record.__director__.isNew && ev.initiatorId !== this.record.__director__.uid && this.record.__director__.fitLookup(ev.lookupData)) {
        if (this.record.__director__.hasAnyChanges) {
          this.isFocused ? this.askReloadRecord(1) : this.askReolad = 1;
        }
        else {
          this.reload();
        }
      }
    });

    this.globRecordDeletedSubscription = this.backend.recordDeletedNotifications.subscribe(ev => {
      if (this.record && !this.record.__director__.isNew && ev.initiatorId !== this.record.__director__.uid && this.record.__director__.fitLookup(ev.lookupData)) {
        this.isFocused ? this.askReloadRecord(2) : this.askReolad = 2;
      }
    });

    this.recordLookupChangedSubscription = this.backend.recordLookupChangedNotifications.subscribe(ev => {
      if (!this.record.__director__.isNew && this.record.__director__.fitLookup(ev.oldLookupData) && this.record.__director__.uid !== ev.initiatorId) {
        this.record.__director__.setLookupData(ev.newLookupData);
      }
    });

    this.ds = this.injector.get(DialogService);
  }

  setRecord(record:Record) {
    this.record = record;
    this.componentRef.instance.record = record;
    this.setTitle(this.title);
    this.componentRef.changeDetectorRef.detectChanges();

    if (this.recordChangeSubscription)
      this.recordChangeSubscription.unsubscribe();

    this.recordChangeSubscription = Observable.merge(record.__director__.loaded, record.__director__.changed, record.__director__.loaded).subscribe(() => {
      this.setTitle(this.title);
    });

    if (this.recordLookupChangedSubscription)
      this.recordLookupChangedSubscription.unsubscribe();

    

  }

  close(hard=false):Observable<boolean> {
    if (this.record.__director__.hasAnyChanges && !hard) { //hasAnyChanges
      return this.ds.question(this, 'The Record modified. Save changes?', QuestionDialogMode.YesNoCancel, QuestionDialogReturnCode.Yes, 'Close?').flatMap(res => {
        if (res == QuestionDialogReturnCode.Yes) {
          return this.record.__director__.save(true, false).flatMap(() => super.close())
        }
        else if (res == QuestionDialogReturnCode.No) {
          return super.close();
        }
        return Observable.of(false);
      });
    }
    else {
      return super.close();
    }
  }

  reload() {
    this.record.__director__.getData(true).subscribe(() => {
      this.componentRef.changeDetectorRef.detectChanges();
    });
  }

  askReloadRecord(v) {
    if (v == 1 && this.record.__director__.hasAnyChanges) {
      var questionStr = 'This Record has just been modified. Reload it?';
      if (this.record.__director__.hasAnyChanges)
        questionStr += ' All changes will be lost.'; 

      this.ds.question(this, questionStr, QuestionDialogMode.YesNo, QuestionDialogReturnCode.Yes, 'Reload record?').subscribe(res => {
        if (res == QuestionDialogReturnCode.Yes)
          this.reload();
      });
    }
    else if (v == 2) {
      var questionStr = 'The Record has just been deleted. Close it?';
      if (this.record.__director__.hasAnyChanges)
        questionStr += ' All changes will be lost.'; 

      this.ds.question(this, questionStr, QuestionDialogMode.YesNo, QuestionDialogReturnCode.Yes, 'Close record?').subscribe(res => {
        if (res == QuestionDialogReturnCode.Yes) {
          this.close(true);
        }
      });
    }
  }

  onFocus() {
    super.onFocus();
    if (this.askReolad) {
      this.askReloadRecord(this.askReolad);
      this.askReolad = 0;
    }
  }

  destroy() {
    if (this.recordChangeSubscription) 
      this.recordChangeSubscription.unsubscribe();
    if (this.globRecordChangedSubscription)
      this.globRecordChangedSubscription.unsubscribe();
    if (this.globRecordDeletedSubscription)
      this.globRecordDeletedSubscription.unsubscribe();
    if (this.recordLookupChangedSubscription)
      this.recordLookupChangedSubscription.unsubscribe();

    super.destroy();
  }

  
}