import {Type} from "@angular/core";
import {RecordWindow, RecordWindowConstructorParams} from '../base/record-window/record-window';
import {Window, WindowConstructorParams, WindowsManager} from '@astonio/ui';
import {Record} from '@astonio/core';
import {CommonRecordWindowComponent} from './common-record-window.component';
import {ModelFormFieldsDescriber} from '../../controls/model-form/model-form.component';

export interface CommonRecordWindowParams extends RecordWindowConstructorParams<CommonRecordWindowComponent> {
  fields?: ModelFormFieldsDescriber,
  readonly?: ModelFormFieldsDescriber,
}

export class CommonRecordWindow<C extends CommonRecordWindowComponent, PC> extends RecordWindow<CommonRecordWindowComponent, PC> {
  fields: ModelFormFieldsDescriber;
  readonly: ModelFormFieldsDescriber;

  constructor(windowsManager: WindowsManager, parentWindow:Window<PC, any>, params:CommonRecordWindowParams) {
    super(windowsManager, parentWindow, params);
  }

  getWindowComponent():Type<CommonRecordWindowComponent> {
    return this.component || CommonRecordWindowComponent;
  }

  init() {
    this.componentRef.instance.fields = this.fields;
    this.componentRef.instance.readonly = this.readonly;
    super.init();
  }
}