import {Type} from '@angular/core';
import {ListModel} from '@astonio/core';
import {ListWindow, ListWindowConstructorParams} from '../base/list-window/list-window';
import {Window, WindowConstructorParams, WindowsManager} from '@astonio/ui';
import {CommonListWindowComponent} from './common-list-window.component';
import {ModelGridFieldDescriber} from '../../utils/grid-utils';

export interface CommonListWindowParams extends ListWindowConstructorParams<CommonListWindowComponent> {
  fields?: ModelGridFieldDescriber[],
  readonly?: ModelGridFieldDescriber[],
}

export class CommonListWindow<C extends CommonListWindowComponent, PC> extends ListWindow<CommonListWindowComponent, PC> {
  fields: ModelGridFieldDescriber[];
  readonly: ModelGridFieldDescriber[];

  constructor(windowsManager: WindowsManager, parentWindow:Window<PC, any>, params:CommonListWindowParams) {
    super(windowsManager, parentWindow, params);
  }

  getWindowComponent():Type<CommonListWindowComponent> {
    return this.component || CommonListWindowComponent;
  }

  init() {
    this.componentRef.instance.fields = this.fields;
    this.componentRef.instance.readonly = this.readonly;
    super.init();
  }
}