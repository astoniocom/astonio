import {ComponentRef, Type} from '@angular/core';
import {RecordModel, Record} from '@astonio/core';

export abstract class BaseModelFormComponent {
  edit: boolean = true;

  protected _model:RecordModel;
  set model(value:RecordModel) {
    if (this._model !== value) {
      this._model = value;
      this.onModelChanged();
    }
  };
  get model(): RecordModel {
    return this._model;
  }
  
  protected _record:Record;
  set record(value:Record) {
    if (this._record !== value) {
      this._record = value;
      this.recordChanged();
    }
  };
  get record(): Record {
    return this._record;
  }

  protected componentRefs:Map<string, ComponentRef<any>> = new Map();
  protected componentInit = false;

  ngAfterViewInit() {
    this.componentInit = true;
  }

  destroyForm() {
    this.componentRefs.forEach(componentRef => componentRef.destroy());
    this.componentRefs.clear();
  }

  buildForm() {

  }

  recordChanged() {

  }

  onModelChanged() {

  }

}