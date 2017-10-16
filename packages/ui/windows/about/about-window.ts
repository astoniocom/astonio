import {Window, WindowConstructorParams} from '../window';
import {AboutWindowComponent} from './about-window.component';
import {WindowsManager} from '../windows-manager.service';

export class AboutWindow<C, PC> extends Window<AboutWindowComponent, PC> {
  constructor(windowsManager: WindowsManager, parentWindow:Window<PC, any>, appName:string='') {
    var params:WindowConstructorParams<AboutWindowComponent> = params ? params : {component: AboutWindowComponent, 
      dialog:'md', 
      title: 'About',
      componentParams: {appName:appName}};
    super(windowsManager, parentWindow, params);
  }
}
