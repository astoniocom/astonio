import {Type} from '@angular/core';
import {Window, WindowsManager, WindowConstructorParams} from '@astonio/ui';
import {Backend} from '@astonio/core';
import {FilterWindowComponent} from './filter-window.component';

export interface FilterWindowParams extends WindowConstructorParams<FilterWindowComponent> {

}

export class FilterWindow<C extends FilterWindowComponent,PC> extends Window<FilterWindowComponent, PC> {
  backend:Backend;
  showUnstickButton:boolean;

  get title():string {
    return this._title || `Filter`;
  }

  constructor(windowsManager: WindowsManager, parentWindow:Window<PC, any>, params:FilterWindowParams) {
    if (!params.name)
      params.name = 'filter-window';
    super(windowsManager, parentWindow, params);
    this.backend = this.injector.get(Backend);
  }

  getWindowComponent():Type<FilterWindowComponent> {
    return this.component || FilterWindowComponent;
  }
}