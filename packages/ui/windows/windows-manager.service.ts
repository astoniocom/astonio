import {Injector, Type, ViewContainerRef} from '@angular/core';
import {Subject} from 'rxjs/Subject';
import {Observable} from 'rxjs/Observable';
import {Window, WindowConstructorParams} from './window';

  export interface Constructor<T extends typeof Window> {
    new (...args: any[]): T;
}

export interface ClassConstrcutor<T extends typeof Window> {
    new(a, b, c): T;
}
export class WindowsManager {
  private wndCounter: number = 1;
  vcr:ViewContainerRef;

  allWindows:{
    [handle:string]:Window<any, any>
  } = {};
  events:Subject<{name: string, window: Window<any, any>}> = new Subject();
 
  constructor(public injector:Injector) {
  } 

  initVCR(vcr:ViewContainerRef) {
    this.vcr=vcr;
    this.setViewport(this.vcr.element.nativeElement);
  }
  
  setViewport(element:HTMLElement) {
    
  }

  register<C, PC>(window:Window<C, PC>) {
    this.allWindows[window.handle] = window;
    this.events.next({name: 'created', window:window});
  }

  unregiester<C, PC>(window:Window<C, PC>) {
    delete this.allWindows[window.handle];
  }

  /*
  create<C, W, PC, PPC>(windowClass:{new(...args):W}, parentWnd:Window<PC, PPC>, params:WindowConstructorParams<C> ):W {
    var newWnd;
    //if (!windowClass)
    //  windowClass = Window as {new (a,b,c)};

    if (parentWnd)
      newWnd = parentWnd.create(params);
    else
      newWnd = new windowClass(this, null, params);

    this.register(newWnd);
    this.events.next({name: 'created', window:newWnd});
    return newWnd;
  }*/

  close<C, PC>(window:Window<C, PC>) {
    this.unregiester(window);
  }
  
  getWindow<C, PC>(handle:string):Window<C, PC> { // ByHandle
    return this.allWindows[handle];
  }

  getWindowsByAnchor<C, PC>(anchor:string):Window<C, PC>[] {
    var result:Window<C, PC>[] = [];
    for (var handle in this.allWindows) {
      var wnd = this.getWindow<C, PC>(handle);
      if (wnd.anchor == anchor)
        result.push(wnd);
    }
    return result;
  }
  
  updateTitle<C, PC>(window:Window<C, PC>) {
    this.events.next({name: 'updateTitle', window:window});
  }

  windowFocused<C, PC>(window:Window<C, PC>) {
    window.onFocus();
    this.events.next({name: 'focus', window:window});

    for (let childWnd of window.children) {
      if (childWnd.isModal)
        childWnd.focus();
    }
  }

  focusWindow<C, PC>(window:Window<C, PC>) {
    this.windowFocused(window);
  }

  
  updateModal<C, PC>(window:Window<C, PC>) {
    this.events.next({name: 'updateModal', window:window});
  }

  center<C, PC>(window:Window<C, PC>) {
    this.events.next({name: 'center', window:window});
  }

  isFocused<C, PC>(window:Window<C, PC>): boolean {
    return false;
  }



  /*setParams(window:Window<any>) {
    this.ev_set_params.next(window);
  }*/


}