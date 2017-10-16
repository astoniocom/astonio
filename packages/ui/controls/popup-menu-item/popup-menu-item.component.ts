import {Component, ViewEncapsulation, Input, AfterViewInit, EventEmitter, Output, ChangeDetectionStrategy} from '@angular/core';
import {PopupDispatcher} from '../../services/popup-dispatcher';

export interface PopupMenuItemParams {
  text:string,
  openTimeout?: number,
}

@Component({
  selector: 'ast-popup-menu-item',
  templateUrl: './popup-menu-item.html',
//  styleUrls: ['./popup-menu-item.css'],
  encapsulation: ViewEncapsulation.None,
  providers: [PopupDispatcher],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PopupMenuItemComponent implements AfterViewInit, PopupMenuItemParams {
  @Input() text:string = '';
  @Input() openTimeout: number = 150;
  @Output('stateChanged') stateChanged = new EventEmitter<{item: any, state: boolean}>();
  @Input() disabled:boolean;

  active:boolean = false;
  private closeTimer: any;
  private openTimer: any;

  _positions = [
    {
      originX: 'end', overlayX: 'start',
      originY: 'top', overlayY: 'top',
    },
    {
      originX: 'start', overlayX: 'end',
      originY: 'top', overlayY: 'top',
    },
  ];

  constructor(private popupDispatcher:PopupDispatcher) {
  }

  
  ngAfterViewInit() {
  }

  get hasPopup() {
    return !!this.popupDispatcher.nchildren; // Какой лучший способ узнать есть ли что-то внутри ng-content? В идеале popupMenu тут вообще не должно быть.
    //return !!this.contentWrapper.nativeElement.children.length;
  }

  open() {
    if (this.active)
      return;
    this.active = true;
    this.popupDispatcher.open();
    this.stateChanged.emit({item:this, state:true});
  }

  close() {
    if (!this.active)
      return

    this.active = false;
    if (this.hasPopup) {
      this.popupDispatcher.downCloseNotification();
    }

    this.stateChanged.emit({item:this, state:false});
  }


  itemEnter() {
    clearTimeout(this.closeTimer);
    this.openTimer = setTimeout(() => {
      this.open();
    }, this.openTimeout);
  }

  itemLeaved() {
    clearTimeout(this.openTimer);
    if (!this.hasPopup) {
      this.close();
    }
    else {
      this.closeTimer = setTimeout(() => {
        this.close();
      }, this.openTimeout)
    }
  }

  popupEntered() {
    clearTimeout(this.closeTimer);
  }

  itemClicked() {
    this.open(); // Без таймера

    if (!this.hasPopup) {
      this.popupDispatcher.pick(true);
      //this.popupDispatcher.close();
    }
  }
}