import { Type, ReflectiveInjector, Provider, ComponentRef, ViewContainerRef, ComponentFactoryResolver, Injector} from '@angular/core';
import {Observable, Subject} from 'rxjs';
import {WindowsManager} from './windows-manager.service';
import {FrameService} from './frame.service';

/* TODO Подумать, может, закрытие child-ов сделать иначе,не через парентов, чтобы можно было решить о закрытии в любой момент, а не в начале */

export interface WindowConstructorParams<C> {
  component?: Type<C>, 
  isModal?:boolean,
  dialog?:'sm'|'md'|'lg',
  name?: string, 
  anchor?:string,
  componentParams?: Object, 
  providers?:Provider[],
  title?:string,
  windowClass?: typeof Window
}

var wndCounter = 0;
export class Window<C, PC> implements WindowConstructorParams<C> {
  protected windowsManager: WindowsManager;
  handle: string;

  component:Type<C>;
  isModal:boolean = false;
  dialog:'sm'|'md'|'lg';
  name:string;
  anchor: string;
  componentParams: Object;
  providers: Provider[];
  isClosed: boolean = false;
  protected injector:Injector;
  focused:Subject<Window<C, PC>> = new Subject();
  
  _title:string;
  get title():string {
    return this._title;
  };

  set title(val:string) {
    this._title = val;
  };

  get isFocused():boolean {
    return this.windowsManager.isFocused(this);
  }

  closeObservers:Observable<boolean>[] = [];

  componentRef:ComponentRef<C>;
  parentWindow: Window<PC, {}> = null;
  children: Window<{}, C>[] = [];
  closed = new Subject<Window<C, PC>>();

  frameService = new FrameService();

  constructor(windowsManager: WindowsManager, parentWindow:Window<PC, any>, params:WindowConstructorParams<C>) {
    this.windowsManager = windowsManager;
    this.handle = this.getNewWndHandle();
    
    Object.assign(this, params);

    this.parentWindow = parentWindow;

    this.providers = [{provide: Window, useValue: this}, {provide:FrameService, useValue: this.frameService}];
    if (params.providers) {
      this.providers.push(...params.providers);
    }

    let component = this.getWindowComponent();
    if (!component)
      throw new Error("'component' must be specified");

    if (!this.windowsManager.vcr) {
      throw new Error("You must call something like 'this.windowsManager.initVCR(this.containerVCR)' in root component.");
    }

    this.injector = this.windowsManager.vcr.injector;
    let componentFactoryResolver:ComponentFactoryResolver = this.injector.get(ComponentFactoryResolver);
    let factory = componentFactoryResolver.resolveComponentFactory(component);
    let providers = ReflectiveInjector.resolve(this.providers);
    let childInjector = ReflectiveInjector.fromResolvedProviders(providers, this.injector);
    this.componentRef = this.windowsManager.vcr.createComponent<C>(factory, this.windowsManager.vcr.length, childInjector);
    
    Object.assign(this.componentRef.instance, this.componentParams);

    this.windowsManager.register(this); // Real window creating and injecting just created component.

    if (this.parentWindow)
      this.parentWindow.registerChild(this);

    // Окна могут как-то менять настройки компанента. Вот эти изменения должны происходить до detectChanges, поэтому настройки компонента
    // должны находиться в init.
    this.init();


    this.componentRef.changeDetectorRef.detectChanges();

  }

  init() {
    
  }

  getWindowComponent():Type<C> {
    return this.component;
  }

  getNewWndHandle():string {
    wndCounter++;
    return 'wnd_'+wndCounter;
  }

  setTitle(title:string) {
    this.title = title;
    this.windowsManager.updateTitle(this);
  }

  getTitle() {
    return this.title;
  }

  focus() {
    this.windowsManager.focusWindow(this);
  }

  onFocus() {
    this.focused.next(this);
  }

  setModal(state=true) {
    this.isModal = state;
    this.windowsManager.updateModal(this);
  }

  center() {
    this.windowsManager.center(this);
  }

  addCloseObserver(observer:Observable<boolean>) {
    this.closeObservers.push(observer);
  }

  close():Observable<boolean> {
    // Узнаем, можно ли закрыть это окно
    var closeObserversResult;
    if (this.closeObservers.length) {
      closeObserversResult = Observable.forkJoin(this.closeObservers).map(result => {
        for (let st of result) {
          if (st == false)
            return false;
        }
        return true;
      })
    }
    else {
      // Если некому сообщать о закрытии, значит закрывать можно.
      closeObserversResult = Observable.of(true);
    }

    return closeObserversResult.flatMap(result => {
      if (!result)
        return Observable.of(false)

      var childrenCloseResults = [];
      for (let childWnd of this.children) {
        childrenCloseResults.push(childWnd.close());
      }

      if (childrenCloseResults.length) {
        return Observable.forkJoin(childrenCloseResults).map(result => {
          for (let st of result) {
            if (st == false)
              return false;
          }
          return true;
        });
      }
      else {
        return Observable.of(true);
      }

    }).map(res => {
      if (res) {
        this.destroy();
        this.closed.next(this);
        this.closed.complete();
        this.windowsManager.close(this);
        this.isClosed = true;
      }
      return res;
    });
  }

  registerChild(childWnd:Window<any, C>) {
    this.children.push(childWnd);
    childWnd.closed.subscribe(window => { // TODO unsubscribe
      this.children.splice(this.children.indexOf(window), 1);
    });
  }

  destroy() {
    this.componentRef.destroy();
    this.componentRef = undefined;
  }
}