import {Input, ChangeDetectorRef, Injector, OnDestroy} from '@angular/core';
import {Record, RelatedRecordsVirtualField, RecordChangedEvent} from '@astonio/core';
import {DialogService, QuestionDialogMode, QuestionDialogReturnCode, WindowComponent} from '@astonio/ui';
import {RecordWindow} from './record-window';
import {cloneRecordWithRelated} from '../../../utils/record';
import {Observable, Subscription} from 'rxjs';


export class RecordWindowComponent extends WindowComponent implements OnDestroy {
  recordChagedSubscription:Subscription;
  private _record:Record;
  @Input() set record(val:Record) {
    if (val === this._record)
      return;
    this._record = val;
    this.recordChagedSubscription = this._record.__director__.changed.subscribe((ev:RecordChangedEvent) => {
      this.onRecordChanged(ev);
    });
  };

  get record(): Record {
    return this._record;
  }

  @Input() edit:boolean;
  wnd: RecordWindow<RecordWindowComponent, any>;
  isLoading = false;
  ds:DialogService;

  constructor(injector:Injector) {
    super(injector);
    this.ds = injector.get(DialogService);
  }

  ngOnDestroy() {
  }

  protected setLoading() {
    this.isLoading = true;
    this.cdr.markForCheck();
  }

  protected removeLoading() {
    this.isLoading = false;
    if (!(this.cdr as any).destroyed)
      this.cdr.detectChanges();
  }

  saveRecord(commit=true, init=true):Observable<Record> {
    this.setLoading();
    return this.record.__director__.save(commit, init).finally(() => this.removeLoading());
  }

  save() {
    this.saveRecord().subscribe();
  }

  saveAndCopy(withRelated=false) {
    this.saveRecord().subscribe(record => {
      if (withRelated) {
        cloneRecordWithRelated(record).subscribe(clonedRecord => {
          this.wnd.setRecord(clonedRecord);
        });
      }
      else {
        let relatedFields = [];
        for (let field of record.__director__.model.fields) {
          if (field instanceof RelatedRecordsVirtualField)
            relatedFields.push(field.name);
        }
        this.wnd.setRecord(record.__director__.clone(true, true, false, relatedFields));
      }
    });
  }

  saveAndNew() {
    this.saveRecord().subscribe(record => {
      this.wnd.setRecord(this.record.__director__.model.constructRecord(true));
    });
  }

  ok() {
    this.saveRecord(true, false).flatMap(() => this.wnd.close(true)).subscribe();
  }

  delete() {
    if (this.record.__director__.isNew)
      return;

    this.ds.question(this.wnd, "Delete record?", QuestionDialogMode.YesNo, QuestionDialogReturnCode.Yes, 'Delete records?')
      .filter(res => res == QuestionDialogReturnCode.Yes)
      .flatMap(() => this.record.__director__.delete())
      .flatMap(() => this.wnd.close(true))
      .subscribe();
  }

  _reload() {
    this.setLoading();
    this.record.__director__.getData(true).subscribe(() => {
      this.removeLoading();
      
    });
  }

  reload() {
    if (this.record.__director__.isNew)
      return;

    if (this.record.__director__.isChanged || this.record.__director__.isChildrenChanged) {
      this.ds.question(this.wnd, "Record has unsaved changes. Reload without saving?", QuestionDialogMode.YesNo, QuestionDialogReturnCode.Yes, 'Delete records?').subscribe(res => {
        if (res == QuestionDialogReturnCode.Yes) {
          this._reload();
        }
      });
    }
    else {
      this._reload();
    }
  }

  onRecordChanged(ev:RecordChangedEvent) {

  }
}