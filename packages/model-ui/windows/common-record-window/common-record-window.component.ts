import {Component, Input, Optional, Injector, OnDestroy, OnInit, AfterViewInit, ChangeDetectionStrategy} from '@angular/core';
import {RecordModel, Record, RelatedRecords, QuerySet} from '@astonio/core';
import {Window} from '@astonio/ui';
import {RecordWindowComponent} from '../base/record-window/record-window.component';
import {Observable, Subscription} from 'rxjs';
import {AstonioModelUIConfigService} from '../../services/config/config.service';
import {ModelFormFieldsDescriber} from '../../controls/model-form/model-form.component';

export interface Tab {
  name:string, 
  verboseName:string, 
  nRecords?: number,
  forceRelated?:boolean,
  linkedFields?:string[],
  queryset?:QuerySet,
};

@Component({
  templateUrl: './common-record-window.html',
  inputs: ['record'],
  //styleUrls: ['./common-record-window.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommonRecordWindowComponent extends RecordWindowComponent implements OnDestroy, OnInit, AfterViewInit {
  @Input() fields: ModelFormFieldsDescriber;
  @Input() readonly: ModelFormFieldsDescriber;
  tabs: Tab[] = [];
  curTab: Tab;
  tabRecordsCounterSubscription:Subscription;
  config:AstonioModelUIConfigService;

  constructor(protected injector:Injector) {
    super(injector);
    this.config = injector.get(AstonioModelUIConfigService);
  }

  ngOnInit() {
    
  }

  ngAfterViewInit() {
    
  }

  set record(val:Record) {
    if (val === this.record)
      return ;

    super.record = val;
    
    this.curTab = {name: '__main__', verboseName: 'Main'};
    this.tabs = [];
    this.tabs.push(this.curTab);
    for (let field of this.record.__director__.model.fields) {
      if (this.record[field.name] instanceof RelatedRecords && this.record[field.name].listModel) {
        var qs = (this.record[field.name] as RelatedRecords).getQueryset();
        for (let field of qs.model.fields) {
          if (field.sorter) {
            qs = qs.orderBy(field.sorter.colName);
            break;
          }
        }

        this.tabs.push({
          name: field.name, 
          verboseName: field.verboseName, 
          nRecords: undefined,
          linkedFields: (this.record[field.name] as RelatedRecords).getLinkedFields(),
          //relatedRecords: this._record[field.name] as RelatedRecords,
          queryset: qs,
        });
      }
    }

    if (this.tabRecordsCounterSubscription)
      this.tabRecordsCounterSubscription.unsubscribe();

    this.tabRecordsCounterSubscription = this.record.__director__.loaded.filter(record => {
      for (let tab of this.tabs) {
        if (tab.name == '__main__') 
          continue;
        tab.queryset = (record[tab.name] as RelatedRecords).getQueryset()
      }
      return this.curTab.name !== '__main__';
    }).flatMap(record => {
      return (this.record[this.curTab.name] as RelatedRecords).queryset.count();
    }).subscribe(count => {
      this.curTab.nRecords = count;
      this.cdr.detectChanges();
    });

    this.cdr.detectChanges();
  }
  get record():Record {
    return super.record;
  }

  setTab(tab:Tab) {
    this.curTab = tab;
    if (tab.name !== '__main__' && tab.nRecords == undefined && !this.record.__director__.isNew) {
      (this.record[tab.name] as RelatedRecords).queryset.count().subscribe(count => {
        tab.nRecords = count;
        this.cdr.detectChanges();
      });
    }
    this.cdr.detectChanges();
  }

  forceRelated(tab:Tab) {
    tab.forceRelated = true;
    this.cdr.detectChanges();
  }

  ngOnDestroy() {
    super.ngOnDestroy();
    if (this.tabRecordsCounterSubscription)
      this.tabRecordsCounterSubscription.unsubscribe();
  }

}
