import {Type} from '@angular/core';
import {RelatedRecords, Backend} from '@astonio/core';
import {Window, WindowConstructorParams, WindowsManager} from '@astonio/ui';
import {RelatedRecordsWindowComponent} from './related-records-window.component';

export interface RelatedRecordsWindowConstructorParams<C extends RelatedRecordsWindowComponent> extends WindowConstructorParams<C> {
  relatedRecords:RelatedRecords; 
  edit:boolean; 
}

export class RelatedRecordsWindow<C extends RelatedRecordsWindowComponent, PC> extends Window<RelatedRecordsWindowComponent, PC> {
  backend:Backend;
  relatedRecords:RelatedRecords;
  edit:boolean = true;

  constructor(windowsManager: WindowsManager, parentWindow:Window<PC, any>, params:RelatedRecordsWindowConstructorParams<RelatedRecordsWindowComponent>) {
    super(windowsManager, parentWindow, params);
  }

  getWindowComponent():Type<RelatedRecordsWindowComponent> {
    return this.component || RelatedRecordsWindowComponent;
  }
  
  get title():string {
    var result = "Related records of " + this.relatedRecords.record;
    /*var result = ''+this.record;
    if (this.record.isNew)
      result += ' [new]';
    if (this.record.hasAnyChanges)
      result += ' *';
*/
    return result;
  }

  set title(val:string) {
    super.title = val;
  }

  init() {
    this.backend = this.injector.get(Backend);
    super.init();
    
    this.componentRef.instance.edit = this.edit;
    this.componentRef.instance.relatedRecords = this.relatedRecords;
  }
}