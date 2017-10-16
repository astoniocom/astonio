import {Injectable, Injector, ViewContainerRef, Type} from '@angular/core';
//*import {TabbarComponent} from './tabbar';
//*import {ModulesService} from 'astonio/src/core/modules';
//*import {DataStorage} from 'astonio/src/core/data_storage';  
import {WindowsManager, BaseDataStorageService} from '@astonio/ui'; 
import {Window, WindowConstructorParams} from '@astonio/ui/windows/window'; 
import {Observable} from 'rxjs/Observable';
declare var Ventus:any;

@Injectable()
export class VentusWindowsManager extends WindowsManager {
  protected wm:any;
  
  private dataStorage: BaseDataStorageService;
  windowsCounter: number = 0;
  focusedHandle:string;

  constructor(public injector:Injector) { 
    super(injector); 
    this.dataStorage = injector.get(BaseDataStorageService);//this.$appInjector.get(DataStorage);
  }

  setViewport(element:HTMLElement) {
    this.wm = new Ventus.WindowManager(element);
  }

  storageKey(key) {
    return 'windowsManager__'+key;
  }

  register<C, PC>(window:Window<C, PC>) {
    super.register(window);

    var wnd: any;

    var config = {
      x:50, 
      y:50, 
      width:900, 
      height:600, 
      //title: null,
      wnd_id: window.handle
    };
    if (window.dialog) {
      if (window.dialog == 'sm') {
        config.width = 300;
        config.height = 150;
      }
      else if (window.dialog == 'md') {
        config.width = 500;
        config.height = 230;
      }
      else if (window.dialog == 'lg') {
        config.width = 900;
        config.height = 450;
      }
    }
    else {
      var dimension = this.dataStorage.get(window.name+'__dimension');
      if (dimension) {
        config.width = dimension[0];
        config.height = dimension[1];
      }

      var position = this.dataStorage.get(window.name+'__position');
      if (position) {
        config.x = position[0];
        config.y = position[1];
      }
    }
    
  
    //this.events.next({action: 'OnWndCreated', wnd_id: window.handle});

    var maximized = this.dataStorage.get(window.name+'__maximized');
    
    var onResize = () => {
      var wnd = this.getWindow(window.handle);
      var dimension = [rawWnd.width, rawWnd.height];
      //*//if (wnd)
      //*//  super.focusWindow(wnd);
      if (wnd && !rawWnd.maximized && !rawWnd.maximizing) {
        this.dataStorage.set(wnd.name+'__dimension', dimension);
      }
      wnd.frameService.notifySizeChanged(dimension[0], dimension[1]);
    };

    var onMove = () => {
      var wnd = this.getWindow(window.handle);
      var position = [rawWnd.x, rawWnd.y];
      if (wnd && !rawWnd.maximized && !rawWnd.maximizing) {
        this.dataStorage.set(wnd.name+'__position', position);
      }
    }

    var onMaximized = () => {
      var wnd = this.getWindow(window.handle);
      if (wnd) {
        this.dataStorage.set(wnd.name+'__maximized', true);
      }
    }

    var onRestored = () => {
      var wnd = this.getWindow(window.handle);
      if (wnd) {
        this.dataStorage.set(wnd.name+'__maximized', false);
      }
    }

    var onClosed = () => {
      rawWnd.destroy();
    }

    var onFocus = () => {
      var wnd = this.getWindow(window.handle);
      if (wnd) {
        this.focusedHandle = wnd.handle;
        super.windowFocused(wnd);
      }
    }

    var rawWnd = this.wm.createWindow.fromElement(window.componentRef.location.nativeElement, {
      title: window.title ? window.title : window.handle,
      width: config.width,
      height: config.height,
      x: config.x,
      y: config.y,
      maximized: maximized,
      wndId: window.handle,
      resizable: !window.dialog,
      centered: !!window.dialog,
      noCloseBtn: !!window.dialog,
      beforeClose: () => {
        if (!rawWnd.isClosed) {
          var wnd = this.getWindow(window.handle);
          if (wnd /*&& !wnd.isClosed*/) {
            wnd.close().subscribe(result => {
              //wnd = undefined;
            });
          }
          return false;
        }
        else {
          //wnd = undefined;
          rawWnd.signals.off('resize', onResize);
          rawWnd.signals.off('move', onMove);
          rawWnd.signals.off('maximized', onMaximized);
          rawWnd.signals.off('restored', onRestored);
          rawWnd.signals.off('closed', onClosed);
          rawWnd.signals.off('focus', onFocus);
          return true;
        }
      }
    });
    rawWnd.open();

    

    rawWnd.signals.on('resize', onResize);
    rawWnd.signals.on('move', onMove);
    rawWnd.signals.on('maximized', onMaximized);
    rawWnd.signals.on('restored', onRestored);
    rawWnd.signals.on('closed', onClosed);
    rawWnd.signals.on('focus', onFocus);


    setTimeout(() => {
      window.frameService.notifySizeChanged(config.width, config.height);
    });
  }

  getRawWindow(handle:string):any {
    for (let wnd of this.wm.windows) {
      if (wnd.wndId == handle)
        return wnd;
    }
  }

  close<C, PC>(window:Window<C, PC>) {
    super.close(window);
    var rwnd = this.getRawWindow(window.handle)
    if (rwnd){
      rwnd.isClosed = true;
      rwnd.close().catch(e => {
      });
    }
  }

  focusWindow<C, PC>(window:Window<C, PC>) {
    var rwnd = this.getRawWindow(window.handle);
    if (rwnd) {
      setTimeout(() => { // Без Timeout не происходит обновление статуса  о том, что фокус потерян, во время фокусирования потомков.
        rwnd.focus();
      })
      
    }
    super.focusWindow(window);
  }

  updateTitle<C, PC>(window:Window<C, PC>) {
    var rwnd = this.getRawWindow(window.handle);
    if (!rwnd) {
      console.warn('Попытка установить заголовок "'+window.title+'" для несуществующего окна.');
      return;
    }
    rwnd.setTitle(window.title);
    super.updateTitle(window);
  }
  
  updateModal<C, PC>(window:Window<C, PC>) {
    //!//var wnd = this.getRawWindow(window.handle);
    //!//if (!wnd)
    //!//  return;
      
    //!//wnd.modal(window.isModal);
    super.updateModal(window);
  }
  
  center<C, PC>(window:Window<C, PC>) {
    //!//var wnd = this.getRawWindow(window.handle);
    //!//if (!wnd)
    //!//  return;
    //!//wnd.center();
  }

  isFocused<C, PC>(window:Window<C, PC>): boolean {
    return this.focusedHandle == window.handle;
  }
}