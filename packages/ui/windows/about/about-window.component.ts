import {Component, Injector, Input} from '@angular/core';
import {AboutWindow} from './about-window';
import {WindowComponent} from '../window.component';

declare function require(name:string);

@Component({
  templateUrl: 'about-window.html'
})
export class AboutWindowComponent extends WindowComponent {
  @Input() appName:string;
  constructor(injector:Injector) {
    super(injector);
  }

  doClose() {
    this.wnd.close().subscribe(res => {
    });
  }

  openSite($event:MouseEvent) {
    $event.preventDefault();
    const shell = require('electron').shell;
    shell.openExternal("http://js.astonio.com");
  }
}