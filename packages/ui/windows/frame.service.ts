import {Injectable} from '@angular/core';
import {Subject} from 'rxjs';

export interface SizeChangedEvent {
  width: number,
  height: number
}

@Injectable()
export class FrameService {
  changed = new Subject<SizeChangedEvent>();

  notifySizeChanged(width:number, height:number) {
    this.changed.next({width:width, height:height})
  }
  
}

@Injectable()
export class BrowserFrameService extends FrameService {
  constructor() {
    super();

    window.addEventListener('resize', (event) => {
      this.notifySizeChanged(window.innerWidth, window.innerHeight);
    });
  }

  notifySizeChanged(width:number, height:number) {
    this.changed.next({width:width, height:height})
  }

  
  
}