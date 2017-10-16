import {Injector, ChangeDetectorRef} from '@angular/core';
import {Window} from './window';

export class WindowComponent {
  protected wnd:Window<WindowComponent, any>;
  protected cdr:ChangeDetectorRef;

  constructor(protected injector:Injector) {
    this.wnd = injector.get(Window, null);  
    this.cdr = injector.get(ChangeDetectorRef);
  }

  closeWindow() {
    if (this.wnd)
      this.wnd.close().subscribe(()=>{});
  }
}